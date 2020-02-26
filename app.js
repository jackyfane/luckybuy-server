const createError = require('http-errors');
const express = require('express');
const path = require('path');
const fs = require('fs');
// const FileStreamRotator = require('file-stream-rotator');
const bodyParser = require('body-parser');
const multer = require('multer');
// const cookieParser = require('cookie-parser');
// const morgan = require('morgan');
const log4js = require('./commons/Log4jsConfig');

const indexRouter = require('./routes/index');

const app = express();

//创建日志文件夹
// const logPath = path.join(__dirname + '/logs');
// fs.existsSync(logPath) || fs.mkdirSync(logPath);
// const accessLogStream = FileStreamRotator.getStream({
//   date_format: 'YYYYMMDD',
//   filename: path.join(logPath, 'spellhand-access-%DATE%.log'),
//   frequency: 'daily',
//   verbose: false
// });
// app.use(morgan('combined', {stream: accessLogStream}));
// app.use(morgan('dev'));

app.use(log4js.connectLogger(log4js.getLogger(`access`), { level: log4js.levels.INFO }));

const upload = multer({
  dest: path.join(__dirname, 'public', 'upload')
}); // for parsing multipart/form-data
app.use(bodyParser.json());
app.use(bodyParser.text({ type: 'text/*' })); // for parsing text/*
app.use(bodyParser.urlencoded({ extended: false }));
// app.use(cookieParser());
app.use('/static', express.static(path.join(__dirname, 'public')));

// 上传文件，返回成功上传的文件的可访问的相对路径
app.post('/upload', upload.single('file'), (req, res, next) => {
  const { mimetype: tp, filename: fo, path: fop, destination: dest } = req.file
  let { sub } = req.body
  const [fn, dir] = sub == undefined ? [`${fo}.${tp.substr(tp.indexOf('/') + 1)}`, dest]
    : [`${sub}/${fo}.${tp.substr(tp.indexOf('/') + 1)}`, path.join(dest, sub)]
  if (!fs.existsSync(dir)) fs.mkdirSync(dir)
  fs.renameSync(fop, path.join(dest, fn))
  console.log(`file uploaded: ${JSON.stringify(`public/upload/${fn}`)}`)
  res.end(`static/upload/${fn}`)
})

app.use('/', indexRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
});

module.exports = app;