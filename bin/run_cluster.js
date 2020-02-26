
const cluster = require('cluster')
const numCPUs = require('os').cpus().length

const app = require('../app')
const http = require('http')
const https = require('https')
const fs = require('fs')
const path = require('path')
const { commonMySQL, uuidMySQL } = require('../commons/mysql')
const AutoLauncher = require('../commons/AutoLauncher')
const log4js = require('../commons/Log4jsConfig')
const logger = log4js.getLogger('bin.www')

const start_server = () => {
  http.createServer(app).listen(3000)
  // https.createServer({
  //   key: fs.readFileSync(path.join(__dirname, 'cert/1538876242358.key')),
  //   cert: fs.readFileSync(path.join(__dirname, 'cert/1538876242358.pem')),
  // }, app).listen(10443)
}

const check = (sf = () => { }) => {
  uuidMySQL.authenticate().then(() => {
    logger.info("UUID数据库配置正常...")
    return commonMySQL.authenticate().then(() => {
      logger.info("读写数据库配置正常...")
      sf()
    }).catch(error => { throw error })
  }).catch(error => { throw error })
}

if (cluster.isMaster) {
  console.log(`主进程 ${process.pid} 正在运行`)
  check(() => {
    AutoLauncher.launch()
    // 衍生工作进程。
    for (let i = 0; i < numCPUs; i++) {
      cluster.fork()
    }
  })

  cluster.on('exit', (worker, code, signal) => {
    console.log(`工作进程 ${worker.process.pid} 已退出`)
  })
} else {
  start_server()
  console.log(`工作进程 ${process.pid}(${process.ppid}) 已启动`)
}
