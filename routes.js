"use strict";

var bcrypt = require('bcrypt');
var express = require('express');
var models = require('./models');
var User = models.User;
var _ = require('underscore');
var multer = require('multer');
var multerS3 = require('multer-s3');
var aws = new require('aws-sdk');
var s3 = new aws.S3();

aws.config.update({
    secretAccessKey: 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
    accessKeyId: 'XXXXXXXXXXXXXXX',
    region: 'us-east-1'
});

// var upload = multer({
//     storage: multerS3({
//         s3: s3,
//         bucket: 'bucket-name',
//         key: function (req, file, cb) {
//             console.log(file);
//             cb(null, file.originalname); //use Date.now() for unique file keys
//         }
//     })
// });

var upload = multer();

module.exports = function (passport) {
  var router = express.Router();

  router.post('/:username/userImage/upload', upload.single('image'), function (req, res, next) {
    var uniqueKey = req.params.user + Date.now().toString();

    var params = {
      Body: req.file,
      Bucket: 'horizons-plug',
      Key: uniqueKey
    };

    s3.putObject(params, function(err, data) {
      if (err) {
        console.log(err, err.stack); // an error occurred
      }
      else {
        User.findOne({ 'username': req.params.user }, function (err, user) {
          if (err) {
            console.log("Error", err);
          }
          else {
            user.imageUrl = 'https://s3.us-east-2.amazonaws.com/horizons-plug/' + uniqueKey;
            user.save();
          }
        });
      }
    });
  });


  router.get('/fb/login', passport.authenticate('facebook'));

  router.get('/fb/login/callback', passport.authenticate('facebook', {
    successRedirect: '/login/success',
    failureRedirect: '/login/failure'
  }));

  router.get('/login/failure', function(req, res) {
    res.status(401).json({
      success: false,
      error: req.flash('error')[0]
    });
  });

  router.post('/login', passport.authenticate('local', {
    successRedirect: '/login/success',
    failureRedirect: '/login/failure',
    failureFlash: true
  }));

  router.post('/register', function(req, res, next) {
    var params = _.pick(req.body, ['username', 'password']);
    bcrypt.genSalt(10, function(err, salt) {
      bcrypt.hash(params.password, salt, function(err, hash) {
        // Store hash in your password DB.
        params.password = hash;
        models.User.create(params, function(err, user) {
          if (err) {
            res.status(400).json({
              success: false,
              error: err.message
            });
          } else {
            res.json({
              success: true,
              user: user
            });
          }
        });
      });
    });
  });

  // Beyond this point the user must be logged in
  router.use(function(req, res, next) {
    if (!req.isAuthenticated()) {
      res.status(401).json({
        success: false,
        error: 'not authenticated'
      });
    } else {
      next();
    }
  });
  router.get('/logout', function(req, res) {
    req.logout();
    res.json({
      success: true,
      message: 'logged out.'
    });
  });

  router.get('/login/success', function(req, res) {
    var user = _.pick(req.user, 'username', '_id');
    res.json({
      success: true,
      user: user
    });
  });

  return router;
};
