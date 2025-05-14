// models/Attempt.js
const mongoose = require('mongoose');

const AttemptSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  challenge: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Challenge',
    required: true
  },
  commandHistory: [{
    command: String,
    timestamp: Date
  }],
  objectivesCompleted: [{
    objectiveId: String,
    completedAt: Date
  }],
  hintsUsed: [{
    hintId: String,
    usedAt: Date
  }],
  completed: {
    type: Boolean,
    default: false
  },
  startedAt: {
    type: Date,
    default: Date.now
  },
  completedAt: Date,
  score: Number
});

module.exports = mongoose.model('Attempt', AttemptSchema);