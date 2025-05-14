// src/utils/socketClient.js - Version améliorée avec support temps réel
import io from 'socket.io-client';
import { API_URL } from '../config';

let socket = null;
let reconnectTimer = null;
const listeners = {};

/**
 * Initialise la connexion Socket.io
 * @param {string} userId - ID de l'utilisateur connecté
 * @param {string} token - Token d'authentification
 * @param {Function} onStatusChange - Callback pour les changements de statut
 * @returns {Object} - Instance du socket
 */
export const initializeSocket = (userId, token, onStatusChange = null) => {
  if (socket) {
    // Nettoyer l'ancienne connexion si elle existe
    socket.disconnect();
  }

  // Créer une nouvelle connexion
  socket = io(API_URL, {
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: Infinity
  });

  // Gestionnaires d'événements de connexion
  socket.on('connect', () => {
    console.log('Socket.io connecté');
    
    // Authentifier l'utilisateur
    socket.emit('authenticate', { userId, token });
    
    // Démarrer le heartbeat (garder la connexion active)
    startHeartbeat();
    
    // Informer le composant parent
    if (onStatusChange) {
      onStatusChange(true);
    }
    
    // Notifier les écouteurs connectés
    notifyListeners('connect');
  });

  socket.on('disconnect', () => {
    console.log('Socket.io déconnecté');
    
    // Informer le composant parent
    if (onStatusChange) {
      onStatusChange(false);
    }
    
    // Notifier les écouteurs déconnectés
    notifyListeners('disconnect');
    
    // Essayer de se reconnecter après un délai
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
    }
    
    reconnectTimer = setTimeout(() => {
      if (socket) {
        socket.connect();
      }
    }, 2000);
  });

  socket.on('connect_error', (error) => {
    console.error('Erreur de connexion Socket.io:', error);
    notifyListeners('connect_error', error);
  });

  socket.on('auth_error', (error) => {
    console.error('Erreur d\'authentification Socket.io:', error);
    notifyListeners('auth_error', error);
  });

  // Configuration des événements liés aux messages
  configureMessageEvents();

  return socket;
};

/**
 * Configure les écouteurs d'événements pour les messages et autres
 */
const configureMessageEvents = () => {
  // Événements liés aux messages
  const messageEvents = [
    'new_message', 
    'message_deleted', 
    'message_edited', 
    'message_liked'
  ];
  
  messageEvents.forEach(event => {
    socket.on(event, (data) => {
      console.log(`Socket.io: ${event} reçu`, data);
      notifyListeners(event, data);
    });
  });
  
  // Événements liés aux utilisateurs
  const userEvents = [
    'user_status_changed',
    'online_users'
  ];
  
  userEvents.forEach(event => {
    socket.on(event, (data) => {
      notifyListeners(event, data);
    });
  });
  
  // Événements liés aux notifications
  socket.on('notification', (data) => {
    console.log('Socket.io: Notification reçue', data);
    notifyListeners('notification', data);
  });
};

/**
 * Déconnecte le socket
 */
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  
  // Réinitialiser tous les écouteurs
  Object.keys(listeners).forEach(event => {
    listeners[event] = [];
  });
};

/**
 * Envoie un heartbeat périodique pour maintenir la connexion
 */
const startHeartbeat = () => {
  const heartbeatInterval = setInterval(() => {
    if (socket && socket.connected) {
      socket.emit('heartbeat');
    } else {
      clearInterval(heartbeatInterval);
    }
  }, 30000); // 30 secondes
  
  // Nettoyer l'intervalle à la déconnexion
  socket.on('disconnect', () => {
    clearInterval(heartbeatInterval);
  });
};

/**
 * Obtient l'instance actuelle du socket
 * @returns {Object|null} - Instance du socket ou null
 */
export const getSocket = () => socket;

/**
 * S'abonne à un événement Socket.io
 * @param {string} event - Nom de l'événement
 * @param {Function} callback - Fonction de rappel
 */
export const subscribeToEvent = (event, callback) => {
  if (!listeners[event]) {
    listeners[event] = [];
  }
  
  listeners[event].push(callback);
  console.log(`Abonnement à l'événement '${event}'`);
};

/**
 * Se désabonne d'un événement Socket.io
 * @param {string} event - Nom de l'événement
 * @param {Function} callback - Fonction de rappel
 */
export const unsubscribeFromEvent = (event, callback) => {
  if (!listeners[event]) return;
  
  if (callback) {
    listeners[event] = listeners[event].filter(cb => cb !== callback);
  } else {
    listeners[event] = [];
  }
  
  console.log(`Désabonnement de l'événement '${event}'`);
};

/**
 * Notifie tous les écouteurs d'un événement
 * @param {string} event - Nom de l'événement
 * @param {*} data - Données de l'événement
 */
const notifyListeners = (event, data) => {
  if (!listeners[event]) return;
  
  listeners[event].forEach(callback => {
    try {
      callback(data);
    } catch (error) {
      console.error(`Erreur dans un écouteur de l'événement '${event}':`, error);
    }
  });
};

/**
 * Émet un événement Socket.io
 * @param {string} event - Nom de l'événement
 * @param {Object} data - Données à envoyer
 */
export const emitEvent = (event, data) => {
  if (socket && socket.connected) {
    console.log(`Émission de l'événement '${event}':`, data);
    socket.emit(event, data);
  } else {
    console.warn(`Tentative d'émission de l'événement '${event}' sur un socket déconnecté`);
  }
};

/**
 * Vérifie si le socket est connecté
 * @returns {boolean} - État de la connexion
 */
export const isConnected = () => {
  return socket && socket.connected;
};

export default {
  initializeSocket,
  disconnectSocket,
  getSocket,
  subscribeToEvent,
  unsubscribeFromEvent,
  emitEvent,
  isConnected
};