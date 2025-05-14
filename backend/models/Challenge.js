// models/Challenge.js
const mongoose = require('mongoose');

const ChallengeSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Titre requis'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Description requise']
  },
  level: {
    type: String,
    enum: ['débutant', 'intermédiaire', 'avancé'],
    default: 'débutant'
  },
  type: {
    type: String,
    enum: ['terminal', 'crypto', 'code', 'network'],
    default: 'terminal'
  },
  instructions: {
    type: String,
    required: [true, 'Instructions requises']
  },
  objectives: [{
    description: String,
    completed: Boolean,
    validationFunction: String // Code JavaScript sous forme de string qui sera évalué
  }],
  initialFiles: {
    type: Object,
    default: {}
  },
  initialFileContents: {
    type: Object,
    default: {}
  },
  points: {
    type: Number,
    default: 100
  },
  hints: [{
    text: String,
    costPoints: Number
  }],
  active: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
});

module.exports = mongoose.model('Challenge', ChallengeSchema);