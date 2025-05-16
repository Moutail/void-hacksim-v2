// services/socketService.js - Code complet avec gestion des messages en temps réel

const User = require('../models/User');
const Message = require('../models/Message');
const Notification = require('../models/Notification');

let io;

/**
 * Initialise le service Socket.io
 * @param {Object} socketIo - Instance Socket.io
 */
const initialize = (socketIo) => {
  io = socketIo;
  
  io.on('connection', handleConnection);
  
  console.log('Service Socket.io initialisé');
};

/**
 * Retourne l'instance io pour utilisation externe
 * @returns {Object} - Instance Socket.io
 */
const getIO = () => {
  if (!io) {
    throw new Error('Socket.io n\'est pas initialisé');
  }
  return io;
};

/**
 * Gère une nouvelle connexion Socket.io
 * @param {Object} socket - Socket client
 */
const handleConnection = (socket) => {
  console.log(`Nouvelle connexion Socket: ${socket.id}`);
  
  // Authentification de l'utilisateur
  socket.on('authenticate', async (data) => {
    try {
      const { userId, token } = data;
      
      if (!userId) {
        socket.emit('auth_error', { message: 'ID utilisateur non fourni' });
        return;
      }
      
      // Vérifier l'ID utilisateur (vous pourriez ajouter une vérification du token)
      const user = await User.findById(userId);
      
      if (!user) {
        socket.emit('auth_error', { message: 'Utilisateur non trouvé' });
        return;
      }
      
      // Stocker les informations complètes de l'utilisateur dans le socket
      socket.userId = userId;
      socket.username = user.username;
      socket.role = user.role;
      socket.isAdmin = user.role === 'admin'; // Ajout d'un indicateur d'admin
      
      // Mettre à jour le statut de l'utilisateur
      user.isOnline = true;
      user.lastActive = new Date();
      user.socketId = socket.id;
      await user.save();
      
      // Confirmer l'authentification
      socket.emit('authenticated', {
        success: true,
        user: {
          id: user._id,
          username: user.username,
          role: user.role
        }
      });
      
      // Informer les autres utilisateurs
      socket.broadcast.emit('user_status_changed', {
        userId: user._id,
        username: user.username,
        isOnline: true
      });
      
      // Envoyer la liste des utilisateurs en ligne
      emitOnlineUsers();
      
      console.log(`Utilisateur authentifié: ${user.username} (Admin: ${socket.isAdmin})`);
    } catch (error) {
      console.error('Erreur lors de l\'authentification Socket.io:', error);
      socket.emit('auth_error', { message: 'Erreur d\'authentification' });
    }
  });

   // Événement pour rejoindre la salle d'un défi
  socket.on('join_challenge', (data) => {
    const { challengeId } = data;
    if (!socket.userId || !challengeId) return;
    
    // Faire rejoindre l'utilisateur dans la salle de ce défi
    const roomName = `challenge:${challengeId}`;
    socket.join(roomName);
    console.log(`User ${socket.userId} a rejoint la salle ${roomName}`);
    
    // Informer l'utilisateur qu'il a rejoint la salle
    socket.emit('joined_challenge', {
      challengeId,
      success: true
    });
  });
  
  // Mise à jour d'activité (heartbeat)
  socket.on('heartbeat', async () => {
    if (!socket.userId) return;
    
    try {
      await User.findByIdAndUpdate(socket.userId, {
        lastActive: new Date()
      });
    } catch (error) {
      console.error('Erreur lors de la mise à jour de l\'activité:', error);
    }
  });
  
  // Événements pour les messages du forum
  socket.on('send_message', handleNewMessage(socket));
  socket.on('delete_message', handleDeleteMessage(socket));
  socket.on('edit_message', handleEditMessage(socket)); // Nouvel événement
  socket.on('like_message', handleLikeMessage(socket)); // Nouvel événement
  
  // Événements pour les notifications
  socket.on('read_notification', handleReadNotification(socket));
  
  // Déconnexion
  socket.on('disconnect', () => handleDisconnect(socket));
};

/**
 * Gère la réception d'un nouveau message
 * @param {Object} socket - Socket client
 * @returns {Function} - Gestionnaire d'événement
 */
const handleNewMessage = (socket) => async (data) => {
  try {
    const { channelId, content, _id } = data;
    
    if (!socket.userId || !channelId || !content) {
      console.error('Données de message incomplètes:', data);
      return;
    }
    
    // Utiliser les informations utilisateur stockées dans le socket
    const enhancedData = {
      ...data,
      userId: socket.userId,
      username: socket.username,
      role: socket.role
    };
    
    // Mettre à jour la dernière activité
    await User.findByIdAndUpdate(socket.userId, {
      lastActive: new Date()
    });
    
    // Journaliser les informations envoyées pour débogage
    console.log('Émission de message avec données complètes:', {
      id: _id,
      channelId,
      content: content.substring(0, 30) + (content.length > 30 ? '...' : ''),
      userId: socket.userId,
      username: socket.username,
      role: socket.role
    });
    
    // Émettre le message à tous les clients
    io.emit('new_message', enhancedData);
    
    console.log(`Message envoyé par ${socket.username} (${socket.userId}) dans ${channelId}`);
  } catch (error) {
    console.error('Erreur lors du traitement du message:', error);
    socket.emit('message_error', { message: 'Erreur lors de l\'envoi du message' });
  }
};

/**
 * Gère la suppression d'un message
 * @param {Object} socket - Socket client
 * @returns {Function} - Gestionnaire d'événement
 */
const handleDeleteMessage = (socket) => async (data) => {
  try {
    const { messageId, channelId, isAdminAction } = data;
    
    if (!socket.userId || !messageId) {
      console.error('Données de suppression incomplètes:', data);
      return;
    }
    
    // Récupérer le message à supprimer
    const message = await Message.findById(messageId);
    
    if (!message) {
      console.error('Message non trouvé:', messageId);
      socket.emit('message_error', { message: 'Message non trouvé' });
      return;
    }
    
    // Vérifier les autorisations de suppression
    const isAuthor = message.author && message.author.toString() === socket.userId;
    const isAdmin = socket.isAdmin;
    
    if (!isAuthor && !isAdmin) {
      console.error('Tentative de suppression non autorisée:', {
        messageId,
        userId: socket.userId,
        username: socket.username
      });
      socket.emit('message_error', { message: 'Vous n\'êtes pas autorisé à supprimer ce message' });
      return;
    }
    
    // Préparer les données pour l'événement
    const deletionData = {
      messageId,
      channelId: message.channel,
      deletedBy: {
        userId: socket.userId,
        username: socket.username,
        isAdmin: socket.isAdmin
      }
    };
    
    // Émettre un événement de suppression à tous les clients AVANT de supprimer
    // pour garantir que tous reçoivent l'événement
    io.emit('message_deleted', deletionData);
    
    // Journaliser la suppression
    console.log(`Message ${messageId} supprimé par ${isAdmin ? 'admin' : 'auteur'} ${socket.username}`);
    
    // Si la suppression est faite par un admin et qu'il n'est pas l'auteur, notifier l'auteur
    if (isAdmin && !isAuthor && message.author) {
      try {
        // Créer une notification pour l'auteur
        const notification = new Notification({
          recipient: message.author,
          type: 'moderation',
          title: 'Message supprimé par un administrateur',
          content: `Votre message dans #${message.channel} a été supprimé par un administrateur.`,
          createdAt: new Date(),
          relatedTo: {
            model: 'Message',
            id: messageId
          }
        });
        
        await notification.save();
        
        // Envoyer la notification directement à l'auteur s'il est connecté
        const author = await User.findById(message.author);
        if (author && author.socketId) {
          io.to(author.socketId).emit('notification', {
            _id: notification._id,
            type: notification.type,
            title: notification.title,
            content: notification.content,
            createdAt: notification.createdAt
          });
        }
      } catch (notificationError) {
        console.error('Erreur lors de la création de notification:', notificationError);
      }
    }
    
    // Supprimer le message de la base de données
    await Message.findByIdAndDelete(messageId);
    
    // Supprimer les notifications liées à ce message
    await Notification.deleteMany({
      'relatedTo.model': 'Message',
      'relatedTo.id': messageId
    });
  } catch (error) {
    console.error('Erreur lors de la suppression du message:', error);
    socket.emit('message_error', { message: 'Erreur lors de la suppression du message' });
  }
};

/**
 * Gère la modification d'un message
 * @param {Object} socket - Socket client
 * @returns {Function} - Gestionnaire d'événement
 */
const handleEditMessage = (socket) => async (data) => {
  try {
    const { messageId, channelId, content } = data;
    
    if (!socket.userId || !messageId || !content) {
      console.error('Données de modification incomplètes:', data);
      return;
    }
    
    // Récupérer le message à modifier
    const message = await Message.findById(messageId);
    
    if (!message) {
      console.error('Message non trouvé:', messageId);
      socket.emit('message_error', { message: 'Message non trouvé' });
      return;
    }
    
    // Vérifier les autorisations de modification
    const isAuthor = message.author.toString() === socket.userId;
    const isAdmin = socket.isAdmin;
    
    if (!isAuthor && !isAdmin) {
      console.error('Tentative de modification non autorisée:', {
        messageId,
        userId: socket.userId,
        username: socket.username
      });
      socket.emit('message_error', { message: 'Vous n\'êtes pas autorisé à modifier ce message' });
      return;
    }
    
    // Mettre à jour le message dans la base de données
    message.content = content;
    message.isEdited = true;
    message.updatedAt = new Date();
    await message.save();
    
    // Extraire les mentions si nécessaire
    if (typeof message.extractMentions === 'function') {
      await message.extractMentions();
      await message.save();
    }
    
    // Émettre un événement de modification à tous les clients
    io.emit('message_edited', {
      messageId,
      channelId: message.channel,
      content,
      editor: {
        id: socket.userId,
        username: socket.username,
        role: socket.role,
        isAdmin: socket.isAdmin
      },
      updatedAt: message.updatedAt
    });
    
    // Journaliser la modification
    console.log(`Message ${messageId} modifié par ${socket.username}`);
  } catch (error) {
    console.error('Erreur lors de la modification du message:', error);
    socket.emit('message_error', { message: 'Erreur lors de la modification du message' });
  }
};

/**
 * Gère les likes sur un message
 * @param {Object} socket - Socket client
 * @returns {Function} - Gestionnaire d'événement
 */
const handleLikeMessage = (socket) => async (data) => {
  try {
    const { messageId, liked } = data;
    
    if (!socket.userId || !messageId) {
      console.error('Données de like incomplètes:', data);
      return;
    }
    
    // Récupérer le message
    const message = await Message.findById(messageId);
    
    if (!message) {
      console.error('Message non trouvé:', messageId);
      socket.emit('message_error', { message: 'Message non trouvé' });
      return;
    }
    
    // Vérifier si l'utilisateur a déjà liké le message
    const userLiked = message.likes.includes(socket.userId);
    
    if (userLiked && !liked) {
      // Retirer le like
      message.likes = message.likes.filter(id => id.toString() !== socket.userId);
    } else if (!userLiked && liked) {
      // Ajouter le like
      message.likes.push(socket.userId);
    }
    
    await message.save();
    
    // Émettre une mise à jour à tous les clients
    io.emit('message_liked', {
      messageId,
      channelId: message.channel,
      likes: message.likes,
      likedBy: {
        userId: socket.userId,
        username: socket.username
      }
    });
    
    console.log(`Message ${messageId} ${liked ? 'liké' : 'unliké'} par ${socket.username}`);
  } catch (error) {
    console.error('Erreur lors du like/unlike du message:', error);
    socket.emit('message_error', { message: 'Erreur lors du like/unlike du message' });
  }
};

/**
 * Gère la lecture d'une notification
 * @param {Object} socket - Socket client
 * @returns {Function} - Gestionnaire d'événement
 */
const handleReadNotification = (socket) => async (data) => {
  try {
    const { notificationId } = data;
    
    if (!socket.userId || !notificationId) return;
    
    // Mettre à jour la dernière activité
    await User.findByIdAndUpdate(socket.userId, {
      lastActive: new Date()
    });
    
    // Marquer la notification comme lue
    await Notification.findOneAndUpdate(
      { _id: notificationId, recipient: socket.userId },
      { isRead: true }
    );
    
    // Émettre un événement de confirmation
    socket.emit('notification_read', {
      notificationId,
      success: true
    });
  } catch (error) {
    console.error('Erreur lors de la lecture de la notification:', error);
    socket.emit('notification_error', { message: 'Erreur lors de la lecture de la notification' });
  }
};

/**
 * Gère la déconnexion d'un socket
 * @param {Object} socket - Socket client
 */
const handleDisconnect = async (socket) => {
  console.log(`Déconnexion Socket: ${socket.id}`);
  
  if (!socket.userId) return;
  
  try {
    // Rechercher l'utilisateur
    const user = await User.findById(socket.userId);
    
    if (user) {
      // Vérifier si l'ID du socket correspond
      if (user.socketId === socket.id) {
        // Marquer l'utilisateur comme hors ligne
        user.isOnline = false;
        user.socketId = null;
        user.lastActive = new Date();
        await user.save();
        
        // Informer les autres utilisateurs
        socket.broadcast.emit('user_status_changed', {
          userId: user._id,
          username: user.username,
          isOnline: false
        });
        
        console.log(`Utilisateur déconnecté: ${user.username}`);
      }
    }
    
    // Mettre à jour la liste des utilisateurs en ligne
    emitOnlineUsers();
  } catch (error) {
    console.error('Erreur lors de la déconnexion:', error);
  }
};

/**
 * Émet la liste des utilisateurs en ligne à tous les clients
 */
const emitOnlineUsers = async () => {
  try {
    // Utiliser la méthode statique du modèle User
    const onlineUsers = await User.getOnlineUsers();
    
    // Formater les données
    const formattedUsers = onlineUsers.map(user => ({
      id: user._id,
      username: user.username,
      role: user.role,
      isOnline: user.isOnline,
      lastActive: user.lastActive
    }));
    
    // Émettre à tous les clients
    io.emit('online_users', formattedUsers);
  } catch (error) {
    console.error('Erreur lors de l\'émission des utilisateurs en ligne:', error);
  }
};

/**
 * Fonction de nettoyage périodique des statuts en ligne
 */
const cleanupOnlineStatus = async () => {
  try {
    // Définir le seuil d'inactivité (15 minutes)
    const inactiveThreshold = new Date(Date.now() - 15 * 60 * 1000);
    
    // Trouver les utilisateurs inactifs
    const inactiveUsers = await User.find({
      isOnline: true,
      lastActive: { $lt: inactiveThreshold }
    });
    
    // Mettre à jour leur statut
    for (const user of inactiveUsers) {
      user.isOnline = false;
      user.socketId = null;
      await user.save();
      
      // Informer les autres utilisateurs
      io.emit('user_status_changed', {
        userId: user._id,
        username: user.username,
        isOnline: false
      });
    }
    
    if (inactiveUsers.length > 0) {
      console.log(`${inactiveUsers.length} utilisateurs marqués comme hors ligne`);
      
      // Mettre à jour la liste des utilisateurs en ligne
      emitOnlineUsers();
    }
  } catch (error) {
    console.error('Erreur lors du nettoyage des statuts en ligne:', error);
  }
};

/**
 * Planifie le nettoyage périodique des statuts en ligne
 * @param {Object} cron - Module node-cron
 */
const scheduleCleanup = (cron) => {
  try {
    // Exécuter toutes les 5 minutes - utiliser une expression cron valide
    cron.schedule('*/5 * * * *', () => {
      console.log('Exécution du nettoyage des statuts en ligne...');
      cleanupOnlineStatus().catch(err => {
        console.error('Erreur pendant le nettoyage des statuts:', err);
      });
    });
  } catch (error) {
    console.error('Erreur lors de la planification du nettoyage:', error);
    
    // Mise en place d'un plan B avec setInterval en cas d'échec de node-cron
    console.log('Utilisation de setInterval comme alternative à node-cron');
    setInterval(() => {
      console.log('Exécution du nettoyage des statuts en ligne (via setInterval)...');
      cleanupOnlineStatus().catch(err => {
        console.error('Erreur pendant le nettoyage des statuts:', err);
      });
    }, 5 * 60 * 1000); // 5 minutes en millisecondes
  }
};

/**
 * Notifie un utilisateur spécifique
 * @param {string} userId - ID de l'utilisateur à notifier
 * @param {Object} notification - Objet de notification
 */
const notifyUser = async (userId, notification) => {
  try {
    const user = await User.findById(userId);
    
    if (user && user.socketId) {
      io.to(user.socketId).emit('notification', notification);
    }
  } catch (error) {
    console.error('Erreur lors de l\'envoi de la notification:', error);
  }
};

/**
 * Notifie tous les utilisateurs
 * @param {Object} notification - Objet de notification
 */
const notifyAll = (notification) => {
  io.emit('notification', notification);
};

/**
 * Permet à un utilisateur de rejoindre une salle de défi pour recevoir des mises à jour
 * @param {string} userId - ID de l'utilisateur
 * @param {string} challengeId - ID du défi
 */
const joinChallengeRoom = (userId, challengeId) => {
  try {
    const user = User.findById(userId);
    if (!user) return;
    
    // Si l'utilisateur a un socket actif
    if (user.socketId) {
      const socket = io.sockets.sockets.get(user.socketId);
      if (socket) {
        // Faire rejoindre l'utilisateur dans la salle de ce défi
        const roomName = `challenge:${challengeId}`;
        socket.join(roomName);
        console.log(`User ${userId} a rejoint la salle ${roomName}`);
      }
    }
  } catch (error) {
    console.error('Erreur lors de la rejointe à la salle de défi:', error);
  }
};

/**
 * Notifier la mise à jour d'objectifs dans un défi
 * @param {string} challengeId - ID du défi
 * @param {string} userId - ID de l'utilisateur qui a complété l'objectif
 * @param {Array} completedObjectives - Objectifs nouvellement complétés
 * @param {boolean} allObjectivesCompleted - Indique si tous les objectifs sont complétés
 */
const notifyChallengeObjectives = (challengeId, userId, completedObjectives, allObjectivesCompleted) => {
  try {
    // Construire les données à envoyer
    const updateData = {
      challengeId,
      userId,
      completedObjectives,
      allObjectivesCompleted,
      timestamp: new Date()
    };
    
    // Vérifier si la salle existe
    const roomName = `challenge:${challengeId}`;
    const room = io.sockets.adapter.rooms.get(roomName);
    
    console.log(`[Socket.io] Tentative d'émission à la salle ${roomName}`);
    console.log(`[Socket.io] La salle existe-t-elle? ${room ? 'OUI' : 'NON'}`);
    console.log(`[Socket.io] Nombre de clients dans cette salle: ${room ? room.size : 0}`);
    
    // Envoyer à tous les utilisateurs dans la salle
    io.to(roomName).emit('challenge_objectives_updated', updateData);
    
    // Émission de secours à tous les clients
    io.emit('challenge_objectives_updated_global', updateData);
    
    console.log(`[Socket.io] Notification d'objectifs envoyée: ${JSON.stringify(updateData)}`);
    
    // Log détaillé des émissions
    if (io.sockets) {
      console.log(`[Socket.io] Nombre total de connexions actives: ${Object.keys(io.sockets.sockets).length}`);
    }
    
    // Si tous les objectifs sont complétés, envoyer un événement spécial
    if (allObjectivesCompleted) {
      io.to(roomName).emit('challenge_completed', {
        challengeId,
        userId,
        timestamp: new Date()
      });
      console.log(`Défi ${challengeId} complété par l'utilisateur ${userId}`);
    }
  } catch (error) {
    console.error('[Socket.io] Erreur lors de la notification des objectifs de défi:', error);
  }
};

module.exports = {
  initialize,
  getIO,
  emitOnlineUsers,
  cleanupOnlineStatus,
  scheduleCleanup,
  notifyUser,
  notifyAll,
  joinChallengeRoom,
  notifyChallengeObjectives
};
