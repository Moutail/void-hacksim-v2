// server.js - Intégration de Socket.io et mise à jour du serveur
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const socketIo = require('socket.io');
const cron = require('node-cron');
const authRoutes = require('./routes/auth');
const challengeRoutes = require('./routes/challenges');
const terminalRoutes = require('./routes/terminal');
const userRoutes = require('./routes/users');
const messagesRoutes = require('./routes/messages');
const notificationsRoutes = require('./routes/notifications');
const socketService = require('./services/socketService');
const { authMiddleware } = require('./middleware/auth');

// Chargement des variables d'environnement
dotenv.config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Connexion à MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Connexion à MongoDB établie'))
  .catch(err => console.error('Erreur de connexion à MongoDB:', err));

// Initialiser le service Socket.io
socketService.initialize(io);

// Planifier le nettoyage des statuts en ligne
socketService.scheduleCleanup(cron);

// Routes publiques
app.use('/api/auth', authRoutes);

// Routes protégées
app.use('/api/challenges', authMiddleware, challengeRoutes);
app.use('/api/terminal', authMiddleware, terminalRoutes);
app.use('/api/users', authMiddleware, userRoutes);
app.use('/api/messages', authMiddleware, messagesRoutes);
app.use('/api/notifications', authMiddleware, notificationsRoutes);

// Route de test
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'VOID HackSimulator API fonctionne correctement',
    socket: 'Socket.io actif'
  });
});

// Gestion des erreurs
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    status: 'error',
    message: 'Une erreur serveur est survenue',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Servir le frontend en production
if (process.env.NODE_ENV === 'production') {
  const path = require('path');
  
  // Définir le dossier des assets statiques
  app.use(express.static('public'));
  
  // Toutes les requêtes non API sont redirigées vers l'index.html
  app.get('*', (req, res) => {
    res.status(200).json({ message: "API Backend en ligne. Utilisez les endpoints /api pour accéder aux services." });
  });
}

// Démarrage du serveur
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT} avec Socket.io`);
});

module.exports = { app, server, io };