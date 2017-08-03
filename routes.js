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

var envvar = require('envvar');
var moment = require('moment');
var plaid = require('plaid');
var APP_PORT = envvar.number('APP_PORT', 8000);
var PLAID_CLIENT_ID = envvar.string('PLAID_CLIENT_ID');
var PLAID_SECRET = envvar.string('PLAID_SECRET');
var PLAID_PUBLIC_KEY = envvar.string('PLAID_PUBLIC_KEY');
var PLAID_ENV = envvar.string('PLAID_ENV', 'sandbox');
var ACCESS_TOKEN = null;
var PUBLIC_TOKEN = null;
var ITEM_ID = null;
var client = new plaid.Client(
  PLAID_CLIENT_ID,
  PLAID_SECRET,
  PLAID_PUBLIC_KEY,
  plaid.environments[PLAID_ENV]
);


module.exports = function (passport) {
  var router = express.Router();

  /* Authentication routes */
  router.get('/user', function(req, res) {
    res.json({
      PLAID_PUBLIC_KEY: PLAID_PUBLIC_KEY,
      PLAID_ENV: PLAID_ENV
    });
  });

  router.post('/get_access_token', function(req, res) {
    PUBLIC_TOKEN = req.body.public_token;
    client.exchangePublicToken(PUBLIC_TOKEN, function(error, tokenResponse) {
      if (error !== null) {
        var msg = 'Could not exchange public_token!';
        console.log(msg + '\n' + error);
        return res.json({
          error: msg
        });
      }
      ACCESS_TOKEN = tokenResponse.access_token;
      ITEM_ID = tokenResponse.item_id;
      console.log('Access Token: ' + ACCESS_TOKEN);
      console.log('Item ID: ' + ITEM_ID);
      return res.json({
        'error': false
      });
    });
  });

  router.get('/accounts', function(req, res) {
    // Retrieve high-level account information and account and routing numbers
    // for each account associated with the Item.
    client.getAuth(ACCESS_TOKEN, function(error, authResponse) {
      if (error !== null) {
        var msg = 'Unable to pull accounts from the Plaid API.';
        console.log(msg + '\n' + error);
        return res.json({
          error: msg
        });
      }

      console.log(authResponse.accounts);
      return res.json({
        error: false,
        accounts: authResponse.accounts,
        numbers: authResponse.numbers,
      });
    });
  });

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
