// routes/terminal.js
const express = require('express');
const User = require('../models/User');
const router = express.Router();

// Obtenir le système de fichiers de l'utilisateur
router.get('/filesystem', async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'Utilisateur non trouvé'
      });
    }
    
    res.json({
      status: 'success',
      data: {
        filesystem: user.filesSystem,
        currentDirectory: '/'
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du système de fichiers:', error);
    res.status(500).json({
      status: 'error',
      message: 'Erreur lors de la récupération du système de fichiers'
    });
  }
});

// Exécuter une commande terminal
router.post('/execute', async (req, res) => {
  try {
    const { command, currentDirectory } = req.body;
    
    if (!command) {
      return res.status(400).json({
        status: 'error',
        message: 'Commande requise'
      });
    }
    
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'Utilisateur non trouvé'
      });
    }
    
    // Diviser la commande en parties
    const parts = command.trim().split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);
    
    // Préparer le résultat
    let result = {
      command,
      output: '',
      newDirectory: currentDirectory || '/',
      success: true,
      error: null
    };
    
    // Traiter la commande
    switch (cmd) {
      case 'help':
        result.output = `Commandes disponibles:
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
        break;
        
      case 'ls':
        // Vérifier les options
        const showHidden = args.includes('-a') || args.includes('--all');
        
        // Lister les fichiers du répertoire courant
        if (!user.filesSystem[result.newDirectory]) {
          result.success = false;
          result.error = `Erreur: Répertoire '${result.newDirectory}' non trouvé`;
          break;
        }
        
        const files = user.filesSystem[result.newDirectory];
        if (files.length === 0) {
          result.output = 'Répertoire vide';
        } else {
          const fileList = [];
          const dirList = [];
          
          files.forEach(file => {
            // Si le fichier est caché (commence par .) et que showHidden est false, ignorer
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
        break;
       
      case 'find':
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
          break;
        }
        
        // Convertir le chemin relatif en absolu si nécessaire
        if (searchPath === '.') {
          searchPath = result.newDirectory;
        } else if (!searchPath.startsWith('/')) {
          searchPath = result.newDirectory === '/' 
            ? `/${searchPath}`
            : `${result.newDirectory}/${searchPath}`;
        }
        
        // Fonction récursive pour chercher dans les dossiers
        const searchResults = [];
        const searchInDirectory = (dir) => {
          if (!user.filesSystem[dir]) return;
          
          user.filesSystem[dir].forEach(file => {
            const filePath = dir === '/' ? `/${file}` : `${dir}/${file}`;
            
            // Vérifier si le fichier correspond au motif
            if (file.match(new RegExp(pattern.replace(/\*/g, '.*')))) {
              searchResults.push(filePath);
            }
            
            // Si c'est un dossier, chercher à l'intérieur
            if (!file.includes('.') && user.filesSystem[filePath]) {
              searchInDirectory(filePath);
            }
          });
        };
        
        searchInDirectory(searchPath);
        result.output = searchResults.length > 0 
          ? searchResults.join('\n')
          : `Aucun fichier correspondant à "${pattern}" trouvé dans ${searchPath}`;
        break;

      case 'history':
        // Afficher l'historique des commandes
        const historyLimit = args[0] ? parseInt(args[0]) : 10;
        const historyList = user.commandHistory || [];
        const limitedHistory = historyList.slice(-historyLimit);
        
        result.output = limitedHistory.length > 0
          ? limitedHistory.map((cmd, i) => `${i + 1}  ${cmd}`).join('\n')
          : 'Historique vide';
        break;

      case 'grep':
        // Syntaxe: grep "pattern" [fichier]
        if (args.length < 2) {
          result.success = false;
          result.error = 'Erreur: Utilisation: grep "pattern" [fichier]';
          break;
        }
        
        const grepPattern = args[0].replace(/"/g, '');
        const grepFile = args[1];
        
        // Vérifier si le fichier existe
        const grepFilePath = grepFile.startsWith('/')
          ? grepFile
          : result.newDirectory === '/'
            ? `/${grepFile}`
            : `${result.newDirectory}/${grepFile}`;
        
        if (!user.fileContents[grepFilePath]) {
          result.success = false;
          result.error = `Erreur: Fichier '${grepFile}' non trouvé ou vide`;
          break;
        }
        
        // Chercher le motif dans le fichier
        const grepLines = user.fileContents[grepFilePath].split('\n');
        const matchingLines = grepLines.filter(line => 
          line.includes(grepPattern)
        );
        
        result.output = matchingLines.length > 0
          ? matchingLines.join('\n')
          : `Aucune ligne contenant "${grepPattern}" trouvée dans ${grepFile}`;
        break;

      case 'cd':
        // Changer de répertoire
        if (args.length === 0) {
          result.newDirectory = '/';
          break;
        }
        
        const targetDir = args[0];
        
        if (targetDir === '..') {
          // Remonter d'un niveau
          if (result.newDirectory === '/') {
            // Déjà à la racine
            break;
          }
          
          const pathParts = result.newDirectory.split('/').filter(Boolean);
          pathParts.pop();
          result.newDirectory = '/' + pathParts.join('/');
          if (result.newDirectory === '') result.newDirectory = '/';
        } else if (targetDir.startsWith('/')) {
          // Chemin absolu
          if (user.filesSystem[targetDir]) {
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
            
          if (user.filesSystem[newDir]) {
            result.newDirectory = newDir;
          } else {
            result.success = false;
            result.error = `Erreur: Répertoire '${targetDir}' non trouvé`;
          }
        }
        break;
        
      case 'cat':
        // Afficher le contenu d'un fichier
        if (args.length === 0) {
          result.success = false;
          result.error = 'Erreur: Nom de fichier requis';
          break;
        }
        
        const filename = args[0];
        const currentFiles = user.filesSystem[result.newDirectory] || [];
        
        if (!currentFiles.includes(filename)) {
          result.success = false;
          result.error = `Erreur: Fichier '${filename}' non trouvé`;
          break;
        }
        
        const filePath = result.newDirectory === '/' 
          ? `/${filename}`
          : `${result.newDirectory}/${filename}`;
          
        if (user.fileContents[filePath]) {
          result.output = user.fileContents[filePath];
        } else {
          result.output = '(Fichier vide)';
        }
        break;
        
      case 'mkdir':
        // Créer un nouveau dossier
        if (args.length === 0) {
          result.success = false;
          result.error = 'Erreur: Nom de dossier requis';
          break;
        }
        
        const newFolder = args[0];
        
        // Vérifier que le nom ne contient pas de caractères invalides
        if (newFolder.includes('/') || newFolder.includes('.')) {
          result.success = false;
          result.error = 'Erreur: Nom de dossier invalide';
          break;
        }
        
        const currentDirFiles = user.filesSystem[result.newDirectory] || [];
        
        // Vérifier si le dossier existe déjà
        if (currentDirFiles.includes(newFolder)) {
          result.success = false;
          result.error = `Erreur: Le dossier '${newFolder}' existe déjà`;
          break;
        }
        
        // Créer le dossier
        const newFolderPath = result.newDirectory === '/' 
          ? `/${newFolder}`
          : `${result.newDirectory}/${newFolder}`;
          
        user.filesSystem[result.newDirectory].push(newFolder);
        user.filesSystem[newFolderPath] = [];
        result.output = `Dossier '${newFolder}' créé avec succès`;
        
        // Sauvegarder les modifications
        await user.save();
        break;
        
      case 'touch':
        // Créer un nouveau fichier vide
        if (args.length === 0) {
          result.success = false;
          result.error = 'Erreur: Nom de fichier requis';
          break;
        }
        
        const newFile = args[0];
        
        // Vérifier que le nom ne contient pas de caractères invalides
        if (newFile.includes('/')) {
          result.success = false;
          result.error = 'Erreur: Nom de fichier invalide';
          break;
        }
        
        const dirFiles = user.filesSystem[result.newDirectory] || [];
        
        // Vérifier si le fichier existe déjà
        if (dirFiles.includes(newFile)) {
          result.success = false;
          result.error = `Erreur: Le fichier '${newFile}' existe déjà`;
          break;
        }
        
        // Créer le fichier
        const newFilePath = result.newDirectory === '/' 
          ? `/${newFile}`
          : `${result.newDirectory}/${newFile}`;
          
        user.filesSystem[result.newDirectory].push(newFile);
        user.fileContents[newFilePath] = '';
        result.output = `Fichier '${newFile}' créé avec succès`;
        
        // Sauvegarder les modifications
        await user.save();
        break;
        
      case 'rm':
        // Supprimer un fichier ou dossier
        if (args.length === 0) {
          result.success = false;
          result.error = 'Erreur: Nom de fichier ou dossier requis';
          break;
        }
        
        const target = args[0];
        const filesInDir = user.filesSystem[result.newDirectory] || [];
        
        if (!filesInDir.includes(target)) {
          result.success = false;
          result.error = `Erreur: '${target}' non trouvé`;
          break;
        }
        
        const targetPath = result.newDirectory === '/' 
          ? `/${target}`
          : `${result.newDirectory}/${target}`;
          
        // Si c'est un dossier (pas de point dans le nom)
        if (!target.includes('.')) {
          // Vérifier si le dossier est vide
          if (user.filesSystem[targetPath] && user.filesSystem[targetPath].length > 0) {
            result.success = false;
            result.error = `Erreur: Le dossier '${target}' n'est pas vide`;
            break;
          }
          
          // Supprimer le dossier
          delete user.filesSystem[targetPath];
        } else {
          // Supprimer le fichier
          delete user.fileContents[targetPath];
        }
        
        // Supprimer l'entrée du répertoire parent
        user.filesSystem[result.newDirectory] = filesInDir.filter(f => f !== target);
        result.output = `'${target}' supprimé avec succès`;
        
        // Sauvegarder les modifications
        await user.save();
        break;
        
      case 'echo':
        // Écrire dans un fichier
        const commandStr = command.trim();
        
        // Trouver l'index du redirecteur >
        const redirectIndex = commandStr.indexOf('>');
        
        if (redirectIndex === -1) {
          // Écho simple sans redirection
          result.output = commandStr.substring(5);  // Supprimer 'echo '
          break;
        }
        
        // Extraire le texte et le nom de fichier
        const text = commandStr.substring(5, redirectIndex).trim();
        const outputFile = commandStr.substring(redirectIndex + 1).trim();
        
        if (!outputFile) {
          result.success = false;
          result.error = 'Erreur: Nom de fichier requis pour la redirection';
          break;
        }
        
        const dirFilesList = user.filesSystem[result.newDirectory] || [];
        const outputFilePath = result.newDirectory === '/' 
          ? `/${outputFile}`
          : `${result.newDirectory}/${outputFile}`;
          
        // Créer le fichier s'il n'existe pas
        if (!dirFilesList.includes(outputFile)) {
          user.filesSystem[result.newDirectory].push(outputFile);
        }
        
        // Écrire dans le fichier
        user.fileContents[outputFilePath] = text;
        result.output = `Texte écrit dans '${outputFile}'`;
        
        // Sauvegarder les modifications
        await user.save();
        break;
        
      case 'clear':
        // Cette commande ne fait rien côté serveur, elle sera traitée côté client
        result.output = '';
        break;
        
      case 'whoami':
        result.output = `Utilisateur: ${user.username}\nScore: ${user.score} points\nRôle: ${user.role}`;
        break;
        
      case 'pwd':
        result.output = result.newDirectory;
        break;

      // Commandes spéciales pour les effets visuels
      case 'decrypt':
        // Vérifier les arguments
        if (args.length < 2) {
          result.success = false;
          result.error = 'Erreur: Utilisation: decrypt [clé] [fichier]';
          break;
        }
        
        const decryptKey = args[0];
        const encryptedFile = args[1];
        
        // Vérifier si le fichier existe
        const encryptedFilePath = encryptedFile.startsWith('/')
          ? encryptedFile
          : result.newDirectory === '/'
            ? `/${encryptedFile}`
            : `${result.newDirectory}/${encryptedFile}`;
        
        if (!user.fileContents[encryptedFilePath]) {
          result.success = false;
          result.error = `Erreur: Fichier '${encryptedFile}' non trouvé`;
          break;
        }
        
        // Simuler le déchiffrement - Vous pouvez implémenter ici une vérification réelle de la clé
        if (decryptKey === 'V01D-S3CR3T') {
          result.output = `Fichier ${encryptedFile} déchiffré avec succès.\n\nCONTENU DÉCHIFFRÉ:\n-----------------\nMISSION: VOID SHIELD\nPriority: A1\n\nCible identifiée. Procédez à l'extraction des données comme convenu.\nCoordonnées: 47.2184° N, 8.9774° E\nCode d'accès aux serveurs: SV-1337-42\n\nDétruisez ces données après lecture.\n\nVOID SEC COMMAND`;
        } else {
          result.success = false;
          result.error = `Erreur de déchiffrement: Clé invalide pour ${encryptedFile}`;
        }
        break;

      case 'download':
        // Vérifier les arguments
        if (args.length < 1) {
          result.success = false;
          result.error = 'Erreur: Utilisation: download [fichier]';
          break;
        }
        
        const downloadFile = args[0];
        
        // Simuler un téléchargement (vous pouvez implémenter une vérification réelle du fichier)
        result.output = `Téléchargement de ${downloadFile} terminé.\n\nMD5: a9b7f32e8c4d01b6f97e21f5d8b54e8a\nSHA-1: 7b6ef2c8a90e41b9d87f96a2d24e3f96c5ae94d8\nTaille: ${args[1] || '1.2 MB'}`;
        break;

      case 'hack':
        // Vérifier les arguments
        if (args.length < 1) {
          result.success = false;
          result.error = 'Erreur: Utilisation: hack [cible]';
          break;
        }
        
        const hackTarget = args[0];
        
        // Simuler un hacking
        result.output = `Systèmes de ${hackTarget} compromis.\n\nAccès root obtenu.\nServices vulnérables identifiés: ssh, ftp, http\nMots de passe récupérés: 3\nConnexions établies: 2\nBackdoor installée sur port: 4444`;
        break;

      case 'exploit':
        // Vérifier les arguments
        if (args.length < 2) {
          result.success = false;
          result.error = 'Erreur: Utilisation: exploit [vulnérabilité] [cible]';
          break;
        }
        
        const exploitVulnerability = args[0];
        const exploitTarget = args[1];
        
        // Simuler une exploitation
        if (exploitVulnerability === 'CVE-2025-1234' && exploitTarget === '10.0.0.5') {
          result.output = `Exploitation de ${exploitVulnerability} sur ${exploitTarget} réussie.\n\nPrivilèges élevés: root\nAccès au système de fichiers: complet\nConnexion persistante établie\nDonnées récupérées: 143 fichiers\nEmpreinte système minimisée`;
        } else {
          result.success = false;
          result.error = `Erreur d'exploitation: ${exploitVulnerability} non compatible avec ${exploitTarget} ou vulnérabilité non trouvée`;
        }
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
    await user.save();
    
    res.json({
      status: 'success',
      data: result
    });
  } catch (error) {
    console.error('Erreur lors de l\'exécution de la commande:', error);
    res.status(500).json({
      status: 'error',
      message: 'Erreur lors de l\'exécution de la commande'
    });
  }
});

module.exports = router;