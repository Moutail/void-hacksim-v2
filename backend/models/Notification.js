// models/Notification.js - Version corrigée
const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: [
      'new_message', 
      'mention', 
      'new_challenge', 
      'challenge_completed',
      'announcement',
      'welcome',
      'rank_up',
      'system',
      'moderation'  // Ajout du type moderation
    ]
  },
  title: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  relatedTo: {
    model: {
      type: String,
      enum: ['Message', 'Challenge', 'User', 'Channel', null],  // Ajout de 'Channel'
      default: null
    },
    id: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'relatedTo.model',
      default: null
    }
  },
  isRead: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    default: function() {
      // Expiration par défaut après 30 jours
      const date = new Date();
      date.setDate(date.getDate() + 30);
      return date;
    }
  }
});

// Index pour permettre l'expiration automatique des notifications
NotificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Notification', NotificationSchema);