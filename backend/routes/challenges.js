// routes/challenges.js
const express = require('express');
const mongoose = require('mongoose');
const Challenge = require('../models/Challenge');
const User = require('../models/User');
const Attempt = require('../models/Attempt');
const { adminMiddleware } = require('../middleware/auth');

const router = express.Router();

// Récupérer tous les défis actifs (pour les utilisateurs)
router.get('/', async (req, res) => {
  try {
    const challenges = await Challenge.find({ active: true })
      .select('title description level type points createdAt')
      .sort({ createdAt: -1 });
    
    // Obtenir les défis complétés par l'utilisateur
    const user = await User.findById(req.user.id);
    const completedChallengeIds = user.completedChallenges.map(id => id.toString());
    
    // Ajouter un indicateur de complétion pour chaque défi
    const challengesWithStatus = challenges.map(challenge => {
      const isCompleted = completedChallengeIds.includes(challenge._id.toString());
      return {
        ...challenge.toObject(),
        isCompleted
      };
    });
    
    res.json({
      status: 'success',
      data: challengesWithStatus
    });
  } catch (error) {
    console.error('Erreur de récupération des défis:', error);
    res.status(500).json({
      status: 'error',
      message: 'Erreur lors de la récupération des défis'
    });
  }
});

// Récupérer un défi spécifique par ID
router.get('/:id', async (req, res) => {
  try {
    const challenge = await Challenge.findById(req.params.id);
    
    if (!challenge) {
      return res.status(404).json({
        status: 'error',
        message: 'Défi non trouvé'
      });
    }
    
    // Vérifier si le défi est actif ou si l'utilisateur est admin
    if (!challenge.active && req.user.role !== 'admin') {
      return res.status(403).json({
        status: 'error',
        message: 'Ce défi n\'est pas disponible actuellement'
      });
    }
    
    // Vérifier si l'utilisateur a déjà une tentative en cours
    let attempt = await Attempt.findOne({
      user: req.user.id,
      challenge: req.params.id,
      completed: false
    });
    
    // Si aucune tentative n'existe, en créer une nouvelle
    if (!attempt) {
      attempt = new Attempt({
        user: req.user.id,
        challenge: req.params.id,
        commandHistory: [],
        objectivesCompleted: []
      });
      await attempt.save();
    }
    
    // Créer des fichiers dans le système de fichiers utilisateur pour ce défi si nécessaire
    if (Object.keys(challenge.initialFiles).length > 0) {
      const user = await User.findById(req.user.id);
      let userFilesUpdated = false;
      
      // Créer le dossier du défi s'il n'existe pas
      const challengeFolder = `/missions/${challenge._id}`;
      if (!user.filesSystem[challengeFolder]) {
        user.filesSystem[challengeFolder] = [];
        userFilesUpdated = true;
        
        // Ajouter le dossier du défi au répertoire missions s'il n'y est pas déjà
        if (!user.filesSystem['/missions'].includes(challenge._id.toString())) {
          user.filesSystem['/missions'].push(challenge._id.toString());
        }
      }
      
      // Ajouter les fichiers du défi
      for (const [path, files] of Object.entries(challenge.initialFiles)) {
        const fullPath = `${challengeFolder}${path}`;
        
        if (!user.filesSystem[fullPath]) {
          user.filesSystem[fullPath] = [...files];
          userFilesUpdated = true;
        }
      }
      
      // Ajouter le contenu des fichiers
      for (const [filePath, content] of Object.entries(challenge.initialFileContents)) {
        const fullPath = `${challengeFolder}${filePath}`;
        
        if (!user.fileContents[fullPath]) {
          user.fileContents[fullPath] = content;
          userFilesUpdated = true;
        }
      }
      
      if (userFilesUpdated) {
        await user.save();
      }
    }
    
    res.json({
      status: 'success',
      data: {
        challenge,
        attemptId: attempt._id
      }
    });
  } catch (error) {
    console.error('Erreur de récupération du défi:', error);
    res.status(500).json({
      status: 'error',
      message: 'Erreur lors de la récupération du défi'
    });
  }
});

// Valider une commande pour un défi
router.post('/:id/command', async (req, res) => {
  try {
    const { command } = req.body;
    
    if (!command) {
      return res.status(400).json({
        status: 'error',
        message: 'Commande requise'
      });
    }
    
    // Récupérer le défi
    const challenge = await Challenge.findById(req.params.id);
    if (!challenge) {
      return res.status(404).json({
        status: 'error',
        message: 'Défi non trouvé'
      });
    }
    
    // Récupérer la tentative en cours
    let attempt = await Attempt.findOne({
      user: req.user.id,
      challenge: req.params.id,
      completed: false
    });
    
    if (!attempt) {
      return res.status(404).json({
        status: 'error',
        message: 'Aucune tentative en cours trouvée'
      });
    }
    
    // Ajouter la commande à l'historique
    attempt.commandHistory.push({
      command,
      timestamp: new Date()
    });
    
    // Vérifier si la commande complète un objectif
    let objectivesUpdated = false;
    let allObjectivesCompleted = true;
    
    for (const objective of challenge.objectives) {
      // Ignorer les objectifs déjà complétés
      if (attempt.objectivesCompleted.some(obj => obj.objectiveId === objective._id.toString())) {
        continue;
      }
      
      // Évaluer la fonction de validation
      try {
        const validationFn = new Function('command', 'history', `
          return (${objective.validationFunction})(command, history);
        `);
        
        const isCompleted = validationFn(
          command, 
          attempt.commandHistory.map(h => h.command)
        );
        
        if (isCompleted) {
          attempt.objectivesCompleted.push({
            objectiveId: objective._id,
            completedAt: new Date()
          });
          objectivesUpdated = true;
        } else {
          allObjectivesCompleted = false;
        }
      } catch (error) {
        console.error('Erreur dans la fonction de validation:', error);
        allObjectivesCompleted = false;
      }
    }
    
    // Si tous les objectifs sont complétés, marquer la tentative comme terminée
    if (allObjectivesCompleted && objectivesUpdated) {
      attempt.completed = true;
      attempt.completedAt = new Date();
      attempt.score = challenge.points;
      
      // Mettre à jour le score de l'utilisateur et ajouter le défi aux défis complétés
      const user = await User.findById(req.user.id);
      
      if (!user.completedChallenges.includes(challenge._id)) {
        user.completedChallenges.push(challenge._id);
        user.score += challenge.points;
        await user.save();
      }
    }
    
    await attempt.save();
    
    res.json({
      status: 'success',
      data: {
        objectivesUpdated,
        allObjectivesCompleted,
        objectivesCompleted: attempt.objectivesCompleted
      }
    });
  } catch (error) {
    console.error('Erreur lors de la validation de commande:', error);
    res.status(500).json({
      status: 'error',
      message: 'Erreur lors de la validation de la commande'
    });
  }
});

// Utiliser un indice pour un défi (coûte des points)
router.post('/:id/hint/:hintIndex', async (req, res) => {
  try {
    const challengeId = req.params.id;
    const hintIndex = parseInt(req.params.hintIndex);
    
    // Récupérer le défi
    const challenge = await Challenge.findById(challengeId);
    if (!challenge) {
      return res.status(404).json({
        status: 'error',
        message: 'Défi non trouvé'
      });
    }
    
    // Vérifier que l'indice existe
    if (!challenge.hints[hintIndex]) {
      return res.status(404).json({
        status: 'error',
        message: 'Indice non trouvé'
      });
    }
    
    const hint = challenge.hints[hintIndex];
    
    // Récupérer l'utilisateur
    const user = await User.findById(req.user.id);
    
    // Vérifier que l'utilisateur a assez de points
    if (user.score < hint.costPoints) {
      return res.status(403).json({
        status: 'error',
        message: 'Vous n\'avez pas assez de points pour cet indice'
      });
    }
    
    // Récupérer la tentative en cours
    let attempt = await Attempt.findOne({
      user: req.user.id,
      challenge: challengeId,
      completed: false
    });
    
    if (!attempt) {
      return res.status(404).json({
        status: 'error',
        message: 'Aucune tentative en cours trouvée'
      });
    }
    
    // Vérifier si l'indice a déjà été utilisé
    if (attempt.hintsUsed.some(h => h.hintId === hint._id.toString())) {
      // Si l'indice a déjà été utilisé, pas besoin de déduire des points
      return res.json({
        status: 'success',
        data: {
          hint: hint.text
        }
      });
    }
    
    // Déduire les points et enregistrer l'utilisation
    user.score -= hint.costPoints;
    await user.save();
    
    attempt.hintsUsed.push({
      hintId: hint._id,
      usedAt: new Date()
    });
    await attempt.save();
    
    res.json({
      status: 'success',
      data: {
        hint: hint.text,
        newScore: user.score
      }
    });
  } catch (error) {
    console.error('Erreur lors de l\'utilisation d\'un indice:', error);
    res.status(500).json({
      status: 'error',
      message: 'Erreur lors de l\'utilisation de l\'indice'
    });
  }
});

// ROUTES ADMIN

// Créer un nouveau défi (admin seulement)
router.post('/', adminMiddleware, async (req, res) => {
  try {
    const {
      title,
      description,
      level,
      type,
      instructions,
      objectives,
      initialFiles,
      initialFileContents,
      points,
      hints,
      active
    } = req.body;
    
    const challenge = new Challenge({
      title,
      description,
      level,
      type,
      instructions,
      objectives: objectives || [],
      initialFiles: initialFiles || {},
      initialFileContents: initialFileContents || {},
      points: points || 100,
      hints: hints || [],
      active: active !== undefined ? active : true,
      createdBy: req.user.id
    });
    
    await challenge.save();
    
    res.status(201).json({
      status: 'success',
      data: challenge
    });
  } catch (error) {
    console.error('Erreur lors de la création du défi:', error);
    res.status(500).json({
      status: 'error',
      message: 'Erreur lors de la création du défi'
    });
  }
});

// Modifier un défi existant (admin seulement)
router.put('/:id', adminMiddleware, async (req, res) => {
  try {
    const challenge = await Challenge.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!challenge) {
      return res.status(404).json({
        status: 'error',
        message: 'Défi non trouvé'
      });
    }
    
    res.json({
      status: 'success',
      data: challenge
    });
  } catch (error) {
    console.error('Erreur lors de la modification du défi:', error);
    res.status(500).json({
      status: 'error',
      message: 'Erreur lors de la modification du défi'
    });
  }
});

// Supprimer un défi (admin seulement)
router.delete('/:id', adminMiddleware, async (req, res) => {
  try {
    const challenge = await Challenge.findByIdAndDelete(req.params.id);
    
    if (!challenge) {
      return res.status(404).json({
        status: 'error',
        message: 'Défi non trouvé'
      });
    }
    
    // Supprimer également toutes les tentatives associées
    await Attempt.deleteMany({ challenge: req.params.id });
    
    res.json({
      status: 'success',
      message: 'Défi supprimé avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la suppression du défi:', error);
    res.status(500).json({
      status: 'error',
      message: 'Erreur lors de la suppression du défi'
    });
  }
});

module.exports = router;