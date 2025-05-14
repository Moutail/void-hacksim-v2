// models/Message.js - Modèle pour les messages du forum
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
  attachments: [{
    type: String  // URLs vers des fichiers attachés
  }],
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
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

module.exports = mongoose.model('Message', MessageSchema);