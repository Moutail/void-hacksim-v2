// src/utils/api.js - Mise à jour pour utiliser config.js
import axios from 'axios';
import { API_URL } from '../config';

// Créer une instance Axios avec la configuration de base
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Intercepter les requêtes pour ajouter le token d'authentification
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Intercepter les réponses pour gérer les erreurs d'authentification
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Si erreur 401 (non autorisé), rediriger vers la page de connexion
    if (error.response && error.response.status === 401) {
      // Vider le token
      localStorage.removeItem('token');
      
      // Rediriger vers la page de connexion si ce n'est pas déjà le cas
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;