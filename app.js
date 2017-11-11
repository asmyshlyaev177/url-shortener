var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var urlParser = require('url');
var app = express();


app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

function isShortUrl(url) {
  if (url.length === 4 && !isNaN(parseInt(url))) {
    return true
  }
  return false
}

app.get('/:shortUrl', (req, res) => {
  if (isShortUrl(req.params.shortUrl)) {
    console.log('it is short url!');
  } else {
    console.log(`url: ${req.params.shortUrl}`)
  }
  res.json(req.params.shortUrl)
})

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.end('error');
});

module.exports = app;
