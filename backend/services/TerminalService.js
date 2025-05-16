// services/TerminalService.js - Version améliorée avec commandes avancées

const User = require('../models/User');
const Challenge = require('../models/Challenge');
const Attempt = require('../models/Attempt');
const path = require('path');
const socketService = require('./socketService');

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
    
    // Vérifier s'il y a des commandes combinées avec ; ou &&
    if (command.includes(';') || command.includes('&&')) {
      return await this.executeMultipleCommands(userId, command, currentDirectory, challengeId, attemptId);
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
        // Nouvelles commandes avancées
        case 'find':
          result = await this.executeFind(args, sessionData, result);
          break;
        case 'grep':
          result = await this.executeGrep(args, sessionData, result);
          break;
        case 'tree':
          result = await this.executeTree(args, sessionData, result);
          break;
        case '/':
          // Raccourci pour revenir à la racine (comme "cd /")
          result.newDirectory = '/';
          sessionData.currentDirectory = '/';
          result.output = 'Retour à la racine.';
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
   * Exécuter plusieurs commandes séparées par ; ou &&
   */
  static async executeMultipleCommands(userId, command, currentDirectory, challengeId, attemptId) {
    let commands = [];
    let conditionalExecution = false;
    
    // Déterminer le séparateur utilisé
    if (command.includes('&&')) {
      commands = command.split('&&').map(cmd => cmd.trim());
      conditionalExecution = true; // S'arrêter si une commande échoue
    } else {
      commands = command.split(';').map(cmd => cmd.trim());
      conditionalExecution = false; // Continuer même si une commande échoue
    }
    
    let lastResult = null;
    let currentDir = currentDirectory;
    
    // Exécuter chaque commande séquentiellement
    for (const cmd of commands) {
      if (cmd.trim() === '') continue;
      
      const response = await this.executeCommand(userId, cmd, currentDir, challengeId, attemptId);
      lastResult = response;
      
      // Mettre à jour le répertoire courant pour la prochaine commande
      if (response.currentDirectory) {
        currentDir = response.currentDirectory;
      }
      
      // Pour && (AND logique), arrêter si une commande échoue
      if (conditionalExecution && !response.result.success) {
        break;
      }
    }
    
    return lastResult;
  }
  
  /**
   * Résoudre un chemin relatif ou absolu
   */
  static resolvePath(targetPath, currentDirectory) {
    // Si le chemin est absolu, le renvoyer tel quel
    if (targetPath.startsWith('/')) {
      return targetPath;
    }
    
    // Si c'est ".", renvoyer le répertoire courant
    if (targetPath === '.') {
      return currentDirectory;
    }
    
    // Si c'est "..", remonter d'un niveau
    if (targetPath === '..') {
      if (currentDirectory === '/') {
        return '/'; // Déjà à la racine
      }
      
      const parts = currentDirectory.split('/').filter(Boolean);
      parts.pop();
      return '/' + parts.join('/');
    }
    
    // Pour les autres chemins relatifs, les concaténer au répertoire courant
    return currentDirectory === '/' 
      ? `/${targetPath}` 
      : `${currentDirectory}/${targetPath}`;
  }
  
  /**
   * Exécuter la commande ls avec support de chemins absolus et relatifs
   */
  static async executeLS(args, sessionData, result) {
    // Vérifier les options
    const showHidden = args.includes('-a') || args.includes('--all');
    
    // Filtrer les options pour trouver le chemin cible (s'il y en a un)
    const pathArgs = args.filter(arg => !arg.startsWith('-'));
    let targetPath = pathArgs.length > 0 ? pathArgs[0] : result.newDirectory;
    
    // Résoudre le chemin
    targetPath = this.resolvePath(targetPath, result.newDirectory);
    
    // S'assurer que le répertoire existe
    if (!sessionData.filesystem[targetPath]) {
      result.success = false;
      result.error = `Erreur: Répertoire '${targetPath}' non trouvé`;
      return result;
    }
    
    const files = sessionData.filesystem[targetPath];
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
   * Exécuter la commande cd avec support pour les chemins absolus et les raccourcis
   */
  static async executeCD(args, sessionData, result) {
    if (args.length === 0 || args[0] === '~' || args[0] === '/') {
      // Retour à la racine
      result.newDirectory = '/';
      return result;
    }
    
    const targetDir = args[0];
    
    // Gestion des chemins composés (ex: cd /home/user/docs)
    if (targetDir.includes('/') && targetDir !== '..') {
      // C'est un chemin composé, le résoudre et vérifier qu'il existe
      const fullPath = this.resolvePath(targetDir, result.newDirectory);
      
      if (sessionData.filesystem[fullPath]) {
        result.newDirectory = fullPath;
      } else {
        // Si le répertoire n'existe pas, essayer de le créer automatiquement
        try {
          await this.createPathRecursively(fullPath, sessionData, result);
          result.newDirectory = fullPath;
        } catch (error) {
          result.success = false;
          result.error = `Erreur: Répertoire '${targetDir}' non trouvé et impossible à créer: ${error.message}`;
        }
      }
      
      return result;
    }
    
    // Traitement des cas simples (.., chemin relatif)
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
      const newDir = this.resolvePath(targetDir, result.newDirectory);
        
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
   * Créer récursivement un chemin de répertoires
   */
  static async createPathRecursively(fullPath, sessionData, result) {
    // Diviser le chemin en segments
    const segments = fullPath.split('/').filter(Boolean);
    let currentPath = '';
    
    // Créer chaque segment s'il n'existe pas
    for (const segment of segments) {
      currentPath = currentPath === '' ? `/${segment}` : `${currentPath}/${segment}`;
      
      if (!sessionData.filesystem[currentPath]) {
        // Vérifier que le segment parent existe
        const parentPath = currentPath.substring(0, currentPath.lastIndexOf('/'));
        const parentDir = parentPath === '' ? '/' : parentPath;
        
        if (!sessionData.filesystem[parentDir]) {
          throw new Error(`Le répertoire parent '${parentDir}' n'existe pas`);
        }
        
        // Créer le segment
        sessionData.filesystem[parentDir].push(segment);
        sessionData.filesystem[currentPath] = [];
      }
    }
  }
  
  /**
   * Exécuter la commande mkdir avec support pour les chemins absolus
   */
  static async executeMKDIR(args, sessionData, result, user) {
    if (args.length === 0) {
      result.success = false;
      result.error = 'Erreur: Nom de dossier requis';
      return result;
    }
    
    const newFolder = args[0];
    
    // Vérifier si c'est un chemin absolu ou composé
    if (newFolder.includes('/')) {
      // Extraire le nom du dossier à créer et son répertoire parent
      const lastSlashIndex = newFolder.lastIndexOf('/');
      const parentDir = newFolder.substring(0, lastSlashIndex || 1);
      const folderName = newFolder.substring(lastSlashIndex + 1);
      
      // Résoudre le chemin du parent
      const resolvedParentDir = parentDir === '' ? '/' : 
                               this.resolvePath(parentDir, result.newDirectory);
      
      // Vérifier si le parent existe
      if (!sessionData.filesystem[resolvedParentDir]) {
        try {
          // Tenter de créer le chemin parent
          await this.createPathRecursively(resolvedParentDir, sessionData, result);
        } catch (error) {
          result.success = false;
          result.error = `Erreur: Impossible de créer le chemin parent: ${error.message}`;
          return result;
        }
      }
      
      // Vérifier que le dossier n'existe pas déjà
      if (sessionData.filesystem[resolvedParentDir].includes(folderName)) {
        result.success = false;
        result.error = `Erreur: Le dossier '${folderName}' existe déjà dans ${resolvedParentDir}`;
        return result;
      }
      
      // Créer le dossier
      const newFolderPath = resolvedParentDir === '/' ? 
                           `/${folderName}` : 
                           `${resolvedParentDir}/${folderName}`;
      
      sessionData.filesystem[resolvedParentDir].push(folderName);
      sessionData.filesystem[newFolderPath] = [];
      result.output = `Dossier '${folderName}' créé avec succès dans ${resolvedParentDir}`;
    } else {
      // Gestion standard pour un dossier dans le répertoire courant
      // Vérifier que le nom ne contient pas de caractères invalides
      if (newFolder.includes('.')) {
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
    }
    
    // Mettre à jour l'utilisateur
    user.filesSystem = { ...sessionData.filesystem };
    
    return result;
  }
  
  /**
   * Exécuter la commande cat avec support de chemins absolus
   */
  static async executeCAT(args, sessionData, result) {
    if (args.length === 0) {
      result.success = false;
      result.error = 'Erreur: Nom de fichier requis';
      return result;
    }
    
    const filename = args[0];
    
    // Résoudre le chemin du fichier
    const filePath = this.resolvePath(filename, result.newDirectory);
    const parentDir = filePath.substring(0, filePath.lastIndexOf('/'));
    const baseName = filePath.substring(filePath.lastIndexOf('/') + 1);
    
    // Vérifier si le parent existe
    if (!sessionData.filesystem[parentDir]) {
      result.success = false;
      result.error = `Erreur: Répertoire parent de '${filename}' non trouvé`;
      return result;
    }
    
    // Vérifier si le fichier existe
    if (!sessionData.filesystem[parentDir].includes(baseName)) {
      result.success = false;
      result.error = `Erreur: Fichier '${filename}' non trouvé`;
      return result;
    }
    
    // Lire le contenu du fichier
    if (sessionData.fileContents[filePath]) {
      result.output = sessionData.fileContents[filePath];
    } else {
      result.output = '(Fichier vide)';
    }
    
    return result;
  }
  
  /**
   * Exécuter la commande touch avec support de chemins absolus
   */
  static async executeTOUCH(args, sessionData, result, user) {
    if (args.length === 0) {
      result.success = false;
      result.error = 'Erreur: Nom de fichier requis';
      return result;
    }
    
    const newFile = args[0];
    
    // Vérifier si c'est un chemin absolu ou composé
    if (newFile.includes('/')) {
      // Extraire le nom du fichier à créer et son répertoire parent
      const lastSlashIndex = newFile.lastIndexOf('/');
      const parentDir = newFile.substring(0, lastSlashIndex || 1);
      const fileName = newFile.substring(lastSlashIndex + 1);
      
      // Résoudre le chemin du parent
      const resolvedParentDir = parentDir === '' ? '/' : 
                               this.resolvePath(parentDir, result.newDirectory);
      
      // Vérifier si le parent existe
      if (!sessionData.filesystem[resolvedParentDir]) {
        try {
          // Tenter de créer le chemin parent
          await this.createPathRecursively(resolvedParentDir, sessionData, result);
        } catch (error) {
          result.success = false;
          result.error = `Erreur: Impossible de créer le chemin parent: ${error.message}`;
          return result;
        }
      }
      
      // Vérifier que le fichier n'existe pas déjà
      if (sessionData.filesystem[resolvedParentDir].includes(fileName)) {
        result.success = false;
        result.error = `Erreur: Le fichier '${fileName}' existe déjà dans ${resolvedParentDir}`;
        return result;
      }
      
      // Créer le fichier
      const newFilePath = resolvedParentDir === '/' ? 
                         `/${fileName}` : 
                         `${resolvedParentDir}/${fileName}`;
      
      sessionData.filesystem[resolvedParentDir].push(fileName);
      sessionData.fileContents[newFilePath] = '';
      result.output = `Fichier '${fileName}' créé avec succès dans ${resolvedParentDir}`;
    } else {
      // Gestion standard pour un fichier dans le répertoire courant
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
    }
    
    // Mettre à jour l'utilisateur
    user.filesSystem = { ...sessionData.filesystem };
    user.fileContents = { ...sessionData.fileContents };
    
    return result;
  }
  
  /**
   * Exécuter la commande rm avec support de chemins absolus
   */
  static async executeRM(args, sessionData, result, user) {
    if (args.length === 0) {
      result.success = false;
      result.error = 'Erreur: Nom de fichier ou dossier requis';
      return result;
    }
    
    const target = args[0];
    
    // Résoudre le chemin de la cible
    const targetPath = this.resolvePath(target, result.newDirectory);
    const parentDir = targetPath.substring(0, targetPath.lastIndexOf('/'));
    const baseName = targetPath.substring(targetPath.lastIndexOf('/') + 1);
    const parentPath = parentDir === '' ? '/' : parentDir;
    
    // Vérifier si le parent existe
    if (!sessionData.filesystem[parentPath]) {
      result.success = false;
      result.error = `Erreur: Répertoire parent de '${target}' non trouvé`;
      return result;
    }
    
    // Vérifier si la cible existe
    if (!sessionData.filesystem[parentPath].includes(baseName)) {
      result.success = false;
      result.error = `Erreur: '${target}' non trouvé`;
      return result;
    }
    
    // Si c'est un dossier (pas de point dans le nom)
    if (!baseName.includes('.')) {
      // Vérifier si le dossier est vide
      if (sessionData.filesystem[targetPath] && sessionData.filesystem[targetPath].length > 0) {
        // Option -r pour supprimer récursivement
        if (args.includes('-r') || args.includes('-rf') || args.includes('--recursive')) {
          // Supprimer récursivement le contenu
          this.removeDirectoryRecursively(targetPath, sessionData);
        } else {
          result.success = false;
          result.error = `Erreur: Le dossier '${target}' n'est pas vide. Utilisez rm -r pour supprimer récursivement.`;
          return result;
        }
      }
      
      // Supprimer le dossier
      delete sessionData.filesystem[targetPath];
    } else {
      // Supprimer le fichier
      delete sessionData.fileContents[targetPath];
    }
    
    // Supprimer l'entrée du répertoire parent
    sessionData.filesystem[parentPath] = sessionData.filesystem[parentPath].filter(f => f !== baseName);
    result.output = `'${target}' supprimé avec succès`;
    
    // Mettre à jour l'utilisateur
    user.filesSystem = { ...sessionData.filesystem };
    user.fileContents = { ...sessionData.fileContents };
    
    return result;
  }
  
  /**
   * Supprimer récursivement un répertoire et son contenu
   */
  static removeDirectoryRecursively(dirPath, sessionData) {
    // Récupérer la liste des fichiers dans ce répertoire
    const contents = sessionData.filesystem[dirPath] || [];
    
    // Parcourir et supprimer chaque élément
    for (const item of contents) {
      const itemPath = dirPath === '/' ? `/${item}` : `${dirPath}/${item}`;
      
      // Si c'est un sous-répertoire, supprimer récursivement
      if (!item.includes('.') && sessionData.filesystem[itemPath]) {
        this.removeDirectoryRecursively(itemPath, sessionData);
        delete sessionData.filesystem[itemPath];
      } else {
        // Supprimer le fichier
        delete sessionData.fileContents[itemPath];
      }
    }
    
    // Vider le répertoire
    sessionData.filesystem[dirPath] = [];
  }
  
  /**
   * Exécuter la commande echo avec support de redirection vers un chemin absolu
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
    
 // Résoudre le chemin du fichier de sortie
    const outputFilePath = this.resolvePath(outputFile, result.newDirectory);
    const parentDir = outputFilePath.substring(0, outputFilePath.lastIndexOf('/'));
    const fileName = outputFilePath.substring(outputFilePath.lastIndexOf('/') + 1);
    const parentPath = parentDir === '' ? '/' : parentDir;
    
    // Vérifier si le répertoire parent existe
    if (!sessionData.filesystem[parentPath]) {
      try {
        // Tenter de créer les répertoires parents
        await this.createPathRecursively(parentPath, sessionData, result);
      } catch (error) {
        result.success = false;
        result.error = `Erreur: Impossible de créer le chemin parent: ${error.message}`;
        return result;
      }
    }
    
    // Créer le fichier s'il n'existe pas
    if (!sessionData.filesystem[parentPath].includes(fileName)) {
      sessionData.filesystem[parentPath].push(fileName);
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
   * Exécuter la commande find
   */
  static async executeFind(args, sessionData, result) {
    // Syntaxe: find [chemin] -name "[pattern]"
    let searchPath = args[0] || '.';
    let pattern = '';
    
    // Extraire le motif de recherche
    for (let i = 1; i < args.length; i++) {
      if (args[i] === '-name' && args[i+1]) {
        pattern = args[i+1].replace(/"/g, '');
        break;
      }
    }
    
    if (!pattern) {
      result.success = false;
      result.error = 'Erreur: Motif de recherche requis (-name "pattern")';
      return result;
    }
    
    // Convertir le chemin relatif en absolu si nécessaire
    const resolvedSearchPath = this.resolvePath(searchPath, result.newDirectory);
    
    // Vérifier que le chemin existe
    if (!sessionData.filesystem[resolvedSearchPath]) {
      result.success = false;
      result.error = `Erreur: Chemin de recherche '${searchPath}' non trouvé`;
      return result;
    }
    
    // Fonction récursive pour chercher dans les dossiers
    const searchResults = [];
    const searchInDirectory = (dir) => {
      if (!sessionData.filesystem[dir]) return;
      
      sessionData.filesystem[dir].forEach(file => {
        const filePath = dir === '/' ? `/${file}` : `${dir}/${file}`;
        
        // Vérifier si le fichier correspond au motif
        if (file.match(new RegExp(pattern.replace(/\*/g, '.*')))) {
          searchResults.push(filePath);
        }
        
        // Si c'est un dossier, chercher à l'intérieur
        if (!file.includes('.') && sessionData.filesystem[filePath]) {
          searchInDirectory(filePath);
        }
      });
    };
    
    searchInDirectory(resolvedSearchPath);
    result.output = searchResults.length > 0 
      ? searchResults.join('\n')
      : `Aucun fichier correspondant à "${pattern}" trouvé dans ${searchPath}`;
      
    return result;
  }
  
  /**
   * Exécuter la commande grep
   */
  static async executeGrep(args, sessionData, result) {
    // Syntaxe: grep "pattern" [fichier]
    if (args.length < 2) {
      result.success = false;
      result.error = 'Erreur: Utilisation: grep "pattern" [fichier]';
      return result;
    }
    
    const grepPattern = args[0].replace(/"/g, '');
    const grepFile = args[1];
    
    // Résoudre le chemin du fichier
    const grepFilePath = this.resolvePath(grepFile, result.newDirectory);
    
    // Vérifier si le fichier existe
    if (!sessionData.fileContents[grepFilePath]) {
      result.success = false;
      result.error = `Erreur: Fichier '${grepFile}' non trouvé ou vide`;
      return result;
    }
    
    // Chercher le motif dans le fichier
    const grepLines = sessionData.fileContents[grepFilePath].split('\n');
    const matchingLines = grepLines.filter(line => 
      line.includes(grepPattern)
    );
    
    result.output = matchingLines.length > 0
      ? matchingLines.join('\n')
      : `Aucune ligne contenant "${grepPattern}" trouvée dans ${grepFile}`;
      
    return result;
  }
  
  /**
   * Exécuter la commande tree pour afficher l'arborescence
   */
  static async executeTree(args, sessionData, result) {
    const startPath = args.length > 0 ? this.resolvePath(args[0], result.newDirectory) : result.newDirectory;
    
    // Vérifier que le chemin existe
    if (!sessionData.filesystem[startPath]) {
      result.success = false;
      result.error = `Erreur: Chemin '${startPath}' non trouvé`;
      return result;
    }
    
    let output = startPath + '\n';
    
    // Fonction récursive pour construire l'arborescence
    const buildTree = (dir, prefix = '') => {
      const items = sessionData.filesystem[dir] || [];
      const itemCount = items.length;
      
      items.forEach((item, index) => {
        const isLast = index === itemCount - 1;
        const itemPath = dir === '/' ? `/${item}` : `${dir}/${item}`;
        const isDir = !item.includes('.') && sessionData.filesystem[itemPath];
        
        // Ajouter à la sortie
        output += `${prefix}${isLast ? '└── ' : '├── '}${item}${isDir ? '/' : ''}\n`;
        
        // Récursivement afficher les sous-répertoires
        if (isDir) {
          buildTree(itemPath, `${prefix}${isLast ? '    ' : '│   '}`);
        }
      });
    };
    
    buildTree(startPath);
    result.output = output;
    
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
        
        // Résoudre le chemin du fichier crypté
        const encryptedFilePath = this.resolvePath(encryptedFile, result.newDirectory);
        
        // Vérifier si le fichier existe
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
   * Vérifier les objectifs du défi avec une validation améliorée
   */
  static async checkChallengeObjectives(command, sessionData, result, user) {
    try {
      // Récupérer le défi et la tentative
      const challenge = await Challenge.findById(sessionData.challengeId);
      let attempt = await Attempt.findById(sessionData.attemptId);
      
      if (!challenge || !attempt) {
        return result;
      }
      
      // Vérification importante: Ne pas attribuer de points si le défi a déjà été complété
      const isAlreadyCompleted = user.completedChallenges && 
                                user.completedChallenges.includes(challenge._id.toString());
      
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
      
      // Récupérer le répertoire courant actuel
      const currentDirectory = sessionData.currentDirectory;
      
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
          
          // Si l'objectif concerne "revenir à la racine", utiliser une validation améliorée
          if (objective.description.toLowerCase().includes("revenir à la racine")) {
            // Considérer l'objectif comme complété si l'utilisateur est actuellement à la racine
            // peu importe la commande utilisée (cd /, cd, /, etc.)
            if (currentDirectory === '/') {
              newlyCompletedObjectives.push({
                objectiveId: objective._id.toString(),
                completedAt: new Date()
              });
              continue;
            }
          }
          
          // Si l'objectif est de créer un fichier avec du texte, utiliser une validation améliorée
          if (objective.description.toLowerCase().includes("créer un fichier") && 
              objective.description.toLowerCase().includes("texte")) {
            
            // Extraire le nom du fichier attendu à partir de la description
            const fileNameMatch = objective.description.match(/'([^']+)'/);
            const expectedFileName = fileNameMatch ? fileNameMatch[1] : null;
            
            // Extraire le texte attendu
            const textMatch = objective.description.match(/texte\s*["']([^"']+)["']/i);
            const expectedText = textMatch ? textMatch[1] : null;
            
            if (expectedFileName && expectedText) {
              // Trouver le fichier correspondant dans le système de fichiers
              let foundFile = false;
              let hasCorrectContent = false;
              
              // Chercher dans tout le système de fichiers
              Object.keys(sessionData.fileContents).forEach(filePath => {
                const fileName = filePath.split('/').pop();
                if (fileName === expectedFileName) {
                  foundFile = true;
                  const content = sessionData.fileContents[filePath] || '';
                  hasCorrectContent = content.includes(expectedText);
                }
              });
              
              if (foundFile && hasCorrectContent) {
                newlyCompletedObjectives.push({
                  objectiveId: objective._id.toString(),
                  completedAt: new Date()
                });
                continue;
              }
            }
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
          
          // Exécuter la fonction de validation standard
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

          // Notifier les clients via Socket.io
            socketService.notifyChallengeObjectives(
                sessionData.challengeId,
                user._id.toString(),
                newlyCompletedObjectives,
                allObjectivesCompleted
            );
        
        if (allObjectivesCompleted && !attempt.completed) {
          // Marquer la tentative comme terminée
          attempt.completed = true;
          attempt.completedAt = new Date();
          attempt.score = challenge.points;
          
          // Mettre à jour le score de l'utilisateur uniquement s'il n'a jamais complété ce défi
          if (!isAlreadyCompleted) {
            // Mettre à jour le score de l'utilisateur
            user.score = (user.score || 0) + challenge.points;
            
            // Ajouter le défi aux défis complétés
            if (!user.completedChallenges) {
              user.completedChallenges = [];
            }
            
            if (!user.completedChallenges.includes(challenge._id)) {
              user.completedChallenges.push(challenge._id);
              console.log(`Points attribués à l'utilisateur pour la première complétion du défi: +${challenge.points}`);
            }
          } else {
            console.log(`Défi déjà complété auparavant, aucun point supplémentaire attribué.`);
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
  - ls [dossier] : Lister les fichiers et dossiers
  - ls -a [dossier] : Lister tous les fichiers, y compris les fichiers cachés
  - cd [dossier] : Changer de répertoire (cd / pour revenir à la racine)
  - / : Raccourci pour revenir à la racine
  - cd [chemin/complet] : Accéder directement à un chemin
  - cat [fichier] : Afficher le contenu d'un fichier
  - mkdir [dossier] : Créer un dossier
  - mkdir [chemin/complet] : Créer un dossier dans un chemin spécifique
  - touch [fichier] : Créer un fichier vide
  - touch [chemin/complet] : Créer un fichier dans un chemin spécifique
  - rm [fichier/dossier] : Supprimer un fichier ou dossier vide
  - rm -r [dossier] : Supprimer un dossier et son contenu récursivement
  - echo [texte] > [fichier] : Écrire du texte dans un fichier
  - find [chemin] -name "[pattern]" : Rechercher des fichiers
  - grep "[motif]" [fichier] : Rechercher un motif dans un fichier
  - tree [dossier] : Afficher l'arborescence du système de fichiers
  - decrypt [clé] [fichier] : Déchiffrer un fichier avec une clé
  - download [fichier] : Télécharger un fichier
  - hack [cible] : Tenter de pirater une cible
  - exploit [vulnérabilité] [cible] : Exploiter une vulnérabilité
  - clear : Effacer l'écran du terminal
  - whoami : Afficher votre identité
  - pwd : Afficher le répertoire courant
  - help : Afficher cette aide
  
  Conseils:
  - Vous pouvez utiliser des chemins absolus dans la plupart des commandes (ex: /dossier/file.txt)
  - Utilisez des commandes combinées avec ; (ex: mkdir dir; cd dir; touch file.txt)
  - Utilisez des commandes conditionnelles avec && (ex: mkdir dir && cd dir && touch file.txt)`;
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
