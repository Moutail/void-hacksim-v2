// models/Message.js - Ajout du support pour les réponses
const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000
  },
  channel: {
    type: String,
    required: true,
    enum: ['general', 'help', 'challenges', 'announcements'],
    default: 'general'
  },
  mentions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    default: null
  },
  attachments: [{
    type: String
  }],
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  reports: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reason: String,
    date: {
      type: Date,
      default: Date.now
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  isEdited: {
    type: Boolean,
    default: false
  },
  isAnnouncement: {
    type: Boolean,
    default: false
  }
});

// Middleware pour mettre à jour le champ updatedAt
MessageSchema.pre('save', function(next) {
  if (this.isModified('content')) {
    this.isEdited = true;
    this.updatedAt = Date.now();
  }
  next();
});

// Méthode pour extraire les mentions (@username) du contenu
MessageSchema.methods.extractMentions = async function() {
  const User = mongoose.model('User');
  const mentionPattern = /@(\w+)/g;
  const mentions = [];
  let match;
  
  while ((match = mentionPattern.exec(this.content)) !== null) {
    const username = match[1];
    const user = await User.findOne({ username });
    if (user) {
      mentions.push(user._id);
    }
  }
  
  this.mentions = mentions;
};

// Ajout d'un index pour les recherches efficaces
MessageSchema.index({ channel: 1, createdAt: -1 });
MessageSchema.index({ author: 1 });
MessageSchema.index({ replyTo: 1 });
MessageSchema.index({ mentions: 1 });

module.exports = mongoose.model('Message', MessageSchema);
