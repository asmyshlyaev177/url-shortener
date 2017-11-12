var express = require('express');
var path = require('path');
var bodyParser = require('body-parser');
var urlParser = require('url');
var app = express();
var mongo = require('mongodb').MongoClient;
var dbAddress = 'mongodb://urlshortener:shortGoogleFCC@ds251985.mlab.com:51985/urlshortener';
var mongodb;

mongo.connect(dbAddress, (err, db) => {
  if (err) console.log(err);
  mongodb = db;
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.set('view engine', 'pug');
app.set('views', './');

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
  return doc 
};

function getLink(url) {
  var link = mongodb.collection('url')
    .find({"link": url}).toArray()
  return link
};

function validateUrl(url) {
  var result = urlParser.parse(url);
  if (result.hostname) {
    return true
  }
  return false
};

app.get('/', function (req, res) {
  var links = mongodb.collection('url').find({}).toArray();
  var siteUrl = req.protocol + '://' + req.get('host') + '/';
  links.then((links) => {
    links.forEach((link) => {
      link.link = siteUrl + link.link
    });
    res.render('index', { list: links, siteUrl: siteUrl});
  })
});

app.get('/:rpath*', (req, res, next) => {
  if (req.params.rpath === 'favicon.ico') {
    res.end();
    next();
  }
  var url = req.params.rpath;
  if (isShortUrl(url)) {
    getLink(url).then((link) => {
      if (!link.length) {
        res.redirect(302, '/');
      }
      res.redirect(302, link[0].url);
    });
  } else {
    var siteUrl = req.protocol + '://' + req.get('host') + '/';
    var newUrl = req.url.replace(/^\//, '');
    if (!validateUrl(newUrl)) {
      res.end(`${newUrl} it is not a valid URL`);
      next();
    }
    generateLink()
      .then((link) => {
        return {status: insertLink(newUrl, link), link: link}
      })
      .then((result) => {
        var shortLink = siteUrl + result.link;
        res.json({original_url: newUrl, short_url: shortLink})
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
