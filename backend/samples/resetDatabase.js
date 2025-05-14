// resetDatabase.js
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const { exec } = require('child_process');

// Chargement des variables d'environnement
dotenv.config();

// Connexion à MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('Connexion à MongoDB établie pour la réinitialisation');
    
    // Supprimer toutes les collections
    console.log('Suppression des collections...');
    const collections = await mongoose.connection.db.collections();
    
    for (const collection of collections) {
      await collection.drop();
      console.log(`Collection ${collection.collectionName} supprimée`);
    }
    
    console.log('Base de données vidée avec succès');
    
    // Exécuter le script d'initialisation des défis
    console.log('Initialisation des défis...');
    exec('node samples/challenges.js', (error, stdout, stderr) => {
      if (error) {
        console.error(`Erreur lors de l'initialisation des défis: ${error.message}`);
        return;
      }
      
      console.log(stdout);
      console.log('Réinitialisation complète de la base de données effectuée');
      process.exit(0);
    });
  })
  .catch(err => {
    console.error('Erreur de connexion à MongoDB:', err);
    process.exit(1);
  });