// updateUserFiles.js
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');

dotenv.config();

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('Connexion à MongoDB établie');
    
    // Mettre à jour tous les utilisateurs
    const result = await User.updateMany({}, {
      $set: {
        'filesSystem./missions': ['intro'],
        'filesSystem./missions/intro': ['secrets'],
        'filesSystem./missions/intro/secrets': ['mission.txt'],
        'fileContents./missions/intro/secrets/mission.txt': 'CONFIDENTIEL: VOID-0001\n\nInfiltration du système réussie. Votre mission est de documenter cette vulnérabilité en créant un rapport détaillé.\n\nRapport à déposer dans un nouveau dossier nommé "rapport" à la racine, sous le nom "rapport.txt".\n\nFin de transmission.'
      }
    });
    
    console.log(`${result.modifiedCount} utilisateurs mis à jour`);
    process.exit(0);
  })
  .catch(err => {
    console.error('Erreur:', err);
    process.exit(1);
  });