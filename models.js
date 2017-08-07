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
  imageUrl: String
});

var projectSchema = mongoose.Schema({

})

module.exports = {
  User: mongoose.model('User', userSchema)
};
