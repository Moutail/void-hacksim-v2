// routes/terminal.js - Version améliorée avec système de sessions

const express = require('express');
const router = express.Router();
const TerminalService = require('../services/TerminalService');

// Obtenir le système de fichiers de l'utilisateur
router.get('/filesystem', async (req, res) => {
  try {
    // Initialiser une session de terminal pour l'utilisateur
    const sessionData = await TerminalService.initializeSession(req.user.id);
    
    res.json({
      status: 'success',
      data: {
        filesystem: sessionData.filesystem,
        currentDirectory: sessionData.currentDirectory
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du système de fichiers:', error);
    res.status(500).json({
      status: 'error',
      message: 'Erreur lors de la récupération du système de fichiers',
      details: error.message
    });
  }
});

// Exécuter une commande terminal
router.post('/execute', async (req, res) => {
  try {
    const { command, currentDirectory, challengeId, attemptId } = req.body;
    
    // Vérification de la commande
    if (!command || typeof command !== 'string') {
      return res.status(400).json({
        status: 'error',
        message: 'Commande invalide ou manquante'
      });
    }
    
    const commandStr = command.trim();
    if (commandStr === '') {
      return res.status(400).json({
        status: 'error',
        message: 'Commande vide'
      });
    }
    
    // Exécuter la commande via le service
    const response = await TerminalService.executeCommand(
      req.user.id,
      commandStr,
      currentDirectory,
      challengeId,
      attemptId
    );
    
    // Envoyer la réponse
    res.json({
      status: 'success',
      data: response.result,
      filesystem: response.filesystem,
      fileContents: response.fileContents,
      currentDirectory: response.currentDirectory
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

// Récupérer l'état actuel du terminal pour un défi
router.get('/challenge/:challengeId', async (req, res) => {
  try {
    const { challengeId } = req.params;
    
    // Initialiser une session de terminal pour le défi
    const sessionData = await TerminalService.initializeSession(req.user.id, challengeId);
    
    res.json({
      status: 'success',
      data: {
        filesystem: sessionData.filesystem,
        fileContents: sessionData.fileContents,
        currentDirectory: sessionData.currentDirectory,
        attempt: sessionData.attempt,
        attemptId: sessionData.attemptId,
        completedObjectives: sessionData.completedObjectives
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'état du terminal:', error);
    res.status(500).json({
      status: 'error',
      message: 'Erreur lors de la récupération de l\'état du terminal',
      details: error.message
    });
  }
});

module.exports = router;
