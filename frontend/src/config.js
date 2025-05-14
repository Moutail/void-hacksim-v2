// src/config.js
// Configuration centrale pour l'application

// URL de l'API
export const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
export const SOCKET_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000'

// Autres configurations globales
export const APP_NAME = 'VOID HackSimulator';
export const APP_VERSION = '1.0.0';

// Constantes pour les types de notifications
export const NOTIFICATION_TYPES = {
  NEW_MESSAGE: 'new_message',
  MENTION: 'mention',
  NEW_CHALLENGE: 'new_challenge',
  CHALLENGE_COMPLETED: 'challenge_completed',
  ANNOUNCEMENT: 'announcement',
  WELCOME: 'welcome',
  RANK_UP: 'rank_up',
  SYSTEM: 'system'
};

// Constantes pour les niveaux de difficulté
export const DIFFICULTY_LEVELS = {
  BEGINNER: 'débutant',
  INTERMEDIATE: 'intermédiaire',
  ADVANCED: 'avancé'
};

// Constantes pour les types de défis
export const CHALLENGE_TYPES = {
  TERMINAL: 'terminal',
  CRYPTO: 'crypto',
  CODE: 'code',
  NETWORK: 'network'
};

// Configuration des animations
export const ANIMATION_SETTINGS = {
  ENABLED: true,
  DURATION: 300
};