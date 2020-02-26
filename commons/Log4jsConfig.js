const log4js = require('log4js');
const path = require("path")
log4js.configure({
  appenders: {
    access: {
      type: 'dateFile',
      filename: path.join(__dirname, '../logs/access'),
      pattern: '-yyyy-MM-dd.log',
      alwaysIncludePattern: true,
      category: 'access'
    },
    error: {
      type: 'dateFile',
      filename: path.join(__dirname, '../logs/error'),
      pattern: '-yyyy-MM-dd.log',
      alwaysIncludePattern: true,
      category: 'error'
    },
    console: {
      type: 'console'
    }
  },
  categories: {
    access: {
      appenders: ['access'],
      level: 'INFO'
    },
    error: {
      appenders: ['error'],
      level: 'ERROR'
    },
    default: {
      appenders: ['console'],
      level: 'ALL'
    }
  }
});

module.exports = log4js;