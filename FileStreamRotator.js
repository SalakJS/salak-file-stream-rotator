const fse = require('fs-extra')
const moment = require('moment')
const debug = require('debug')('salak[FileStreamRotator]')
const EventEmitter = require('events')
const path = require('path')
const crypto = require('crypto')
const DEFAULTS = {
  DATE_FORMAT: 'YYYY-MM-DD'
}

class FileStreamRotator extends EventEmitter {
  /**
   * Options
   *  - filename
   *  - date_format
   *  - size
   *  - max_logs
   *  - audit_file
   */
  constructor (options = {}) {
    super()

    const { filename, date_format: dateFormat = DEFAULTS.DATE_FORMAT, size, max_logs: maxLogs, audit_file: auditFile } = options
    this.filename = filename
    this.fileSize = null
    this.fileCount = 0
    this.curSize = 0
    this.dateFormat = dateFormat
    this.rotateStream = null

    this.curDate = this._getDate()
    this.size = this._parseFileSize(size)
    this.auditLog = this._setAuditLog(maxLogs, auditFile, filename)
    this._init()
  }

  _parseFileSize (size) {
    if (size && typeof size === 'string') {
      const sizeInfo = size.toLowerCase().match(/^((?:0\.)?\d+)([k|m|g])$/)
      if (sizeInfo) {
        switch (sizeInfo[2]) {
          case 'k':
            return sizeInfo[1] * 1024
          case 'm':
            return sizeInfo[1] * 1024 * 1024
          case 'g':
            return sizeInfo[1] * 1024 * 1024 * 1024
        }
      }
    }

    return null
  }

  _setAuditLog (maxLogs, auditFile, filename) {
    if (maxLogs) {
      const useDays = maxLogs.toString().substr(-1)
      const nums = maxLogs.toString().match(/^(\d+)/)

      if (nums && nums[1] > 0) {
        const baseLog = path.dirname(filename)
        let rtn = null

        try {
          if (auditFile) {
            rtn = require(path.resolve(auditFile))
          } else {
            rtn = require(path.resolve(baseLog))
          }
        } catch (err) {
          if (err.code !== 'MODULE_NOT_FOUND') {
            return null
          }

          rtn = {
            keep: {
              days: false,
              amount: +nums[1]
            },
            auditLog: auditFile || baseLog + '/.audit.json',
            files: []
          }
        }

        rtn.keep = {
          days: useDays === 'd',
          amount: +nums[1]
        }

        return rtn
      }
    }

    return null
  }

  _addLogToAudit (logfile) {
    let audit = this.auditLog
    if (audit && audit.files) {
      const time = Date.now()
      audit.files.push({
        date: time,
        name: logfile,
        hash: crypto.createHash('md5').update(logfile + 'LOG_FILE' + time).digest('hex')
      })

      if (audit.keep.days) {
        const oldestDate = moment().subtract(audit.keep.amount, 'days').valueOf()
        const recentFiles = audit.files.filter((file) => {
          if (file.date > oldestDate) {
            return true
          }

          this._removeFile(file)
          return false
        })

        audit.files = recentFiles
      } else {
        const filesToKeep = audit.files.splice(-audit.keep.amount)

        if (audit.files.length > 0) {
          audit.files.filter((file) => {
            this._removeFile(file)
            return false
          })
        }

        audit.files = filesToKeep
      }

      this._writeAuditLog()
    }
  }

  _writeAuditLog () {
    const { auditLog } = this.auditLog
    try {
      fse.writeJsonSync(auditLog, this.auditLog)
    } catch (err) {
      console.error(new Date(), '[FileStreamRotator] Failed to store log audit: ', this.auditLog, ' Error: ', err)
    }
  }

  _removeFile (file) {
    if (file.hash === crypto.createHash('md5').update(file.name + 'LOG_FILE' + file.date).digest('hex')) {
      try {
        fse.unlinkSync(file.name)
      } catch (err) {
        console.error(new Date(), 'FileStreamRotator] Could Not remove old log file: ', file.name)
      }
    }
  }

  _init () {
    this.on('new', (newLog) => {
      this._addLogToAudit(newLog)
    })

    if (fse.existsSync(this.filename)) {
      try {
        const fileState = fse.statSync(this.filename)
        const oldDate = this._getDate(fileState.birthtime)

        if (oldDate !== this.curDate) {
          let tempLog = this.filename + '.' + oldDate

          if (this.size) {
            let fileCount = 0
            while (fse.existsSync(tempLog)) {
              fileCount++
              tempLog = tempLog + '.' + fileCount
            }
          }

          this._moveLogFile(tempLog)
        } else {
          if (this.size) {
            let tempLog = this.filename + '.' + this.curDate

            while (fse.existsSync(tempLog)) {
              this.fileCount++
              tempLog = tempLog + '.' + this.fileCount
            }

            if (fileState.size > this.size) {
              this._moveLogFile(tempLog)
            } else {
              this.curSize = fileState.size
            }
          }
        }
      } catch (err) {
        console.error(new Date(), '[FileStreamRotator] Failed to move the existed file: ', this.filename, ' Error: ', err)
      }
    }

    fse.ensureDirSync(path.dirname(this.filename))
    this.rotateStream = fse.createWriteStream(this.filename, { flags: 'a' })
    this._bindStreamProxy(this.rotateStream)
    debug(`Create file stream: ${this.filename}`)
  }

  _moveLogFile (tempLog) {
    try {
      debug(`Move file ${this.filename} to ${tempLog}`)
      fse.renameSync(this.filename, tempLog)
      this.emit('new', tempLog)
      this.emit('rotate', this.filename, tempLog)
    } catch (err) {
      console.error(new Date(), '[FileStreamRotator] Failed to move file: ', this.filename, ' to: ', tempLog, ' Error: ', err)
    }
  }

  _getDate (timestamp) {
    return moment(timestamp).format(this.dateFormat)
  }

  _bindStreamProxy (fileStream) {
    fileStream.on('close', () => {
      this.emit('close')
    })

    fileStream.on('finish', () => {
      this.emit('finish')
    })

    fileStream.on('error', (err) => {
      this.emit('error', err)
    })

    fileStream.on('open', (fd) => {
      this.emit('open', fd)
    })
  }

  end (...args) {
    if (this.rotateStream) {
      this.rotateStream.end.apply(this.rotateStream, args)
    }
  }

  write (str, encoding) {
    const newDate = this._getDate()
    if (newDate !== this.curDate || (this.size && this.curSize > this.size)) {
      let newLog = this.filename + '.' + this.curDate
      if (this.size && this.curSize > this.size) {
        if (this.fileCount !== 0) {
          newLog += '.' + this.fileCount
        }

        this.fileCount++
        if (newDate !== this.curDate) {
          this.fileCount = 0
        }
      } else {
        this.fileCount = 0
      }

      this.curDate = newDate
      this.rotateStream.destroy()
      this._moveLogFile(newLog)
      this.rotateStream = fse.createWriteStream(this.filename, { flags: 'a' })
      this._bindStreamProxy(this.rotateStream)
    }

    this.rotateStream.write(str, encoding)
    this.curSize += str.length
  }
}

module.exports = FileStreamRotator
