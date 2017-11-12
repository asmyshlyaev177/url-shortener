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

function isInvalidUrl(url) {
  var result = urlParser.parse(url);
  if (result.hostname) {
    return false 
  }
  return true
};

function siteUrl(req, res) {
  return req.protocol + '://' + req.get('host') + '/'
}

app.get('/', function (req, res) {
  var links = mongodb.collection('url').find({}).toArray();
  links.then((links) => {
    links.forEach((link) => {
      link.link = siteUrl(req, res) + link.link
    });
    return res.render('index', { list: links, siteUrl: siteUrl(req, res)});
  })
});


app.get('/:rpath*', (req, res) => {
  if (req.url === '/favicon.ico') {
    return res.end();
  }
  var url = req.params.rpath.replace(/^\//, '');
  if (isShortUrl(url)) {
    getLink(url).then((link) => {
      if (!link.length) {
        res.redirect(302, '/');
        return next();
      }
      return res.redirect(302, link[0].url);
    });
  } else {
    var newUrl = req.url.replace(/^\//, '');
    if (isInvalidUrl(newUrl)) {
      var err = `"${newUrl}" it is not a valid URL`;
      return res.end(err);
    } 
    generateLink()
      .then((link) => {
        return {status: insertLink(newUrl, link), link: link}
      })
      .then((result) => {
        var shortLink = siteUrl(req, res) + result.link;
        return res.json({original_url: newUrl, short_url: shortLink});
      });
  }
})

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
