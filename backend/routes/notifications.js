// routes/notifications.js - Routes pour gérer les notifications
const express = require('express');
const mongoose = require('mongoose');
const Notification = require('../models/Notification');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

const router = express.Router();

// GET - Récupérer les notifications de l'utilisateur connecté
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 10, unreadOnly = false } = req.query;
    
    // Construire la requête
    const query = { recipient: req.user.id };
    
    // Si unreadOnly est true, ne récupérer que les notifications non lues
    if (unreadOnly === 'true') {
      query.isRead = false;
    }
    
    // Calculer le nombre de notifications à sauter
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Récupérer les notifications
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    // Compter le nombre total de notifications et de notifications non lues
    const totalNotifications = await Notification.countDocuments({ recipient: req.user.id });
    const unreadCount = await Notification.countDocuments({ recipient: req.user.id, isRead: false });
    
    res.json({
      status: 'success',
      data: {
        notifications,
        unreadCount,
        pagination: {
          total: totalNotifications,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(totalNotifications / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des notifications:', error);
    res.status(500).json({
      status: 'error',
      message: 'Erreur lors de la récupération des notifications'
    });
  }
});

// GET - Compter le nombre de notifications non lues
router.get('/unread-count', authMiddleware, async (req, res) => {
  try {
    const count = await Notification.countDocuments({ 
      recipient: req.user.id, 
      isRead: false 
    });
    
    res.json({
      status: 'success',
      data: { count }
    });
  } catch (error) {
    console.error('Erreur lors du comptage des notifications non lues:', error);
    res.status(500).json({
      status: 'error',
      message: 'Erreur lors du comptage des notifications non lues'
    });
  }
});

// PUT - Marquer une notification comme lue
router.put('/:id/read', authMiddleware, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    
    if (!notification) {
      return res.status(404).json({
        status: 'error',
        message: 'Notification non trouvée'
      });
    }
    
    // Vérifier que la notification appartient à l'utilisateur
    if (notification.recipient.toString() !== req.user.id) {
      return res.status(403).json({
        status: 'error',
        message: 'Vous n\'êtes pas autorisé à accéder à cette notification'
      });
    }
    
    // Marquer comme lue
    notification.isRead = true;
    await notification.save();
    
    res.json({
      status: 'success',
      data: notification
    });
  } catch (error) {
    console.error('Erreur lors du marquage de la notification comme lue:', error);
    res.status(500).json({
      status: 'error',
      message: 'Erreur lors du marquage de la notification comme lue'
    });
  }
});

// PUT - Marquer toutes les notifications comme lues
router.put('/mark-all-read', authMiddleware, async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user.id, isRead: false },
      { isRead: true }
    );
    
    res.json({
      status: 'success',
      message: 'Toutes les notifications ont été marquées comme lues'
    });
  } catch (error) {
    console.error('Erreur lors du marquage de toutes les notifications comme lues:', error);
    res.status(500).json({
      status: 'error',
      message: 'Erreur lors du marquage de toutes les notifications comme lues'
    });
  }
});

// DELETE - Supprimer une notification
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    
    if (!notification) {
      return res.status(404).json({
        status: 'error',
        message: 'Notification non trouvée'
      });
    }
    
    // Vérifier que la notification appartient à l'utilisateur
    if (notification.recipient.toString() !== req.user.id) {
      return res.status(403).json({
        status: 'error',
        message: 'Vous n\'êtes pas autorisé à supprimer cette notification'
      });
    }
    
    await notification.deleteOne();
    
    res.json({
      status: 'success',
      message: 'Notification supprimée avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la suppression de la notification:', error);
    res.status(500).json({
      status: 'error',
      message: 'Erreur lors de la suppression de la notification'
    });
  }
});

// Routes admin pour les notifications globales

// POST - Créer une notification pour tous les utilisateurs (Admin seulement)
router.post('/global', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { title, content, type = 'system', expiresIn = 30 } = req.body;
    
    if (!title || !content) {
      return res.status(400).json({
        status: 'error',
        message: 'Titre et contenu requis'
      });
    }
    
    // Récupérer tous les IDs d'utilisateurs
    const users = await mongoose.model('User').find({}, '_id');
    
    // Créer une notification pour chaque utilisateur
    const notifications = users.map(user => {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + parseInt(expiresIn));
      
      return {
        recipient: user._id,
        type,
        title,
        content,
        expiresAt
      };
    });
    
    // Insérer toutes les notifications d'un coup
    await Notification.insertMany(notifications);
    
    res.status(201).json({
      status: 'success',
      message: `Notification envoyée à ${users.length} utilisateurs`
    });
  } catch (error) {
    console.error('Erreur lors de la création de la notification globale:', error);
    res.status(500).json({
      status: 'error',
      message: 'Erreur lors de la création de la notification globale'
    });
  }
});

module.exports = router;