// models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Nom d\'utilisateur requis'],
    unique: true,
    trim: true,
    minlength: [3, 'Le nom d\'utilisateur doit contenir au moins 3 caractères'],
    maxlength: [20, 'Le nom d\'utilisateur ne peut pas dépasser 20 caractères']
  },
  email: {
    type: String,
    required: [true, 'Email requis'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Veuillez fournir un email valide']
  },
  password: {
    type: String,
    required: [true, 'Mot de passe requis'],
    minlength: [6, 'Le mot de passe doit contenir au moins 6 caractères'],
    select: false
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  score: {
    type: Number,
    default: 0
  },
  completedChallenges: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Challenge'
  }],
  commandHistory: {
    type: [String],
    default: []
  },
  filesSystem: {
    type: Object,
    default: {
      '/': ['readme.txt', 'missions', '.void_config'],
      '/missions': ['intro'],
      '/missions/intro': ['secrets'],
      '/missions/intro/secrets': ['mission.txt'],
      '/.void_config': ['.env', '.history', '.secrets']
    }
  },
  fileContents: {
    type: Object,
    default: {
      '/readme.txt': 'Bienvenue sur VOID HackSimulator!\nUtilisez les commandes standard pour naviguer et explorer.\n\nCommencez par la commande "help" pour voir les options disponibles.',
      '/missions/intro/secrets/mission.txt': 'CONFIDENTIEL: VOID-0001\n\nInfiltration du système réussie. Votre mission est de documenter cette vulnérabilité en créant un rapport détaillé.\n\nRapport à déposer dans un nouveau dossier nommé "rapport" à la racine, sous le nom "rapport.txt".\n\nFin de transmission.',
      '/.void_config/.env': 'USER=hacker\nHOME=/home/user\nTERM=xterm-256color\nPATH=/usr/bin:/bin\nSHELL=/bin/bash',
      '/.void_config/.secrets': 'Les fichiers cachés peuvent contenir des informations sensibles.\nExplorez-les en utilisant la commande "ls -a".\n\nIndice: Certains défis peuvent nécessiter de trouver des fichiers cachés.',
      '/.void_config/.history': 'ls\ncd missions\nls -a\ncat readme.txt\nhelp'
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  tutorialCompleted: {
    type: Boolean,
    default: false
  },
  // Nouveaux champs pour la gestion de la présence et des utilisateurs en ligne
  isOnline: {
    type: Boolean,
    default: false
  },
  lastActive: {
    type: Date,
    default: Date.now
  },
  socketId: {
    type: String,
    default: null
  },
  // Statistiques supplémentaires
  loginCount: {
    type: Number,
    default: 0
  },
  lastLogin: {
    type: Date,
    default: null
  },
  // Préférences utilisateur
  preferences: {
    theme: {
      type: String,
      enum: ['dark', 'light', 'hacker', 'matrix'],
      default: 'hacker'
    },
    notifications: {
      type: Boolean,
      default: true
    },
    sound: {
      type: Boolean,
      default: true
    }
  }
});

// Pré-save hook pour hacher le mot de passe
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Méthode pour comparer les mots de passe
UserSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Méthode pour vérifier si un utilisateur est considéré comme "en ligne"
UserSchema.methods.isConsideredOnline = function() {
  // Considérer comme "en ligne" si actif dans les 5 dernières minutes
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  return this.isOnline || (this.lastActive && this.lastActive > fiveMinutesAgo);
};

// Méthode statique pour obtenir tous les utilisateurs en ligne
UserSchema.statics.getOnlineUsers = async function() {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  
  return this.find({
    $or: [
      { isOnline: true },
      { lastActive: { $gt: fiveMinutesAgo } }
    ]
  }).select('username role lastActive isOnline');
};

// Méthode statique pour mettre à jour le statut "en ligne" d'un utilisateur
UserSchema.statics.updateOnlineStatus = async function(userId, isOnline = true) {
  return this.findByIdAndUpdate(userId, {
    isOnline: isOnline,
    lastActive: new Date()
  }, { new: true });
};

// Méthode pour supprimer le socketId lors de la déconnexion
UserSchema.methods.disconnect = async function() {
  this.isOnline = false;
  this.socketId = null;
  this.lastActive = new Date();
  return this.save();
};

module.exports = mongoose.model('User', UserSchema);