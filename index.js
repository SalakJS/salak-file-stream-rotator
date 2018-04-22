const FileStreamRotator = require('./FileStreamRotator')

const DailyRotateFile = {}

DailyRotateFile.getStream = (options) => {
  if (!options.filename) {
    return process.stdout
  }

  return new FileStreamRotator(options)
}

module.exports = DailyRotateFile
