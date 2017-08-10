"use strict";

var mongoose = require('mongoose');
var findOrCreate = require('mongoose-findorcreate');

var userSchema = mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  imageUrl: {
    type: String,
  },
  projects: {
    type: Object,
  },
  socailMediaHandles: {
    type: Object,
  },
  contributions: {
    type: Object,
  },
  viewed: {
    type: Object,
  }
});

var projectSchema = mongoose.Schema({
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true,
    unique: true
  },
  description: {
    type: String,
  },
  imageUrl: {
    type: String,
  },
  contributors: {
    type: Object,
  },
  startDate: {
    type: String,
  },
  endDate: {
    type: String,
  },
  category: {
    type: String,
  },
  location: {
    type: String,
  },
});

var eventSchema = mongoose.Schema({
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
  },
  change: {
    type: Object,
    required: true,
  }
});

var channelSchema = mongoose.Schema({
  category: {
    type: String,
    unqiue: true
  },
  imageUrl: {
    type: String,
  },
  followers: {
    type: Object,
  },
  projects: {
    type: Object,
  }
});

module.exports = {
  User: mongoose.model('User', userSchema),
  Project: mongoose.model('Project', projectSchema),
  Event: mongoose.model('Event', eventSchema),
  Channel: mongoose.model('Channel', channelSchema),
};
