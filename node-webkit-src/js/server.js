;(function() {
  'use strict';

/*
 * Import required packages.
 * Packages should be installed with "npm install".
 */
//var express = require('express');
//var crypto = require('crypto');
//var http = require('http');
//var path = require('path');
var AWS = require('aws-sdk');
//AWS.config.loadFromPath('./config.json');
AWS.config.update({ "accessKeyId": "AKIAIOWEHCQP2DKUDLSQ", "secretAccessKey": "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", "region": "us-west-2" });
/*
 * Set-up the Express app.
 */
/*
var app = express();
app.set('views', __dirname + '/views');
app.engine('html', require('ejs').renderFile);
app.set('port', process.env.PORT || 3000);
app.use(express.static(path.join(__dirname, 'public')));
// app.use(express.urlencoded())
// app.use(express.json())
app.use(express.methodOverride());
*/

// ## CORS middleware
/*
var allowCrossDomain = function(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // intercept OPTIONS method
  if ('OPTIONS' == req.method) {
    res.send(200);
  }
  else {
    next();
  }
};
app.use(allowCrossDomain);
app.use(express.bodyParser({limit: '200mb'}));
//app.use(express.urlencoded({limit: '200mb'}));
*/

var saveImg = function(imgBase64, contentType, filename, next){


  buf = new Buffer(imgBase64.replace(/^data:image\/\w+;base64,/, ""),'base64');
  var s3 = new AWS.S3(); 
  var params = {
    Bucket: 'storyboard.setpixel.com', 
    ACL: 'public-read',
    ContentLength: buf.length,
    ContentType: contentType,
    Key: filename, 
    Body: buf
  };

  s3.putObject(params, function(err, data) {
      if (err) {
        next(err);
        console.log(err)     
      }       
          
      else{
        next();
        console.log("Successfully uploaded data to myBucket/myKey");     
      }   
   });

}

var saveScript = function(filename, content, next){
  var s3 = new AWS.S3(); 
  var params = {
    Bucket: 'storyboard.setpixel.com', 
    ACL: 'public-read',
    ContentType: 'text/plain',
    Key: filename, 
    Body: content
  };

  s3.putObject(params, function(err, data) {
      if (err) {
        next(err);
        console.log(err)     
      }       
          
      else{
        next();
        console.log("Successfully uploaded data to myBucket/myKey");     
      }   
   });

}


/*
 * Respond to GET requests to /sign_s3.
 * Upon request, return JSON containing the temporarily-signed S3 request and the
 * anticipated URL of the image.
 */
 /*
var signS3 = function(s3ObjectName, s3ObjectType){
    var object_name = s3ObjectName;
    var mime_type = s3ObjectType;

    var now = new Date();
    var expires = Math.ceil((now.getTime() + 10000)/1000); // 10 seconds from now
    var amz_headers = "x-amz-acl:public-read";  

    var put_request = "PUT\n\n"+mime_type+"\n"+expires+"\n"+amz_headers+"\n/"+S3_BUCKET+"/"+object_name;

    var signature = crypto.createHmac('sha1', AWS_SECRET_KEY).update(put_request).digest('base64');
    signature = encodeURIComponent(signature.trim());
    signature = signature.replace('%2B','+');

    var url = 'http://'+S3_BUCKET+'.s3.amazonaws.com/'+object_name;

    var credentials = {
        signed_request: url+"?AWSAccessKeyId="+AWS_ACCESS_KEY+"&Expires="+expires+"&Signature="+signature,
        url: url
    };
    return credentials;
}
*/

  window.server = {
    saveImg: saveImg,
    saveScript: saveScript//,
    //signS3: signS3
  };

}).call(this);