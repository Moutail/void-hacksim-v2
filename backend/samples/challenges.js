// samples/challenges.js
// Script pour initialiser le système avec des défis d'exemple

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Challenge = require('../models/Challenge');
const User = require('../models/User');

// Chargement des variables d'environnement
dotenv.config();

// Connexion à MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Connexion à MongoDB établie pour l\'initialisation des défis'))
  .catch(err => {
    console.error('Erreur de connexion à MongoDB:', err);
    process.exit(1);
  });

// Créer un utilisateur admin s'il n'existe pas
const createAdminUser = async () => {
  try {
    const adminExists = await User.findOne({ role: 'admin' });
    
    if (!adminExists) {
      const admin = new User({
        username: 'void_admin',
        email: 'admin@void-security.com',
        password: 'V01d@dmin123!', // À changer en production
        role: 'admin'
      });
      
      await admin.save();
      console.log('Utilisateur admin créé avec succès');
      return admin._id;
    }
    
    return adminExists._id;
  } catch (error) {
    console.error('Erreur lors de la création de l\'utilisateur admin:', error);
    process.exit(1);
  }
};

// Défis d'exemple
const sampleChallenges = [
  {
  title: "Introduction au Terminal",
  description: "Familiarisez-vous avec les commandes de base du terminal pour naviguer dans le système de fichiers.",
  level: "débutant",
  type: "terminal",
  instructions: `Bienvenue dans votre première mission !

En tant que nouveau membre de VOID, vous devez maîtriser les bases du terminal pour naviguer dans nos systèmes.

Votre mission consiste à :
1. Naviguer dans le système de fichiers et explorer le dossier missions
2. Trouver et lire le fichier secret 'mission.txt' situé dans le dossier '/missions/intro/secrets'
3. Créer un nouveau dossier nommé 'rapport' à la racine
4. Créer un fichier 'rapport.txt' dans ce dossier avec le texte "Mission accomplie"

Utilisez les commandes suivantes :
- ls : Lister les fichiers
- cd [dossier] : Changer de répertoire
- cat [fichier] : Afficher le contenu d'un fichier
- mkdir [dossier] : Créer un dossier
- echo [texte] > [fichier] : Écrire du texte dans un fichier`,
  objectives: [
    {
      description: "Lister les fichiers du répertoire racine",
      completed: false,
      validationFunction: `
function(command, history) {
  return command === 'ls';
}`
    },
    {
      description: "Explorer le dossier missions",
      completed: false,
      validationFunction: `
function(command, history) {
  return command === 'cd missions' || command === 'cd /missions';
}`
    },
    {
      description: "Accéder au dossier intro",
      completed: false,
      validationFunction: `
function(command, history) {
  return command === 'cd intro' && history.some(cmd => 
    cmd === 'cd missions' || cmd === 'cd /missions'
  );
}`
    },
    {
      description: "Accéder au dossier secrets",
      completed: false,
      validationFunction: `
function(command, history) {
  return command === 'cd secrets' && history.some(cmd => 
    cmd.includes('cd intro')
  );
}`
    },
    {
      description: "Lire le fichier 'mission.txt'",
      completed: false,
      validationFunction: `
function(command, history) {
  return command === 'cat mission.txt' && history.some(cmd => 
    cmd === 'cd secrets'
  );
}`
    },
    {
      description: "Retourner à la racine",
      completed: false,
      validationFunction: `
function(command, history) {
  return command === 'cd /' || command === 'cd /home/user' || 
         (command === 'cd ..' && history.some(cmd => cmd === 'cd ..') && 
          history.some(cmd => cmd === 'cd ..'));
}`
    },
    {
      description: "Créer un dossier 'rapport' à la racine",
      completed: false,
      validationFunction: `
function(command, history) {
  const cdRootIndex = history.findIndex(cmd => 
    cmd === 'cd /' || cmd === 'cd /home/user' || 
    (cmd === 'cd ..' && history.some(prev => prev === 'cd ..'))
  );
  const mkdirIndex = history.findIndex(cmd => cmd === 'mkdir rapport');
  
  return cdRootIndex !== -1 && mkdirIndex !== -1 && mkdirIndex > cdRootIndex && command === 'mkdir rapport';
}`
    },
    {
      description: "Créer un fichier 'rapport.txt' avec le texte demandé",
      completed: false,
      validationFunction: `
function(command, history) {
  return command.includes('echo') && command.includes('Mission accomplie') && command.includes('rapport.txt');
}`
    }
  ],
  initialFiles: {
    '/': ['missions', 'readme.txt'],
    '/missions': ['intro'],
    '/missions/intro': ['secrets'],
    '/missions/intro/secrets': ['mission.txt']
  },
  initialFileContents: {
    '/readme.txt': 'Bienvenue dans le système VOID.\n\nCe terminal vous permet d\'interagir avec notre système de fichiers sécurisé.\nUtilisez les commandes standards pour naviguer.\nUtilisez "help" pour voir les commandes disponibles.',
    '/missions/intro/secrets/mission.txt': 'CONFIDENTIEL: VOID-0001\n\nInfiltration du système réussie. Votre mission est de documenter cette vulnérabilité en créant un rapport détaillé.\n\nRapport à déposer dans un nouveau dossier nommé "rapport" à la racine, sous le nom "rapport.txt".\n\nFin de transmission.'
  },
  points: 100,
  hints: [
    {
      text: "Utilisez 'cd /' pour revenir à la racine depuis n'importe quel répertoire.",
      costPoints: 10
    },
    {
      text: "Pour créer le rapport, utilisez : echo \"Mission accomplie\" > rapport/rapport.txt",
      costPoints: 20
    }
  ],
  active: true
},
  {
    title: "Récupération de données cryptées",
    description: "Décryptez un fichier confidentiel en trouvant la clé cachée dans le système.",
    level: "intermédiaire",
    type: "crypto",
    instructions: `Mission : Récupération de données cryptées

Nous avons intercepté un fichier crypté important, mais nous avons besoin de la clé de décryptage pour y accéder.

D'après nos renseignements :
1. La clé est cachée dans un fichier système quelque part dans le dossier '/system'
2. Le fichier crypté se trouve dans '/encrypted/secret.enc'
3. Vous devrez utiliser la commande 'decrypt' suivie de la clé trouvée pour déchiffrer le fichier

Exemple : decrypt XYZ123 /encrypted/secret.enc

Bonne chance !`,
    objectives: [
      {
        description: "Explorer le dossier système",
        completed: false,
        validationFunction: `
function(command, history) {
  return command === 'cd /system' || command === 'cd system';
}`
      },
      {
        description: "Trouver et lire le fichier contenant la clé",
        completed: false,
        validationFunction: `
function(command, history) {
  // Vérifier que l'utilisateur a listé les fichiers et lu config.cfg
  const lsExecuted = history.some(cmd => cmd === 'ls');
  return lsExecuted && command === 'cat config.cfg';
}`
      },
      {
        description: "Accéder au fichier crypté",
        completed: false,
        validationFunction: `
function(command, history) {
  return command === 'cd /encrypted' || command === 'cd ../encrypted';
}`
      },
      {
        description: "Décrypter le fichier secret avec la bonne clé",
        completed: false,
        validationFunction: `
function(command, history) {
  return command === 'decrypt V01D-S3CR3T /encrypted/secret.enc' || 
         command === 'decrypt V01D-S3CR3T secret.enc';
}`
      }
    ],
    initialFiles: {
      '/': ['system', 'encrypted', 'readme.txt'],
      '/system': ['logs', 'config.cfg', 'kernel.sys'],
      '/encrypted': ['secret.enc'],
      '/system/logs': ['system.log', 'access.log']
    },
    initialFileContents: {
      '/readme.txt': 'Système de fichiers sécurisé VOID.\n\nUtilisez la commande "decrypt [clé] [fichier]" pour décrypter les fichiers chiffrés.',
      '/system/config.cfg': '# Configuration du système\nport=8080\nhost=127.0.0.1\nencryption=AES-256\ndecrypt_key=V01D-S3CR3T  # NE PAS PARTAGER CETTE CLÉ\nlog_level=INFO',
      '/system/kernel.sys': '[DONNÉES BINAIRES NON LISIBLES]',
      '/encrypted/secret.enc': '[CONTENU CRYPTÉ]\n4f7c6148bf7e6a1d8a5e9b2c3f8a7d6e\n9a2b8c7d6e5f4a3b2c1d7e8f9a6b5c4d\n3c2d1e0f9a8b7c6d5e4f3a2b1c8d7e6f',
      '/system/logs/system.log': '2025-05-10 08:23:15 INFO: Système démarré\n2025-05-10 08:23:16 INFO: Services initialisés\n2025-05-10 08:25:00 WARN: Tentative d\'accès non autorisée détectée\n2025-05-10 08:30:45 INFO: Sauvegarde programmée effectuée',
      '/system/logs/access.log': '2025-05-10 08:24:15 USER:admin ACTION:login STATUS:success\n2025-05-10 08:25:00 USER:unknown ACTION:login STATUS:failed\n2025-05-10 08:25:00 USER:unknown ACTION:login STATUS:failed\n2025-05-10 08:26:30 USER:system ACTION:backup STATUS:success'
    },
    points: 200,
    hints: [
      {
        text: "Les fichiers de configuration contiennent souvent des informations sensibles comme des clés.",
        costPoints: 20
      },
      {
        text: "La commande 'cat' vous permet de lire le contenu d'un fichier.",
        costPoints: 10
      },
      {
        text: "La clé est dans le fichier config.cfg, cherchez une ligne avec 'decrypt_key'.",
        costPoints: 50
      }
    ],
    active: true
  },
  {
    title: "Exploitation de faille",
    description: "Identifiez et exploitez une vulnérabilité pour obtenir un accès privilégié au système.",
    level: "avancé",
    type: "network",
    instructions: `Mission : Exploitation de faille

Nous avons détecté une vulnérabilité potentielle dans un système cible. Votre mission est de l'identifier et de l'exploiter pour obtenir un accès privilégié.

Étapes:
1. Analysez les fichiers journaux dans le dossier '/logs' pour identifier des tentatives d'accès suspectes
2. Examinez la configuration du serveur dans '/config/server.conf'
3. Trouvez et utilisez l'exploit approprié en utilisant la commande 'exploit [vulnérabilité] [cible]'

L'accès réussi vous permettra de récupérer le fichier '/root/flag.txt' qui contient les informations confidentielles.

Cette mission teste votre capacité à analyser des données et à identifier des vecteurs d'attaque.`,
    objectives: [
      {
        description: "Analyser les fichiers journaux",
        completed: false,
        validationFunction: `
function(command, history) {
  return (command === 'cat /logs/access.log' || command === 'cat access.log') && 
         history.some(cmd => cmd.includes('cd /logs') || cmd.includes('cd logs'));
}`
      },
      {
        description: "Examiner la configuration du serveur",
        completed: false,
        validationFunction: `
function(command, history) {
  return (command === 'cat /config/server.conf' || command === 'cat server.conf') && 
         history.some(cmd => cmd.includes('cd /config') || cmd.includes('cd config'));
}`
      },
      {
        description: "Identifier la vulnérabilité CVE-2025-1234",
        completed: false,
        validationFunction: `
function(command, history) {
  // Cette validation est artificielle car nous ne pouvons pas réellement lire les pensées de l'utilisateur
  // L'idée est que l'utilisateur ait lu les deux fichiers précédents
  const accessLogRead = history.some(cmd => cmd.includes('access.log'));
  const serverConfRead = history.some(cmd => cmd.includes('server.conf'));
  
  // S'il a commencé à exploiter la vulnérabilité correcte
  if (command.startsWith('exploit CVE-2025-1234')) {
    return accessLogRead && serverConfRead;
  }
  
  return false;
}`
      },
      {
        description: "Exploiter la vulnérabilité sur la cible 10.0.0.5",
        completed: false,
        validationFunction: `
function(command, history) {
  return command === 'exploit CVE-2025-1234 10.0.0.5';
}`
      },
      {
        description: "Récupérer le fichier flag.txt",
        completed: false,
        validationFunction: `
function(command, history) {
  // Vérifier que l'exploitation a réussi (étape précédente) et que l'utilisateur lit flag.txt
  const exploitExecuted = history.some(cmd => cmd === 'exploit CVE-2025-1234 10.0.0.5');
  return exploitExecuted && (command === 'cat /root/flag.txt' || command === 'cat flag.txt');
}`
      }
    ],
    initialFiles: {
      '/': ['logs', 'config', 'tools', 'readme.txt'],
      '/logs': ['access.log', 'error.log', 'system.log'],
      '/config': ['server.conf', 'network.conf', 'users.conf'],
      '/tools': ['scan.sh', 'exploit-db.txt']
    },
    initialFileContents: {
      '/readme.txt': 'Système cible pour audit de sécurité.\n\nUtilisez les outils fournis pour analyser et exploiter les vulnérabilités potentielles.\n\nCommande exploit: exploit [vulnérabilité] [cible]',
      '/logs/access.log': '2025-05-08 14:23:15 IP:10.0.0.5 REQUEST:GET /admin STATUS:403\n2025-05-08 14:23:20 IP:10.0.0.5 REQUEST:GET /login STATUS:200\n2025-05-08 14:23:30 IP:10.0.0.5 REQUEST:POST /login STATUS:200\n2025-05-08 14:23:35 IP:10.0.0.5 REQUEST:GET /admin STATUS:200\n2025-05-08 14:24:00 IP:10.0.0.5 REQUEST:GET /admin/config?debug=true STATUS:200\n2025-05-08 14:24:10 IP:10.0.0.5 REQUEST:POST /admin/execute?cmd=ls STATUS:200',
      '/logs/error.log': '2025-05-08 14:24:05 ERROR: Paramètre debug activé sans authentification requise\n2025-05-08 14:24:15 ERROR: Exécution de commande non sanitisée détectée\n2025-05-08 14:24:20 ERROR: Injection potentielle via paramètre cmd',
      '/config/server.conf': '# Configuration du serveur\nversion=Apache/2.4.59\nmodules=core,http_core,handler,cgi\ndebug_mode=true  # ATTENTION: Vulnérable à CVE-2025-1234\ncmd_execution=enabled  # À désactiver en production\nremote_access=true\nip_restrictions=false',
      '/tools/exploit-db.txt': 'Liste des exploits connus:\n\nCVE-2025-1234: Vulnérabilité d\'exécution de commande à distance dans Apache 2.4.59 via paramètre debug\nCVE-2025-5678: Faille de dépassement de tampon dans OpenSSH 9.2\nCVE-2024-9876: Injection SQL dans MySQL 8.1.0\n\nUtilisation: exploit [CVE] [IP cible]'
    },
    points: 300,
    hints: [
      {
        text: "Examinez les erreurs dans le fichier error.log pour trouver des indices sur le type de vulnérabilité.",
        costPoints: 30
      },
      {
        text: "La configuration du serveur contient un commentaire sur une vulnérabilité spécifique.",
        costPoints: 50
      },
      {
        text: "Vous devez cibler l'adresse IP qui apparaît dans les journaux d'accès.",
        costPoints: 40
      }
    ],
    active: true
  }
];

// Fonction principale pour initialiser les défis
const initChallenges = async () => {
  try {
    // Créer l'admin si nécessaire
    const adminId = await createAdminUser();
    
    // Vérifier s'il y a déjà des défis
    const existingChallenges = await Challenge.countDocuments();
    
    if (existingChallenges > 0) {
      console.log(`${existingChallenges} défis déjà présents dans la base de données.`);
      console.log('Pour réinitialiser complètement, supprimez d\'abord tous les défis existants.');
      process.exit(0);
    }
    
    // Créer les défis d'exemple
    for (const challenge of sampleChallenges) {
      const newChallenge = new Challenge({
        ...challenge,
        createdBy: adminId
      });
      
      await newChallenge.save();
      console.log(`Défi "${challenge.title}" créé avec succès`);
    }
    
    console.log('Tous les défis ont été initialisés avec succès');
    process.exit(0);
  } catch (error) {
    console.error('Erreur lors de l\'initialisation des défis:', error);
    process.exit(1);
  }
};

// Exécuter l'initialisation
initChallenges();