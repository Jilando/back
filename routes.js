"use strict";

var bcrypt = require('bcrypt');
var express = require('express');
var models = require('./models');
var User = models.User;
var Project = models.Project;
var Event = models.Event;
var Channel = models.Channel;
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

  router.get('/events', function(req, res) {
    Event.find({}, function(err, events) {
      if (err) {
        console.log("Error", err);
      }
      else {
        res.send(events);
      }
    });
  });

  router.get('/overview', function(req, res) {
    User.find({ 'username': req.user.username}, function(err, user) {
      if (err) {
        console.log("Error", err);
      }
      else {
          const visited = user.visited;
          const categories = [];
          const obj = {};
          const percentage = {};
          for(let i = 0 ; i < visited.length; i++) {
            const key = visited[i].category;
            obj[key] = 0;
            percentage[key] = 0;
          }
          for(let i = 0 ; i < visited.length; i++) {
            const key = visited[i].category;
            obj[key]++;
          }
          for(let i = 0 ; i < visited.length; i++) {
            const key = visited[i].category;
            percentage[key] = obj[key]/visited.length;
          }
          res.json(percentage);
      }
    });
  });

  router.get('user/:username/profile', function(req, res) {
    User.find({ 'username': req.user.username}, function(err, user) {
      if (err) {
        console.log("Error", err);
      }
      else {
          res.send(user);
      }
    });
  });

  router.get('project/:name', function(req, res) {
    Project.findById(req.query.id, function(err, project) {
      if (err) {
        console.log("Error", err);
      }
      else {
        User.findOne({ 'username': req.user.username}, function(err, user) {
          if (err) {
            console.log("Error", err);
          }
          else {
            if(!user.visited) {
              user.visited = [];
            }
            user.visited.push(project);
            res.send(project);
          }
        });

      }
    })
  });

  router.post('project/:projectname/projectImage/upload', upload.single('image'), function (req, res, next) {
    var uniqueKey = req.params.projectname + Date.now().toString();

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
        Project.findOne({ 'name': req.params.projectname }, function (err, project) {
          if (err) {
            console.log("Error", err);
          }
          else {
            project.imageUrl = 'https://s3.us-east-2.amazonaws.com/horizons-plug/' + uniqueKey;
            project.save();
          }
        });
      }
    });
  });

  router.post('/project/:projectname/add_contributor', function(req, res) {
    var username = req.body.username;
    User.findOne({ 'username': username }, function (err, user) {
      if (err) {
        console.log("Error", err);
      }
      else {
        if(!user.contributions) {
          user.contributions = [];
        }
        Project.findOne({ 'name': req.params.projectname }, function (err, project) {
          if (err) {
            console.log("Error", err);
          }
          else {
            if(!project.contributors) {
              project.contributors = [];
            }
            project.contributors.push(user);
            user.contributions.push(project);
            user.save(function(err) {
              if(err) {
                console.log("Error", err);
              }
              else {
                project.save();
              }
            });
          }
        });
      }
    });
  })

  router.post('project/new', function(req, res) {
    var project = new Project({
      owner: req.body.user,
      name: req.body.name,
      description: req.body.description,
      startDate: req.body.startDate,
      endDate: req.body.endDate,
      category: req.body.category,
      location: req.body.location,
    });
    project.save(function(err, saved) {
      if(err) {
        console.log("Error", err);
      }
      else {
        Channel.findOne({ 'category': req.body.name }, function (err, channel) {
          if(err) {
            console.log("Error", err);
          }
          else {
            if(!channel.projects) {
              channel.projects = [];
            }
            channel.projects.push(saved);
          }
        })
      }
    });
  });

  router.get('/channel/list', function(req, res) {
    Channel.find({}, function(err, channels) {
      if(err) {
        console.log("Error", err);
      }
      else {
        User.findOne({ 'username': req.user.username}, function(err, user) {
          if (err) {
            console.log("Error", err);
          }
          else {
            const obj = {
              following: [],
              popular: [],
              explore: [],
            };
            for(let i = 0; i < channels.length; i++) {
              const followers = channels[i].followers;
              for(let j = 0; j < followers.length; j++) {
                if(followers[i].username === req.user.usermame) {
                  obj.following.push(channels[i]);
                }
                else if(j === followers.length - 1){
                  obj.explore.push(channels[i]);
                }
              }
            }
            obj.popular = channels;
            obj.popular.sort(function(a, b) {
              return b.followers.length - a.followers.length;
            });
            res.json(obj);
          }
        })

      }
    });
  });

  router.get('/channel/:channel_category', function(req, res) {
    Channel.findOne({ 'category': req.params.channel_category }, function(err, channel) {
      if(err) {
        console.log("Error", err);
      }
      else {
        res.send(channel);
      }
    });
  });

  router.post('user/:username/socailMediaHandles/instagram', function(req, res) {
    User.findOne({ 'username': req.params.username }, function (err, user) {
      if (err) {
        console.log("Error", err);
      }
      else {
        user.socailMediaHandles.instagram = req.body.instagram;
        user.save();
      }
    });
  });

  router.post('user/:username/socailMediaHandles/youtube', function(req, res) {
    User.findOne({ 'username': req.params.username }, function (err, user) {
      if (err) {
        console.log("Error", err);
      }
      else {
        user.socailMediaHandles.youtube = req.body.youtube;
        user.save();
      }
    });
  });

  router.post('user/:username/socailMediaHandles/twitter', function(req, res) {
    User.findOne({ 'username': req.params.username }, function (err, user) {
      if (err) {
        console.log("Error", err);
      }
      else {
        user.socailMediaHandles.twitter = req.body.twitter;
        user.save();
      }
    });
  });

  router.post('user/:username/userImage/upload', upload.single('image'), function (req, res, next) {
    var uniqueKey = req.params.username + Date.now().toString();

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
        User.findOne({ 'username': req.params.username }, function (err, user) {
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
