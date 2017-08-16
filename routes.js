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

    var arr = [{category: 'SPORTS', followers: [], projects: [], imageUrl: 11},
               {category: 'MOVIES', followers: [], projects: [], imageUrl: 5},
               {category: 'FASHION', followers: [], projects: [], imageUrl: 9},
               {category: 'SCIENCE', followers: [], projects: [], imageUrl: 2},
               {category: 'AUTO', followers: [], projects: [], imageUrl: 8},
               {category: 'TECHNOLOGY', followers: [], projects: [], imageUrl: 7},
               {category: 'FINANCES', followers: [], projects: [], imageUrl: 6},
               {category: 'ART', followers: [], projects: [], imageUrl: 12},
               {category: 'ANIMATION', followers: [], projects: [], imageUrl: 10},
               {category: 'EDUCATION', followers: [], projects: [], imageUrl: 13},
               {category: 'ENVIRONMENT', followers: [], projects: [], imageUrl: 3},
               {category: 'WORLD', followers: [], projects: [], imageUrl: 4}
              ];

    Channel.find({}, function(err, channels1) {
      console.log(channels1);
      if(channels1.length === 12) {
        res.json({
          success: true,
          user: user
        });
      }
      else {
        Channel.insertMany(arr, function(err, channels2) {
          if(err) {
            res.json({
              success: true,
              user: user
            });
            console.log("Error", err);
          }
          else {
            res.json({
              success: true,
              user: user
            });
          }
        });
      }
    });

    // res.json({
    //   success: true,
    //   user: user
    // });
  });

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
    Project.findBy({'username': req.query.name}, function(err, project) {
      if (err) {
        console.log("Error", err);
      }
      else {
        User.findOne({ 'username': req.user.username}, function(err, user) {
          if (err) {
            console.log("Error", err);
          }
          else {
            user.visited.push(project);
            res.json({
              project: project
            });
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
  });

  router.get('/projects', function(req, res) {
    console.log("Projects route", req.user);
    User.findOne({ 'username': req.user.username}, function(err, user) {
      if(err) {
        console.log("Error", err);
      }
      else {
        if(user) {
          console.log("In projects route", user.projects);
          res.json({
            projects: user.projects || []
          })
        }
      }
    });
  });

  router.post('/project/new', function(req, res) {
    console.log('hit');
    var globalProjectSaved = {};
    var globalChannelSaved = {};
    var project = new Project({
      owner: req.user,
      name: req.body.name || 'Name',
      description: req.body.description || 'Description',
      startDate: req.body.startDate || 'startDate',
      endDate: req.body.endDate || 'endDate',
      category: req.body.category || 'ART',
      location: req.body.location || 'location',
    })
    project.save()
    .then(projectSaved => {
      console.log("Project saved");
      globalProjectSaved = projectSaved;
      return Channel.findOne({ 'category': projectSaved.category })
    })
    .then(channel => {
      if(!channel){
        const newChannel = new Channel({
          category: 'ART'
        });
        console.log("Shouldn't hit");
        return newChannel.save()
      } else {
        console.log("Should hit");
        globalProjectSaved.channel = channel;
        globalChannelSaved = channel;
        console.log("Should hit", globalProjectSaved);
        // return channel
        return globalProjectSaved.save();
      }
    })
    .then(projectSaved2 => {
      return globalChannelSaved
    })
    .then(channel => {
      if(!channel.projects) {
        channel.projects = [];
      }
      channel.projects.push(globalProjectSaved);
      return channel.save()
    })
    .then(channelSaved => {
      console.log("Channel saved");
      const user = req.user
      // if(!user.projects) {
      //   user.projects = [];
      // }
      user.projects.push(globalProjectSaved);
      return user.save()
    })
    .then(userSaved => {
      console.log("User saved");
      res.json({
        success: true
      });
    })
    .catch((err) => {
      console.log("Error", err);
    })
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

  return router;
};
