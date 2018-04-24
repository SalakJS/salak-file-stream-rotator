const Rotate = require('../')

const rotate = Rotate.getStream({
  filename: '/tmp/salaklog/a.log',
  date_format: 'YYYY-MM-DD.HH.mm.ss',
  max_logs: 20
})

rotate.on('rotate', (newLog, oldLog) => {
  console.log('rotate: ', newLog, oldLog)
}).on('open', (fd) => {
  console.log('open', fd)
}).on('error', (err) => {
  console.log(err)
}).on('close', () => {
  console.log('close')
}).on('finish', () => {
  console.log('finish')
})

let counter = 0
function log () {
  this.timer = setInterval(() => {
    counter++
    rotate.write('test\n')
    if (counter === 100) {
      rotate.end()
      clearInterval(this.timer)
    }
  }, 1000)
}

log()
