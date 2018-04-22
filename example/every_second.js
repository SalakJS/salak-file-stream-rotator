const Rotate = require('../')

const rotate = Rotate.getStream({
  filename: '/tmp/salaklog/a.log',
  date_format: 'YYYY-MM-DD.HH.mm.ss',
  max_logs: 20
})

rotate.stream.on('rotate', (newLog, oldLog) => {
  console.log('rotate: ', newLog, oldLog)
})

let counter = 0
function log () {
  this.timer = setInterval(() => {
    counter++
    rotate.write('test\n')
    if (counter === 100) {
      clearInterval(this.timer)
    }
  }, 1000)
}

log()
