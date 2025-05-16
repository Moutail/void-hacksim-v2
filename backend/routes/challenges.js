// routes/challenges.js - Version améliorée avec prise en charge flexible des objectifs

const express = require('express');
const router = express.Router();
const Challenge = require('../models/Challenge');
const Attempt = require('../models/Attempt');
const User = require('../models/User');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

// GET - Récupérer tous les défis
router.get('/', authMiddleware, async (req, res) => {
  try {
    const challenges = await Challenge.find({ active: true }).select('title description level type points');
    
    // Récupérer les tentatives de l'utilisateur pour chaque défi
    const completedChallenges = new Set();
    const attempts = await Attempt.find({ 
      user: req.user.id,
      completed: true 
    });
    
    attempts.forEach(attempt => {
      completedChallenges.add(attempt.challenge.toString());
    });
    
    // Ajouter l'information isCompleted à chaque défi
    const challengesWithStatus = challenges.map(challenge => {
      const isCompleted = completedChallenges.has(challenge._id.toString());
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
    console.error('Erreur lors de la récupération des défis:', error);
    res.status(500).json({
      status: 'error',
      message: 'Erreur lors de la récupération des défis',
      details: error.message
    });
  }
});

// GET - Récupérer un défi spécifique
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const challenge = await Challenge.findById(req.params.id);
    
    if (!challenge) {
      return res.status(404).json({
        status: 'error',
        message: 'Défi non trouvé'
      });
    }
    
    // Trouver une tentative en cours ou créer une nouvelle
    let attempt = await Attempt.findOne({
      user: req.user.id,
      challenge: challenge._id,
      completed: false
    }).sort({ startedAt: -1 });
    
    // Si aucune tentative en cours, vérifier s'il y a une tentative complétée
    if (!attempt) {
      const completedAttempt = await Attempt.findOne({
        user: req.user.id,
        challenge: challenge._id,
        completed: true
      }).sort({ completedAt: -1 });
      
      if (completedAttempt) {
        attempt = completedAttempt;
      } else {
        // Créer une nouvelle tentative
        attempt = new Attempt({
          user: req.user.id,
          challenge: challenge._id,
          startedAt: new Date()
        });
        
        await attempt.save();
      }
    }
    
    // Récupérer la liste des objectifs complétés
    const completedObjectiveIds = attempt.objectivesCompleted
      ? attempt.objectivesCompleted.map(obj => obj.objectiveId)
      : [];
    
    // Copier les objectifs pour éviter de modifier l'original
    const objectivesWithStatus = challenge.objectives.map(objective => {
      const objectiveObj = { ...objective.toObject() };
      objectiveObj.completed = completedObjectiveIds.includes(objectiveObj._id.toString());
      
      // Ne pas envoyer le code de validation au client
      delete objectiveObj.validationFunction;
      
      return objectiveObj;
    });
    
    res.json({
      status: 'success',
      data: {
        challenge: {
          ...challenge.toObject(),
          objectives: objectivesWithStatus
        },
        attemptId: attempt._id
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du défi:', error);
    res.status(500).json({
      status: 'error',
      message: 'Erreur lors de la récupération du défi',
      details: error.message
    });
  }
});

// POST - Exécuter une commande pour un défi spécifique
router.post('/:id/command', authMiddleware, async (req, res) => {
  try {
    const { command } = req.body;
    
    if (!command) {
      return res.status(400).json({
        status: 'error',
        message: 'Commande requise'
      });
    }
    
    // Récupérer l'utilisateur
    const user = await User.findById(req.user.id);
    
    // Récupérer le défi
    const challenge = await Challenge.findById(req.params.id);
    
    if (!challenge) {
      return res.status(404).json({
        status: 'error',
        message: 'Défi non trouvé'
      });
    }
    
    // Trouver ou créer une tentative
    let attempt = await Attempt.findOne({
      user: req.user.id,
      challenge: challenge._id,
      completed: false
    }).sort({ startedAt: -1 });
    
    if (!attempt) {
      attempt = new Attempt({
        user: req.user.id,
        challenge: challenge._id,
        startedAt: new Date()
      });
    }
    
    // Ajouter la commande à l'historique
    attempt.commandHistory.push({
      command,
      timestamp: new Date()
    });
    
    // Récupérer l'historique des commandes
    const commandHistory = attempt.commandHistory.map(entry => entry.command);
    
    // Récupérer les objectifs déjà complétés
    const completedObjectiveIds = attempt.objectivesCompleted
      ? attempt.objectivesCompleted.map(obj => obj.objectiveId)
      : [];
    
    // Vérifier si des objectifs sont complétés avec cette commande
    let objectivesUpdated = false;
    const newlyCompletedObjectives = [];
    
    for (const objective of challenge.objectives) {
      // Ignorer les objectifs déjà complétés
      if (completedObjectiveIds.includes(objective._id.toString())) {
        continue;
      }
      
      try {
        // Vérifier si l'objectif est complété avec cette commande
        const validationFunction = new Function('command', 'history', objective.validationFunction);
        
        const isCompleted = validationFunction(command, commandHistory);
        
        if (isCompleted) {
          console.log(`Objectif complété: ${objective.description}`);
          objectivesUpdated = true;
          
          // Ajouter à la liste des objectifs nouvellement complétés
          newlyCompletedObjectives.push({
            objectiveId: objective._id.toString(),
            completedAt: new Date()
          });
        }
      } catch (error) {
        console.error(`Erreur lors de la validation de l'objectif "${objective.description}":`, error);
      }
    }
    
    // Mettre à jour les objectifs complétés
    if (newlyCompletedObjectives.length > 0) {
      attempt.objectivesCompleted = [
        ...attempt.objectivesCompleted || [],
        ...newlyCompletedObjectives
      ];
      
      // Vérifier si tous les objectifs sont complétés
      const allObjectivesCompleted = challenge.objectives.length === 
        attempt.objectivesCompleted.length;
      
      if (allObjectivesCompleted && !attempt.completed) {
        // Marquer la tentative comme terminée
        attempt.completed = true;
        attempt.completedAt = new Date();
        attempt.score = challenge.points;
        
        // Mettre à jour le score de l'utilisateur
        user.score = (user.score || 0) + challenge.points;
        
        // Ajouter le défi aux défis complétés
        if (!user.completedChallenges.includes(challenge._id)) {
          user.completedChallenges.push(challenge._id);
        }
        
        await user.save();
      }
    }
    
    // Sauvegarder la tentative
    await attempt.save();
    
    // Traiter la commande et renvoyer le résultat
    res.json({
      status: 'success',
      data: {
        objectivesUpdated,
        objectivesCompleted: newlyCompletedObjectives,
        allObjectivesCompleted: challenge.objectives.length === attempt.objectivesCompleted.length
      }
    });
  } catch (error) {
    console.error('Erreur lors de l\'exécution de la commande:', error);
    res.status(500).json({
      status: 'error',
      message: 'Erreur lors de l\'exécution de la commande',
      details: error.message
    });
  }
});

// Récupérer un indice
router.post('/:id/hint/:hintIndex', authMiddleware, async (req, res) => {
  try {
    const { id, hintIndex } = req.params;
    
    // Récupérer le défi
    const challenge = await Challenge.findById(id);
    
    if (!challenge) {
      return res.status(404).json({
        status: 'error',
        message: 'Défi non trouvé'
      });
    }
    
    // Vérifier si l'indice existe
    const index = parseInt(hintIndex);
    
    if (isNaN(index) || index < 0 || index >= challenge.hints.length) {
      return res.status(400).json({
        status: 'error',
        message: 'Indice invalide'
      });
    }
    
    const hint = challenge.hints[index];
    
    // Récupérer ou créer une tentative
    let attempt = await Attempt.findOne({
      user: req.user.id,
      challenge: challenge._id,
      completed: false
    }).sort({ startedAt: -1 });
    
    if (!attempt) {
      attempt = new Attempt({
        user: req.user.id,
        challenge: challenge._id,
        startedAt: new Date()
      });
    }
    
    // Vérifier si l'indice a déjà été utilisé
    const hintAlreadyUsed = attempt.hintsUsed && 
      attempt.hintsUsed.some(h => h.hintId === index.toString());
    
    if (!hintAlreadyUsed) {
      // Déduire les points du score de l'utilisateur
      const user = await User.findById(req.user.id);
      
      if (user.score < hint.costPoints) {
        return res.status(400).json({
          status: 'error',
          message: `Vous n'avez pas assez de points pour utiliser cet indice (${hint.costPoints} points nécessaires)`
        });
      }
      
      // Déduire les points
      user.score -= hint.costPoints;
      await user.save();
      
      // Marquer l'indice comme utilisé
      if (!attempt.hintsUsed) {
        attempt.hintsUsed = [];
      }
      
      attempt.hintsUsed.push({
        hintId: index.toString(),
        usedAt: new Date()
      });
      
      await attempt.save();
    }
    
    res.json({
      status: 'success',
      data: {
        hint: hint.text,
        costPoints: hintAlreadyUsed ? 0 : hint.costPoints
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'indice:', error);
    res.status(500).json({
      status: 'error',
      message: 'Erreur lors de la récupération de l\'indice',
      details: error.message
    });
  }
});

module.exports = router;
