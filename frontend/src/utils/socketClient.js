// src/utils/socketClient.js - Version mise à jour pour le déploiement
import io from 'socket.io-client';

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

  // Déterminer l'URL de l'API à partir des variables d'environnement ou en déduire du domaine actuel
  const API_URL = process.env.REACT_APP_API_URL || window.location.origin.replace('void-hacksimulator', 'void-hacksimulator-backend');
  
  console.log("Tentative de connexion Socket.io à:", API_URL);

  // Créer une nouvelle connexion avec plus d'options
  socket = io(API_URL, {
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: Infinity,
    timeout: 20000,
    transports: ['websocket', 'polling'], // Essayer d'abord websocket, puis polling
    withCredentials: true
  });

  // Gestionnaires d'événements de connexion
  socket.on('connect', () => {
    console.log('Socket.io connecté avec ID:', socket.id);
    
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
        console.log("Tentative de reconnexion Socket.io...");
        socket.connect();
      }
    }, 3000);
  });

  socket.on('connect_error', (error) => {
    console.error('Erreur de connexion Socket.io:', error);
    notifyListeners('connect_error', error);
  });

  socket.on('auth_error', (error) => {
    console.error('Erreur d\'authentification Socket.io:', error);
    notifyListeners('auth_error', error);
  });

  // Configuration des événements pour les messages et autres
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
      console.log("Heartbeat Socket.io envoyé");
    } else {
      clearInterval(heartbeatInterval);
      console.log("Heartbeat Socket.io arrêté (déconnecté)");
    }
  }, 30000); // 30 secondes
  
  // Nettoyer l'intervalle à la déconnexion
  socket.on('disconnect', () => {
    clearInterval(heartbeatInterval);
    console.log("Heartbeat Socket.io arrêté (événement déconnexion)");
  });
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
 * @param {Function} callback - Fonction de rappel (optionnel)
 */
export const unsubscribeFromEvent = (event, callback = null) => {
  if (!listeners[event]) return;
  
  if (callback) {
    listeners[event] = listeners[event].filter(cb => cb !== callback);
  } else {
    listeners[event] = [];
  }
  
  console.log(`Désabonnement de l'événement '${event}'`);
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
    console.warn(`Tentative d'émission de l'événement '${event}' sur un socket déconnecté`, data);
    // Tentative de reconnexion et d'émission après connexion
    if (socket) {
      socket.connect();
      socket.once('connect', () => {
        console.log(`Reconnecté et émission de l'événement '${event}' retardée:`, data);
        socket.emit(event, data);
      });
    }
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
