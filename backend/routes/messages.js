// routes/messages.js - Routes pour les messages avec support temps réel

const express = require('express');
const mongoose = require('mongoose');
const Message = require('../models/Message');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const { sendEmail } = require('../utils/email');
const socketService = require('../services/socketService');

const router = express.Router();

// GET - Récupérer tous les messages (avec pagination et filtres)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { channel = 'general', page = 1, limit = 20 } = req.query;
    
    // Vérifier si le canal est valide
    if (!['general', 'help', 'challenges', 'announcements'].includes(channel)) {
      return res.status(400).json({
        status: 'error',
        message: 'Canal invalide'
      });
    }
    
    // Calculer le nombre de messages à sauter
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Récupérer les messages avec populate complet, y compris pour les messages parents
    const messages = await Message.find({ channel })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('author', 'username role')
      .populate('mentions', 'username')
      .populate({
        path: 'replyTo',
        select: 'content author',
        populate: {
          path: 'author',
          select: 'username'
        }
      })
      .lean();
    
    // Compter le nombre total de messages pour la pagination
    const total = await Message.countDocuments({ channel });
    
    res.json({
      status: 'success',
      data: {
        messages,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des messages:', error);
    res.status(500).json({
      status: 'error',
      message: 'Erreur lors de la récupération des messages'
    });
  }
});

// POST - Créer un nouveau message
router.post('/', authMiddleware, async (req, res) => {
  try {
     let { content, channel = 'general', isAnnouncement = false, replyTo = null } = req.body;
    
     // Vérification et normalisation du contenu
    // Vérification et normalisation du contenu
    if (typeof content !== 'string') {
      // Si content n'est pas une chaîne, essayer de le convertir
      try {
        if (content && typeof content === 'object' && content.content) {
          // Si c'est un objet avec une propriété content, utiliser cette valeur
          content = content.content;
        } else {
          // Sinon, essayer de convertir en chaîne
          content = String(content);
        }
      } catch (e) {
        return res.status(400).json({
          status: 'error',
          message: 'Le contenu du message doit être une chaîne de caractères'
        });
      }
    }

     // Vérifier le contenu
    if (!content || content.trim() === '') {
      return res.status(400).json({
        status: 'error',
        message: 'Le contenu du message est requis'
      });
    }

    // Seuls les admins peuvent créer des annonces
    if (isAnnouncement && req.user.role !== 'admin') {
      return res.status(403).json({
        status: 'error',
        message: 'Seuls les administrateurs peuvent créer des annonces'
      });
    }
    // Vérifier que content est une chaîne
    if (typeof content !== 'string') {
      return res.status(400).json({
        status: 'error',
        message: 'Le contenu du message doit être une chaîne de caractères'
      });
    }
    
    // Vérifier le contenu
    if (!content || content.trim() === '') {
      return res.status(400).json({
        status: 'error',
        message: 'Le contenu du message est requis'
      });
    }
    
    // Seuls les admins peuvent créer des annonces
    if (isAnnouncement && req.user.role !== 'admin') {
      return res.status(403).json({
        status: 'error',
        message: 'Seuls les administrateurs peuvent créer des annonces'
      });
    }
    
    
    // Seuls les admins peuvent créer des annonces
    if (isAnnouncement && req.user.role !== 'admin') {
      return res.status(403).json({
        status: 'error',
        message: 'Seuls les administrateurs peuvent créer des annonces'
      });
    }
    
    // Créer le message
    const message = new Message({
      author: req.user.id,
      content: content.trim(),
      channel,
      isAnnouncement,
      replyTo
    });
    
    // Extraire les mentions (@username)
    await message.extractMentions();
    
    // Sauvegarder le message
    await message.save();
    
    // Récupérer le message avec les infos de l'auteur
    const populatedMessage = await Message.findById(message._id)
      .populate('author', 'username role')
      .populate('mentions', 'username email')
      .populate({
        path: 'replyTo',
        select: 'content author',
        populate: {
          path: 'author',
          select: 'username'
        }
      })
      .lean();
    
    // Créer des notifications pour les mentions
    if (message.mentions && message.mentions.length > 0) {
      const mentionedUsers = await User.find({ _id: { $in: message.mentions } });
      
      // Créer une notification et envoyer un email pour chaque utilisateur mentionné
      for (const user of mentionedUsers) {
        // Créer une notification
        const notification = new Notification({
          recipient: user._id,
          type: 'mention',
          title: 'Vous avez été mentionné',
          content: `@${populatedMessage.author.username} vous a mentionné dans un message sur le canal #${channel}`,
          relatedTo: {
            model: 'Message',
            id: message._id
          }
        });
        
        await notification.save();
        
        // Utiliser socketService pour notifier l'utilisateur en temps réel
        socketService.notifyUser(user._id, {
          _id: notification._id,
          type: notification.type,
          title: notification.title,
          content: notification.content,
          createdAt: notification.createdAt,
          relatedTo: notification.relatedTo
        });
        
        // Envoyer un email (si l'utilisateur a activé cette option)
        try {
          await sendEmail({
            to: user.email,
            subject: `VOID HackSimulator - Vous avez été mentionné par @${populatedMessage.author.username}`,
            text: `@${populatedMessage.author.username} vous a mentionné dans un message sur le canal #${channel}:\n\n${content}\n\nConnectez-vous pour répondre: https://votre-site.com/forum/${channel}`
          });
        } catch (emailError) {
          console.error('Erreur lors de l\'envoi de l\'email de mention:', emailError);
          // Continuer même si l'email échoue
        }
      }
    }
    
    // Si c'est une annonce, créer des notifications pour tous les utilisateurs
    if (isAnnouncement) {
      const users = await User.find({}, '_id');
      
      const notificationPromises = users.map(user => {
        const notification = new Notification({
          recipient: user._id,
          type: 'announcement',
          title: 'Nouvelle annonce',
          content: content.substring(0, 100) + (content.length > 100 ? '...' : ''),
          relatedTo: {
            model: 'Message',
            id: message._id
          }
        });
        
        return notification.save();
      });
      
      await Promise.all(notificationPromises);
      
      // Notifier tous les utilisateurs connectés via Socket.io
      socketService.notifyAll({
        type: 'announcement',
        title: 'Nouvelle annonce',
        content: content.substring(0, 100) + (content.length > 100 ? '...' : ''),
        channelId: channel,
        messageId: message._id,
        author: {
          id: req.user.id,
          username: populatedMessage.author.username,
          role: populatedMessage.author.role
        }
      });
    }
    
    res.status(201).json({
      status: 'success',
      data: populatedMessage
    });
  } catch (error) {
    console.error('Erreur lors de la création du message:', error);
    res.status(500).json({
      status: 'error',
      message: 'Erreur lors de la création du message'
    });
  }
});

// PUT - Modifier un message
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { content } = req.body;
    
    // Vérifier le contenu
    if (!content || content.trim() === '') {
      return res.status(400).json({
        status: 'error',
        message: 'Le contenu du message est requis'
      });
    }
    
    // Récupérer le message
    const message = await Message.findById(req.params.id);
    
    if (!message) {
      return res.status(404).json({
        status: 'error',
        message: 'Message non trouvé'
      });
    }
    
    // Vérifier que l'utilisateur est l'auteur ou un admin
    if (message.author.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        status: 'error',
        message: 'Vous n\'êtes pas autorisé à modifier ce message'
      });
    }
    
    // Un utilisateur standard ne peut pas modifier un message d'admin
    if (req.user.role !== 'admin') {
      const author = await User.findById(message.author, 'role');
      if (author && author.role === 'admin') {
        return res.status(403).json({
          status: 'error',
          message: 'Vous ne pouvez pas modifier un message d\'administrateur'
        });
      }
    }
    
    // Mettre à jour le message
    message.content = content;
    message.isEdited = true;
    message.updatedAt = Date.now();
    
    // Extraire les nouvelles mentions
    await message.extractMentions();
    
    // Sauvegarder les modifications
    await message.save();
    
    // Récupérer le message mis à jour avec les infos de l'auteur
    const updatedMessage = await Message.findById(message._id)
      .populate('author', 'username role')
      .populate('mentions', 'username')
      .lean();
    
    // Émettre l'événement de modification via Socket.io
    const io = socketService.getIO();
    io.emit('message_edited', {
      messageId: message._id,
      channelId: message.channel,
      content: message.content,
      editor: {
        id: req.user.id,
        username: req.user.username,
        isAdmin: req.user.role === 'admin'
      },
      updatedAt: message.updatedAt
    });
    
    res.json({
      status: 'success',
      data: updatedMessage
    });
  } catch (error) {
    console.error('Erreur lors de la modification du message:', error);
    res.status(500).json({
      status: 'error',
      message: 'Erreur lors de la modification du message'
    });
  }
});

// DELETE - Supprimer un message (avec support pour la modération admin)
// DELETE - Supprimer un message (avec support pour la modération admin)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    // Récupérer le message
    const message = await Message.findById(req.params.id);
    
    if (!message) {
      return res.status(404).json({
        status: 'error',
        message: 'Message non trouvé'
      });
    }
    
    // Vérifier si c'est une action de modération admin
    const isAdminAction = req.body && req.body.isAdminAction === true && req.user.role === 'admin';
    
    // Vérifier que l'utilisateur est l'auteur ou un admin
    if (message.author.toString() !== req.user.id && !isAdminAction) {
      return res.status(403).json({
        status: 'error',
        message: 'Vous n\'êtes pas autorisé à supprimer ce message'
      });
    }
    
    // Actions spécifiques si c'est une modération admin
    if (isAdminAction && message.author.toString() !== req.user.id) {
      try {
        // Récupérer l'auteur du message pour les notifications
        const author = await User.findById(message.author);
        
        if (author) {
          // CORRECTION: Stocker l'ID du canal en tant que chaîne et non ObjectId
          // et utiliser Forum comme modèle au lieu de Channel
          const notification = new Notification({
            recipient: author._id,
            type: 'system', // Utiliser 'system' qui est autorisé
            title: 'Message supprimé par modération',
            content: `Un administrateur a supprimé votre message dans le canal #${message.channel}.`,
            relatedTo: {
              model: 'Message', // Utiliser 'Message' qui est autorisé
              id: message._id // Utiliser un ObjectId valide (ID du message)
            }
          });
          
          await notification.save();
          
          // Créer une entrée de journal de modération plutôt qu'une notification liée au canal
          console.log(`[MODÉRATION] Message ${message._id} supprimé par admin ${req.user.id} (${req.body.adminUsername || 'admin'}) dans le canal ${message.channel}`);
        }
      } catch (notifError) {
        console.error('Erreur lors de la création de la notification de modération:', notifError);
        // Continuer malgré l'erreur de notification
      }
    }
    
    // Supprimer les notifications liées à ce message
    await Notification.deleteMany({
      'relatedTo.model': 'Message',
      'relatedTo.id': message._id
    });
    
    // Stocker l'ID et le canal avant la suppression
    const messageId = message._id;
    const channel = message.channel;
    
    // Supprimer le message
    await message.deleteOne();
    
    // Émettre un événement de suppression via Socket.io
    const io = socketService.getIO();
    io.emit('message_deleted', {
      messageId,
      channelId: channel,
      deletedBy: {
        userId: req.user.id,
        username: req.user.username,
        isAdmin: req.user.role === 'admin',
        isAdminAction
      }
    });
    
    res.json({
      status: 'success',
      message: isAdminAction ? 'Message supprimé par modération' : 'Message supprimé avec succès',
      data: {
        messageId,
        channelId: channel
      }
    });
  } catch (error) {
    console.error('Erreur lors de la suppression du message:', error);
    res.status(500).json({
      status: 'error',
      message: 'Erreur lors de la suppression du message',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET - Récupérer les réponses à un message (Thread)
router.get('/thread/:id', authMiddleware, async (req, res) => {
  try {
    // Récupérer l'ID du message parent
    const parentId = req.params.id;
    
    // Vérifier que le message parent existe
    const parentMessage = await Message.findById(parentId);
    
    if (!parentMessage) {
      return res.status(404).json({
        status: 'error',
        message: 'Message parent non trouvé'
      });
    }
    
    // Récupérer toutes les réponses à ce message avec populate complet
    const replies = await Message.find({ replyTo: parentId })
      .sort({ createdAt: 1 })
      .populate('author', 'username role')
      .populate('mentions', 'username')
      .populate({
        path: 'replyTo',
        select: 'content author',
        populate: {
          path: 'author',
          select: 'username'
        }
      })
      .lean();
    
    // Ajouter des logs côté serveur pour débogage
    console.log(`Thread ${parentId}: ${replies.length} réponses trouvées`);
    
    res.json({
      status: 'success',
      data: replies
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du fil de discussion:', error);
    res.status(500).json({
      status: 'error',
      message: 'Erreur lors de la récupération du fil de discussion'
    });
  }
});

// POST - Signaler un message
router.post('/:id/report', authMiddleware, async (req, res) => {
  try {
    const { reason } = req.body;
    const messageId = req.params.id;
    
    // Vérifier si le message existe
    const message = await Message.findById(messageId);
    
    if (!message) {
      return res.status(404).json({
        status: 'error',
        message: 'Message non trouvé'
      });
    }
    
    // Vérifier si l'utilisateur a déjà signalé ce message
    const alreadyReported = message.reports && 
      message.reports.some(report => report.user.toString() === req.user.id);
    
    if (alreadyReported) {
      return res.status(400).json({
        status: 'error',
        message: 'Vous avez déjà signalé ce message'
      });
    }
    
    // Ajouter le signalement
    message.reports = message.reports || [];
    message.reports.push({
      user: req.user.id,
      reason,
      date: new Date()
    });
    
    await message.save();
    
    // Notifier les administrateurs
    const admins = await User.find({ role: 'admin' }, '_id');
    
    // Créer des notifications pour tous les administrateurs
    for (const admin of admins) {
      const notification = new Notification({
        recipient: admin._id,
        type: 'system',
        title: 'Message signalé',
        content: `Un message a été signalé par ${req.user.username} pour la raison suivante: ${reason}`,
        relatedTo: {
          model: 'Message',
          id: message._id
        }
      });
      
      await notification.save();
    }
    
    res.json({
      status: 'success',
      message: 'Message signalé avec succès'
    });
  } catch (error) {
    console.error('Erreur lors du signalement du message:', error);
    res.status(500).json({
      status: 'error',
      message: 'Erreur lors du signalement du message'
    });
  }
});

// POST - Aimer un message
router.post('/:id/like', authMiddleware, async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);
    
    if (!message) {
      return res.status(404).json({
        status: 'error',
        message: 'Message non trouvé'
      });
    }
    
    // Vérifier si l'utilisateur a déjà aimé le message
    const alreadyLiked = message.likes.some(like => like.toString() === req.user.id);
    
    if (alreadyLiked) {
      // Retirer le like
      message.likes = message.likes.filter(like => like.toString() !== req.user.id);
    } else {
      // Ajouter le like
      message.likes.push(req.user.id);
    }
    
    await message.save();
    
    // Émettre un événement via Socket.io
    const io = socketService.getIO();
    io.emit('message_liked', {
      messageId: message._id,
      channelId: message.channel,
      likes: message.likes,
      likedBy: {
        userId: req.user.id,
        username: req.user.username
      }
    });
    
    res.json({
      status: 'success',
      data: {
        likes: message.likes.length,
        liked: !alreadyLiked
      }
    });
  } catch (error) {
    console.error('Erreur lors de l\'ajout/retrait de like:', error);
    res.status(500).json({
      status: 'error',
      message: 'Erreur lors de l\'ajout/retrait de like'
    });
  }
});

module.exports = router;
