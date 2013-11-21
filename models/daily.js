var mongoose = require('mongoose');
var _ = require('lodash');

var Daily = mongoose.Schema({
  score: {type: Number, default: 0},
  fruit: {type: Number, default: 0},
  vegetable: {type: Number, default: 0}, 
  leanProtein: {type: Number, default: 0},
  nutsAndSeeds: {type: Number, default: 0},
  wholeGrains: {type: Number, default: 0},
  dairy: {type: Number, default: 0},
  refinedGrains: {type: Number, default: 0},
  sweets: {type: Number, default: 0},
  friedFoods: {type: Number, default: 0},
  fattyProtein: {type: Number, default: 0},
  date: Date,
  dailyLog: [{}],
  createdAt : {type: Date, default: Date.now}
});

mongoose.model('Daily', Daily);