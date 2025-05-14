// middleware/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware pour vérifier l'authentification
exports.authMiddleware = async (req, res, next) => {
  try {
    // Vérifier si le token est présent
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        status: 'error',
        message: 'Non autorisé - Token manquant'
      });
    }
    
    // Extraire le token
    const token = authHeader.split(' ')[1];
    
    try {
      // Vérifier et décoder le token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Vérifier si l'utilisateur existe
      const user = await User.findById(decoded.id);
      
      if (!user) {
        return res.status(401).json({
          status: 'error',
          message: 'Non autorisé - Utilisateur non trouvé'
        });
      }
      
      // Ajouter les informations de l'utilisateur à la requête
      req.user = {
        id: decoded.id,
        role: decoded.role
      };
      
      next();
    } catch (error) {
      return res.status(401).json({
        status: 'error',
        message: 'Non autorisé - Token invalide'
      });
    }
  } catch (error) {
    console.error('Erreur d\'authentification:', error);
    res.status(500).json({
      status: 'error',
      message: 'Erreur lors de l\'authentification'
    });
  }
};

// Middleware pour vérifier les privilèges administrateur
exports.adminMiddleware = (req, res, next) => {
  // Le middleware d'authentification doit être exécuté avant
  if (!req.user) {
    return res.status(401).json({
      status: 'error',
      message: 'Non autorisé - Authentification requise'
    });
  }
  
  // Vérifier si l'utilisateur est administrateur
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      status: 'error',
      message: 'Accès refusé - Privilèges administrateur requis'
    });
  }
  
  next();
};