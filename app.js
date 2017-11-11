var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var urlParser = require('url');
var app = express();
var mongo = require('mongodb').MongoClient;
var dbAddress = 'mongodb://localhost:27017/urlshortener';
var mongodb;

mongo.connect(dbAddress, (err, db) => {
  if (err) console.log(err);
  mongodb = db;
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

function isShortUrl(url) {
  if (url.length === 4 && !isNaN(parseInt(url))) {
    return true
  }
  return false
}

async function generateLink() {
  var link;
  var linkExist;
  do {
    link = Math.floor(Math.random()*8999+1000);
    linkExist = await mongodb.collection('url').find({"link": String(link)}).toArray();
  } while ( linkExist.length > 0 );
  return link
};

function insertLink(url, link) {
  var doc = mongodb.collection('url') 
    .insertOne({
      url: url,
      link: String(link)
    })
  doc.then((res) => { return res });
};

function getLink(url) {
  var link = mongodb.collection('url')
    .find({"link": url}).toArray()
  return link
};


app.get('/:shortUrl*', (req, res) => {
  var url = req.params.shortUrl;
  if (isShortUrl(url)) {
    console.log('it is short url!');
    getLink(url).then((link) => {
      console.log(link[0].url);
      // res.redirect(302, 'http://' + link[0].url);
    });
  } else {
    console.log('not a short url');
    generateLink()
      .then((link) => {
        return {status: insertLink(url, link), link: link}
      })
      .then((result) => {
        var shortLink = req.protocol + '://' + req.get('host') + '/' + result.link;
        res.json({original_url: url, short_url: shortLink})
      });
  }
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
  res.end(err.message);
});

module.exports = app;
