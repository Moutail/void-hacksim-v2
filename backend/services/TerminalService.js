// services/TerminalService.js - Service centralisé pour la gestion du terminal

const User = require('../models/User');
const Challenge = require('../models/Challenge');
const Attempt = require('../models/Attempt');

// Cache de sessions de terminal pour éviter des requêtes répétées à la base de données
const terminalSessions = new Map();

/**
 * Service de gestion du terminal
 */
class TerminalService {
  /**
   * Initialiser une session de terminal
   * @param {string} userId - ID de l'utilisateur
   * @param {string} challengeId - ID du défi (optionnel)
   * @param {string} attemptId - ID de la tentative (optionnel)
   * @returns {Promise<Object>} - Données de la session
   */
  static async initializeSession(userId, challengeId = null, attemptId = null) {
    // Créer une clé unique pour la session
    const sessionKey = `${userId}:${challengeId || 'general'}`;
    
    // Vérifier si une session existe déjà
    if (terminalSessions.has(sessionKey)) {
      console.log(`Session existante trouvée pour ${sessionKey}`);
      return terminalSessions.get(sessionKey);
    }
    
    // Récupérer l'utilisateur
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('Utilisateur non trouvé');
    }
    
    // Préparer les données de session
    let sessionData = {
      userId,
      challengeId,
      attemptId,
      filesystem: { ...user.filesSystem } || {},
      fileContents: { ...user.fileContents } || {},
      currentDirectory: '/',
      lastAccessed: Date.now()
    };
    
    // Si on est dans un défi, initialiser avec les données du défi
    if (challengeId) {
      const challenge = await Challenge.findById(challengeId);
      if (!challenge) {
        throw new Error('Défi non trouvé');
      }
      
      // Récupérer ou créer une tentative
      let attempt;
      if (attemptId) {
        attempt = await Attempt.findById(attemptId);
      } else {
        attempt = await Attempt.findOne({
          user: userId,
          challenge: challengeId,
          completed: false
        }).sort({ startedAt: -1 });
        
        if (!attempt) {
          // Créer une nouvelle tentative
          attempt = new Attempt({
            user: userId,
            challenge: challengeId,
            startedAt: new Date()
          });
          await attempt.save();
        }
      }
      
      sessionData.attemptId = attempt._id;
      
      // Initialiser le système de fichiers avec celui du défi si c'est une nouvelle tentative
      if (!user.filesSystem || Object.keys(user.filesSystem).length === 0) {
        sessionData.filesystem = JSON.parse(JSON.stringify(challenge.initialFiles || {}));
        sessionData.fileContents = JSON.parse(JSON.stringify(challenge.initialFileContents || {}));
        
        // Sauvegarder dans l'utilisateur
        user.filesSystem = sessionData.filesystem;
        user.fileContents = sessionData.fileContents;
        await user.save();
      }
      
      // Récupérer les objectifs complétés
      const completedObjectiveIds = attempt.objectivesCompleted
        ? attempt.objectivesCompleted.map(obj => obj.objectiveId)
        : [];
        
      sessionData.completedObjectives = completedObjectiveIds;
      sessionData.attempt = attempt;
    }
    
    // Stocker la session
    terminalSessions.set(sessionKey, sessionData);
    console.log(`Nouvelle session créée pour ${sessionKey}`);
    
    return sessionData;
  }
  
  /**
   * Exécuter une commande dans le terminal
   * @param {string} userId - ID de l'utilisateur
   * @param {string} command - Commande à exécuter
   * @param {string} currentDirectory - Répertoire courant
   * @param {string} challengeId - ID du défi (optionnel)
   * @param {string} attemptId - ID de la tentative (optionnel)
   * @returns {Promise<Object>} - Résultat de la commande
   */
  static async executeCommand(userId, command, currentDirectory, challengeId = null, attemptId = null) {
    const sessionKey = `${userId}:${challengeId || 'general'}`;
    
    // Récupérer ou initialiser la session
    let sessionData;
    if (terminalSessions.has(sessionKey)) {
      sessionData = terminalSessions.get(sessionKey);
      sessionData.currentDirectory = currentDirectory; // Mettre à jour le répertoire courant
    } else {
      sessionData = await this.initializeSession(userId, challengeId, attemptId);
    }
    
    // Récupérer l'utilisateur (pour sauvegarder les modifications plus tard)
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('Utilisateur non trouvé');
    }
    
    // Préparer le résultat
    let result = {
      command,
      output: '',
      newDirectory: currentDirectory,
      success: true,
      error: null,
      objectivesUpdated: false,
      objectivesCompleted: []
    };
    
    // Traiter la commande
    const commandParts = command.trim().split(/\s+/);
    const cmd = commandParts[0].toLowerCase();
    const args = commandParts.slice(1);
    
    // Exécuter la commande appropriée
    try {
      switch (cmd) {
        case 'ls':
          result = await this.executeLS(args, sessionData, result);
          break;
        case 'cd':
          result = await this.executeCD(args, sessionData, result);
          break;
        case 'mkdir':
          result = await this.executeMKDIR(args, sessionData, result, user);
          break;
        case 'cat':
          result = await this.executeCAT(args, sessionData, result);
          break;
        case 'touch':
          result = await this.executeTOUCH(args, sessionData, result, user);
          break;
        case 'rm':
          result = await this.executeRM(args, sessionData, result, user);
          break;
        case 'echo':
          result = await this.executeECHO(command, sessionData, result, user);
          break;
        case 'pwd':
          result.output = result.newDirectory;
          break;
        case 'whoami':
          result.output = `Utilisateur: ${user.username}\nScore: ${user.score} points\nRôle: ${user.role}`;
          break;
        case 'help':
          result.output = this.getHelpText();
          break;
        // Commandes spéciales
        case 'decrypt':
        case 'download':
        case 'hack':
        case 'exploit':
          result = await this.executeSpecialCommand(cmd, args, sessionData, result);
          break;
        case 'clear':
          // Cette commande ne fait rien côté serveur
          result.output = '';
          break;
        default:
          result.success = false;
          result.error = `Commande '${cmd}' non reconnue. Utilisez 'help' pour voir les commandes disponibles.`;
      }
      
      // Sauvegarder la commande dans l'historique
      if (!user.commandHistory) {
        user.commandHistory = [];
      }
      user.commandHistory.push(command);
      
      // Si nous sommes dans un défi, vérifier les objectifs
      if (challengeId && sessionData.attemptId) {
        result = await this.checkChallengeObjectives(command, sessionData, result, user);
      }
      
      // Mettre à jour la session
      sessionData.lastAccessed = Date.now();
      terminalSessions.set(sessionKey, sessionData);
      
      // Sauvegarder les modifications de l'utilisateur
      await user.save();
      
      return {
        result,
        filesystem: sessionData.filesystem,
        fileContents: sessionData.fileContents,
        currentDirectory: sessionData.currentDirectory
      };
    } catch (error) {
      console.error('Erreur lors de l\'exécution de la commande:', error);
      result.success = false;
      result.error = error.message;
      return { result };
    }
  }
  
  /**
   * Exécuter la commande ls
   */
  static async executeLS(args, sessionData, result) {
    // Vérifier les options
    const showHidden = args.includes('-a') || args.includes('--all');
    
    // S'assurer que le répertoire existe
    if (!sessionData.filesystem[result.newDirectory]) {
      sessionData.filesystem[result.newDirectory] = [];
    }
    
    const files = sessionData.filesystem[result.newDirectory];
    if (files.length === 0) {
      result.output = 'Répertoire vide';
    } else {
      const fileList = [];
      const dirList = [];
      
      files.forEach(file => {
        // Si le fichier est caché et que showHidden est false, ignorer
        if (file.startsWith('.') && !showHidden) {
          return;
        }
        
        // Vérifier si c'est un dossier
        if (!file.includes('.')) {
          dirList.push(`📁 ${file}`);
        } else {
          fileList.push(`📄 ${file}`);
        }
      });
      
      result.output = [...dirList, ...fileList].join('\n');
    }
    
    return result;
  }
  
  /**
   * Exécuter la commande cd
   */
  static async executeCD(args, sessionData, result) {
    if (args.length === 0) {
      result.newDirectory = '/';
      return result;
    }
    
    const targetDir = args[0];
    
    if (targetDir === '..') {
      // Remonter d'un niveau
      if (result.newDirectory === '/') {
        // Déjà à la racine
        return result;
      }
      
      const pathParts = result.newDirectory.split('/').filter(Boolean);
      pathParts.pop();
      result.newDirectory = '/' + pathParts.join('/');
      if (result.newDirectory === '') result.newDirectory = '/';
    } else if (targetDir.startsWith('/')) {
      // Chemin absolu
      if (sessionData.filesystem[targetDir]) {
        result.newDirectory = targetDir;
      } else {
        result.success = false;
        result.error = `Erreur: Répertoire '${targetDir}' non trouvé`;
      }
    } else {
      // Chemin relatif
      const newDir = result.newDirectory === '/' 
        ? `/${targetDir}`
        : `${result.newDirectory}/${targetDir}`;
        
      if (sessionData.filesystem[newDir]) {
        result.newDirectory = newDir;
      } else {
        result.success = false;
        result.error = `Erreur: Répertoire '${targetDir}' non trouvé`;
      }
    }
    
    // Mettre à jour le répertoire courant dans la session
    sessionData.currentDirectory = result.newDirectory;
    
    return result;
  }
  
  /**
   * Exécuter la commande mkdir
   */
  static async executeMKDIR(args, sessionData, result, user) {
    if (args.length === 0) {
      result.success = false;
      result.error = 'Erreur: Nom de dossier requis';
      return result;
    }
    
    const newFolder = args[0];
    
    // Vérifier que le nom ne contient pas de caractères invalides
    if (newFolder.includes('/') || newFolder.includes('.')) {
      result.success = false;
      result.error = 'Erreur: Nom de dossier invalide';
      return result;
    }
    
    // S'assurer que le répertoire parent existe
    if (!sessionData.filesystem[result.newDirectory]) {
      sessionData.filesystem[result.newDirectory] = [];
    }
    
    const currentDirFiles = sessionData.filesystem[result.newDirectory];
    
    // Vérifier si le dossier existe déjà
    if (currentDirFiles.includes(newFolder)) {
      result.success = false;
      result.error = `Erreur: Le dossier '${newFolder}' existe déjà`;
      return result;
    }
    
    // Créer le dossier
    const newFolderPath = result.newDirectory === '/' 
      ? `/${newFolder}`
      : `${result.newDirectory}/${newFolder}`;
      
    sessionData.filesystem[result.newDirectory].push(newFolder);
    sessionData.filesystem[newFolderPath] = [];
    result.output = `Dossier '${newFolder}' créé avec succès`;
    
    // Mettre à jour l'utilisateur
    user.filesSystem = { ...sessionData.filesystem };
    
    return result;
  }
  
  /**
   * Exécuter la commande cat
   */
  static async executeCAT(args, sessionData, result) {
    if (args.length === 0) {
      result.success = false;
      result.error = 'Erreur: Nom de fichier requis';
      return result;
    }
    
    const filename = args[0];
    const currentFiles = sessionData.filesystem[result.newDirectory] || [];
    
    if (!currentFiles.includes(filename)) {
      result.success = false;
      result.error = `Erreur: Fichier '${filename}' non trouvé`;
      return result;
    }
    
    const filePath = result.newDirectory === '/' 
      ? `/${filename}`
      : `${result.newDirectory}/${filename}`;
      
    if (sessionData.fileContents[filePath]) {
      result.output = sessionData.fileContents[filePath];
    } else {
      result.output = '(Fichier vide)';
    }
    
    return result;
  }
  
  /**
   * Exécuter la commande touch
   */
  static async executeTOUCH(args, sessionData, result, user) {
    if (args.length === 0) {
      result.success = false;
      result.error = 'Erreur: Nom de fichier requis';
      return result;
    }
    
    const newFile = args[0];
    
    // Vérifier que le nom ne contient pas de caractères invalides
    if (newFile.includes('/')) {
      result.success = false;
      result.error = 'Erreur: Nom de fichier invalide';
      return result;
    }
    
    const dirFiles = sessionData.filesystem[result.newDirectory] || [];
    
    // Vérifier si le fichier existe déjà
    if (dirFiles.includes(newFile)) {
      result.success = false;
      result.error = `Erreur: Le fichier '${newFile}' existe déjà`;
      return result;
    }
    
    // Créer le fichier
    const newFilePath = result.newDirectory === '/' 
      ? `/${newFile}`
      : `${result.newDirectory}/${newFile}`;
      
    sessionData.filesystem[result.newDirectory].push(newFile);
    sessionData.fileContents[newFilePath] = '';
    result.output = `Fichier '${newFile}' créé avec succès`;
    
    // Mettre à jour l'utilisateur
    user.filesSystem = { ...sessionData.filesystem };
    user.fileContents = { ...sessionData.fileContents };
    
    return result;
  }
  
  /**
   * Exécuter la commande rm
   */
  static async executeRM(args, sessionData, result, user) {
    if (args.length === 0) {
      result.success = false;
      result.error = 'Erreur: Nom de fichier ou dossier requis';
      return result;
    }
    
    const target = args[0];
    const filesInDir = sessionData.filesystem[result.newDirectory] || [];
    
    if (!filesInDir.includes(target)) {
      result.success = false;
      result.error = `Erreur: '${target}' non trouvé`;
      return result;
    }
    
    const targetPath = result.newDirectory === '/' 
      ? `/${target}`
      : `${result.newDirectory}/${target}`;
      
    // Si c'est un dossier (pas de point dans le nom)
    if (!target.includes('.')) {
      // Vérifier si le dossier est vide
      if (sessionData.filesystem[targetPath] && sessionData.filesystem[targetPath].length > 0) {
        result.success = false;
        result.error = `Erreur: Le dossier '${target}' n'est pas vide`;
        return result;
      }
      
      // Supprimer le dossier
      delete sessionData.filesystem[targetPath];
    } else {
      // Supprimer le fichier
      delete sessionData.fileContents[targetPath];
    }
    
    // Supprimer l'entrée du répertoire parent
    sessionData.filesystem[result.newDirectory] = filesInDir.filter(f => f !== target);
    result.output = `'${target}' supprimé avec succès`;
    
    // Mettre à jour l'utilisateur
    user.filesSystem = { ...sessionData.filesystem };
    user.fileContents = { ...sessionData.fileContents };
    
    return result;
  }
  
  /**
   * Exécuter la commande echo
   */
  static async executeECHO(command, sessionData, result, user) {
    const commandStr = command.trim();
    
    // Trouver l'index du redirecteur >
    const redirectIndex = commandStr.indexOf('>');
    
    if (redirectIndex === -1) {
      // Écho simple sans redirection
      result.output = commandStr.substring(5);  // Supprimer 'echo '
      return result;
    }
    
    // Extraire le texte et le nom de fichier
    const text = commandStr.substring(5, redirectIndex).trim();
    const outputFile = commandStr.substring(redirectIndex + 1).trim();
    
    if (!outputFile) {
      result.success = false;
      result.error = 'Erreur: Nom de fichier requis pour la redirection';
      return result;
    }
    
    // S'assurer que le répertoire existe
    if (!sessionData.filesystem[result.newDirectory]) {
      sessionData.filesystem[result.newDirectory] = [];
    }
    
    const dirFilesList = sessionData.filesystem[result.newDirectory];
    const outputFilePath = result.newDirectory === '/' 
      ? `/${outputFile}`
      : `${result.newDirectory}/${outputFile}`;
      
    // Créer le fichier s'il n'existe pas
    if (!dirFilesList.includes(outputFile)) {
      sessionData.filesystem[result.newDirectory].push(outputFile);
    }
    
    // Écrire dans le fichier
    sessionData.fileContents[outputFilePath] = text;
    result.output = `Texte écrit dans '${outputFile}'`;
    
    // Mettre à jour l'utilisateur
    user.filesSystem = { ...sessionData.filesystem };
    user.fileContents = { ...sessionData.fileContents };
    
    return result;
  }
  
  /**
   * Exécuter des commandes spéciales (decrypt, download, hack, exploit)
   */
  static async executeSpecialCommand(cmd, args, sessionData, result) {
    switch (cmd) {
      case 'decrypt':
        if (args.length < 2) {
          result.success = false;
          result.error = 'Erreur: Utilisation: decrypt [clé] [fichier]';
          return result;
        }
        
        const decryptKey = args[0];
        const encryptedFile = args[1];
        
        // Vérifier si le fichier existe
        const encryptedFilePath = encryptedFile.startsWith('/')
          ? encryptedFile
          : result.newDirectory === '/'
            ? `/${encryptedFile}`
            : `${result.newDirectory}/${encryptedFile}`;
        
        if (!sessionData.fileContents[encryptedFilePath]) {
          result.success = false;
          result.error = `Erreur: Fichier '${encryptedFile}' non trouvé`;
          return result;
        }
        
        // Simuler le déchiffrement
        if (decryptKey === 'V01D-S3CR3T') {
          result.output = `Fichier ${encryptedFile} déchiffré avec succès.\n\nCONTENU DÉCHIFFRÉ:\n-----------------\nMISSION: VOID SHIELD\nPriority: A1\n\nCible identifiée. Procédez à l'extraction des données comme convenu.\nCoordonnées: 47.2184° N, 8.9774° E\nCode d'accès aux serveurs: SV-1337-42\n\nDétruisez ces données après lecture.\n\nVOID SEC COMMAND`;
        } else {
          result.success = false;
          result.error = `Erreur de déchiffrement: Clé invalide pour ${encryptedFile}`;
        }
        break;
      
      case 'download':
        if (args.length < 1) {
          result.success = false;
          result.error = 'Erreur: Utilisation: download [fichier]';
          return result;
        }
        
        const downloadFile = args[0];
        result.output = `Téléchargement de ${downloadFile} terminé.\n\nMD5: a9b7f32e8c4d01b6f97e21f5d8b54e8a\nSHA-1: 7b6ef2c8a90e41b9d87f96a2d24e3f96c5ae94d8\nTaille: ${args[1] || '1.2 MB'}`;
        break;
      
      case 'hack':
        if (args.length < 1) {
          result.success = false;
          result.error = 'Erreur: Utilisation: hack [cible]';
          return result;
        }
        
        const hackTarget = args[0];
        result.output = `Systèmes de ${hackTarget} compromis.\n\nAccès root obtenu.\nServices vulnérables identifiés: ssh, ftp, http\nMots de passe récupérés: 3\nConnexions établies: 2\nBackdoor installée sur port: 4444`;
        break;
      
      case 'exploit':
        if (args.length < 2) {
          result.success = false;
          result.error = 'Erreur: Utilisation: exploit [vulnérabilité] [cible]';
          return result;
        }
        
        const exploitVulnerability = args[0];
        const exploitTarget = args[1];
        
        if (exploitVulnerability === 'CVE-2025-1234' && exploitTarget === '10.0.0.5') {
          result.output = `Exploitation de ${exploitVulnerability} sur ${exploitTarget} réussie.\n\nPrivilèges élevés: root\nAccès au système de fichiers: complet\nConnexion persistante établie\nDonnées récupérées: 143 fichiers\nEmpreinte système minimisée`;
        } else {
          result.success = false;
          result.error = `Erreur d'exploitation: ${exploitVulnerability} non compatible avec ${exploitTarget} ou vulnérabilité non trouvée`;
        }
        break;
    }
    
    return result;
  }
  
  /**
   * Vérifier les objectifs du défi
   */
  static async checkChallengeObjectives(command, sessionData, result, user) {
    try {
      // Récupérer le défi et la tentative
      const challenge = await Challenge.findById(sessionData.challengeId);
      let attempt = await Attempt.findById(sessionData.attemptId);
      
      if (!challenge || !attempt) {
        return result;
      }
      
      // Ajouter la commande à l'historique de la tentative
      attempt.commandHistory.push({
        command,
        timestamp: new Date()
      });
      
      // Récupérer l'historique complet des commandes pour cette tentative
      const commandHistory = attempt.commandHistory.map(item => item.command);
      
      // Récupérer les objectifs déjà complétés
      const completedObjectiveIds = attempt.objectivesCompleted
        ? attempt.objectivesCompleted.map(obj => obj.objectiveId)
        : [];
      
      // Vérifier si des objectifs sont complétés avec cette commande
      const newlyCompletedObjectives = [];
      
      for (const objective of challenge.objectives) {
        // Ignorer les objectifs déjà complétés
        if (completedObjectiveIds.includes(objective._id.toString())) {
          continue;
        }
        
        try {
          // Vérifier si la chaîne de fonction est valide
          if (!objective.validationFunction || typeof objective.validationFunction !== 'string') {
            console.log(`Fonction de validation invalide pour l'objectif: ${objective.description}`);
            continue;
          }
          
          // Assurez-vous que la fonction commence par "function"
          let functionStr = objective.validationFunction.trim();
          if (!functionStr.startsWith('function')) {
            // Si ce n'est pas une fonction nommée, essayons de la corriger
            functionStr = `function validateObjective(command, history) {
              ${functionStr}
            }`;
          }
          
          // Créer une fonction à partir de la chaîne
          const validationFunction = new Function('command', 'history', `
            return (${functionStr})(command, history);
          `);
          
          // Exécuter la fonction de validation
          const isCompleted = validationFunction(command, commandHistory);
          
          if (isCompleted) {
            // Marquer l'objectif comme complété
            console.log(`Objectif complété: ${objective.description}`);
            newlyCompletedObjectives.push({
              objectiveId: objective._id.toString(),
              completedAt: new Date()
            });
          }
        } catch (validationError) {
          console.error(`Erreur lors de la validation de l'objectif "${objective.description}":`, validationError);
        }
      }
      
      // Mettre à jour les objectifs complétés
      if (newlyCompletedObjectives.length > 0) {
        // Marquer les objectifs comme complétés
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
          if (!user.completedChallenges) {
            user.completedChallenges = [];
          }
          
          if (!user.completedChallenges.includes(challenge._id)) {
            user.completedChallenges.push(challenge._id);
          }
        }
        
        // Mettre à jour le résultat
        result.objectivesUpdated = true;
        result.objectivesCompleted = newlyCompletedObjectives;
        result.allObjectivesCompleted = allObjectivesCompleted;
      }
      
      // Sauvegarder la tentative
      await attempt.save();
    } catch (error) {
      console.error('Erreur lors de la vérification des objectifs:', error);
    }
    
    return result;
  }
  
  /**
   * Obtenir le texte d'aide
   */
  static getHelpText() {
    return `Commandes disponibles:
  - ls : Lister les fichiers et dossiers
  - ls -a : Lister tous les fichiers, y compris les fichiers cachés
  - cd [dossier] : Changer de répertoire
  - cat [fichier] : Afficher le contenu d'un fichier
  - mkdir [dossier] : Créer un dossier
  - touch [fichier] : Créer un fichier vide
  - rm [fichier/dossier] : Supprimer un fichier ou dossier
  - echo [texte] > [fichier] : Écrire du texte dans un fichier
  - find [chemin] -name "[pattern]" : Rechercher des fichiers
  - grep "[motif]" [fichier] : Rechercher un motif dans un fichier
  - history [nombre] : Afficher l'historique des commandes
  - decrypt [clé] [fichier] : Déchiffrer un fichier avec une clé
  - download [fichier] : Télécharger un fichier
  - hack [cible] : Tenter de pirater une cible
  - exploit [vulnérabilité] [cible] : Exploiter une vulnérabilité
  - clear : Effacer l'écran du terminal
  - whoami : Afficher votre identité
  - pwd : Afficher le répertoire courant
  - help : Afficher cette aide`;
  }
  
  /**
   * Nettoyer les sessions inactives
   */
  static cleanupSessions() {
    const now = Date.now();
    const sessionTimeout = 30 * 60 * 1000; // 30 minutes
    
    for (const [key, session] of terminalSessions.entries()) {
      if (now - session.lastAccessed > sessionTimeout) {
        console.log(`Nettoyage de la session inactive: ${key}`);
        terminalSessions.delete(key);
      }
    }
  }
}

// Nettoyer les sessions inactives toutes les 15 minutes
setInterval(TerminalService.cleanupSessions, 15 * 60 * 1000);

module.exports = TerminalService;