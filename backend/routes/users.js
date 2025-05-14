// routes/users.js - Mise à jour avec les routes de présence
const express = require('express');
const User = require('../models/User');
const { adminMiddleware, authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Obtenir le top des utilisateurs (classement)
router.get('/leaderboard', async (req, res) => {
  try {
    const users = await User.find()
      .select('username score completedChallenges')
      .sort({ score: -1 })
      .limit(10);
    
    res.json({
      status: 'success',
      data: users.map(user => ({
        id: user._id,
        username: user.username,
        score: user.score,
        completedChallenges: user.completedChallenges.length
      }))
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du classement:', error);
    res.status(500).json({
      status: 'error',
      message: 'Erreur lors de la récupération du classement'
    });
  }
});

// *** NOUVELLE ROUTE *** - Obtenir les utilisateurs en ligne
router.get('/online', authMiddleware, async (req, res) => {
  try {
    // Utiliser la méthode statique définie dans le modèle
    const onlineUsers = await User.getOnlineUsers();
    
    res.json({
      status: 'success',
      data: onlineUsers.map(user => ({
        id: user._id,
        username: user.username,
        role: user.role,
        isOnline: user.isOnline,
        lastActive: user.lastActive
      }))
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des utilisateurs en ligne:', error);
    res.status(500).json({
      status: 'error',
      message: 'Erreur lors de la récupération des utilisateurs en ligne'
    });
  }
});

// *** NOUVELLE ROUTE *** - Mettre à jour le statut "en ligne"
router.post('/update-presence', authMiddleware, async (req, res) => {
  try {
    // Mettre à jour le statut "en ligne" et l'heure de dernière activité
    const user = await User.findByIdAndUpdate(
      req.user.id,
      {
        isOnline: true,
        lastActive: Date.now()
      },
      { new: true }
    ).select('-password');
    
    res.json({
      status: 'success',
      data: {
        id: user._id,
        isOnline: user.isOnline,
        lastActive: user.lastActive
      }
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du statut en ligne:', error);
    res.status(500).json({
      status: 'error',
      message: 'Erreur lors de la mise à jour du statut en ligne'
    });
  }
});

// Obtenir son propre profil
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('-password')
      .populate('completedChallenges', 'title level type points');
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'Utilisateur non trouvé'
      });
    }
    
    // *** MISE À JOUR *** - Mise à jour de la dernière activité
    user.lastActive = Date.now();
    await user.save();
    
    res.json({
      status: 'success',
      data: user
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du profil:', error);
    res.status(500).json({
      status: 'error',
      message: 'Erreur lors de la récupération du profil'
    });
  }
});

// Mettre à jour son propre profil
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const { username, email, preferences } = req.body;
    
    // Vérifier si le nom d'utilisateur ou l'email existe déjà
    if (username || email) {
      const existingUser = await User.findOne({
        $and: [
          { _id: { $ne: req.user.id } },
          {
            $or: [
              { username: username },
              { email: email }
            ]
          }
        ]
      });
      
      if (existingUser) {
        return res.status(400).json({
          status: 'error',
          message: 'Ce nom d\'utilisateur ou cet email est déjà utilisé'
        });
      }
    }
    
    // *** MISE À JOUR *** - Gestion des préférences
    const updateData = { 
      username, 
      email,
      lastActive: Date.now()
    };
    
    // Ajouter les préférences si elles sont fournies
    if (preferences) {
      updateData.preferences = {};
      
      if (preferences.theme) {
        updateData.preferences.theme = preferences.theme;
      }
      
      if (preferences.notifications !== undefined) {
        updateData.preferences.notifications = preferences.notifications;
      }
      
      if (preferences.sound !== undefined) {
        updateData.preferences.sound = preferences.sound;
      }
    }
    
    // Mettre à jour l'utilisateur
    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-password');
    
    res.json({
      status: 'success',
      data: updatedUser
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du profil:', error);
    res.status(500).json({
      status: 'error',
      message: 'Erreur lors de la mise à jour du profil'
    });
  }
});

// Changer son mot de passe
router.put('/change-password', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        status: 'error',
        message: 'Les mots de passe actuels et nouveaux sont requis'
      });
    }
    
    const user = await User.findById(req.user.id).select('+password');
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'Utilisateur non trouvé'
      });
    }
    
    // Vérifier le mot de passe actuel
    const isMatch = await user.comparePassword(currentPassword);
    
    if (!isMatch) {
      return res.status(401).json({
        status: 'error',
        message: 'Mot de passe actuel incorrect'
      });
    }
    
    // Mettre à jour le mot de passe
    user.password = newPassword;
    user.lastActive = Date.now();
    await user.save();
    
    res.json({
      status: 'success',
      message: 'Mot de passe modifié avec succès'
    });
  } catch (error) {
    console.error('Erreur lors du changement de mot de passe:', error);
    res.status(500).json({
      status: 'error',
      message: 'Erreur lors du changement de mot de passe'
    });
  }
});

// Marquer le tutoriel comme complété
router.put('/tutorial-completed', authMiddleware, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { 
        $set: { 
          tutorialCompleted: true,
          lastActive: Date.now()
        } 
      },
      { new: true }
    ).select('-password');
    
    res.json({
      status: 'success',
      data: user
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du statut du tutoriel:', error);
    res.status(500).json({
      status: 'error',
      message: 'Erreur lors de la mise à jour du statut du tutoriel'
    });
  }
});

// *** NOUVELLE ROUTE *** - Déconnecter un utilisateur (mettre hors ligne)
router.post('/offline', authMiddleware, async (req, res) => {
  try {
    await User.findByIdAndUpdate(
      req.user.id,
      {
        isOnline: false,
        socketId: null,
        lastActive: Date.now()
      }
    );
    
    res.json({
      status: 'success',
      message: 'Utilisateur marqué comme hors ligne'
    });
  } catch (error) {
    console.error('Erreur lors de la mise hors ligne:', error);
    res.status(500).json({
      status: 'error',
      message: 'Erreur lors de la mise hors ligne'
    });
  }
});

// ROUTES ADMIN

// Obtenir tous les utilisateurs (admin seulement)
router.get('/', adminMiddleware, async (req, res) => {
  try {
    const users = await User.find()
      .select('-password')
      .sort({ createdAt: -1 });
    
    res.json({
      status: 'success',
      data: users
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des utilisateurs:', error);
    res.status(500).json({
      status: 'error',
      message: 'Erreur lors de la récupération des utilisateurs'
    });
  }
});

// Obtenir un utilisateur spécifique (admin seulement)
router.get('/:id', adminMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('completedChallenges', 'title level type points');
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'Utilisateur non trouvé'
      });
    }
    
    res.json({
      status: 'success',
      data: user
    });
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'utilisateur:', error);
    res.status(500).json({
      status: 'error',
      message: 'Erreur lors de la récupération de l\'utilisateur'
    });
  }
});

// Modifier un utilisateur (admin seulement)
router.put('/:id', adminMiddleware, async (req, res) => {
  try {
    const { username, email, role, score, isOnline } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: { username, email, role, score, isOnline } },
      { new: true, runValidators: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'Utilisateur non trouvé'
      });
    }
    
    res.json({
      status: 'success',
      data: user
    });
  } catch (error) {
    console.error('Erreur lors de la modification de l\'utilisateur:', error);
    res.status(500).json({
      status: 'error',
      message: 'Erreur lors de la modification de l\'utilisateur'
    });
  }
});

// Supprimer un utilisateur (admin seulement)
router.delete('/:id', adminMiddleware, async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'Utilisateur non trouvé'
      });
    }
    
    res.json({
      status: 'success',
      message: 'Utilisateur supprimé avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'utilisateur:', error);
    res.status(500).json({
      status: 'error',
      message: 'Erreur lors de la suppression de l\'utilisateur'
    });
  }
});

module.exports = router;