// src/context/PresenceContext.js - Contexte de présence pour React

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { 
  initializeSocket, 
  disconnectSocket, 
  subscribeToEvent, 
  unsubscribeFromEvent 
} from '../utils/socketClient';
import api from '../utils/api';

// Créer le contexte
const PresenceContext = createContext();

// Hook personnalisé pour utiliser le contexte
export const usePresence = () => useContext(PresenceContext);

// Fournisseur du contexte
export const PresenceProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  // Initialiser la connexion Socket.io lorsque l'utilisateur est authentifié
  useEffect(() => {
    if (isAuthenticated && user) {
      // Initialiser le socket
      initializeSocket(user.id, localStorage.getItem('token'), setIsConnected);
      
      // Charger initialement les utilisateurs en ligne via API
      fetchOnlineUsers();
      
      // Se désabonner lors du démontage
      return () => {
        disconnectSocket();
      };
    }
  }, [isAuthenticated, user]);

  // S'abonner aux événements de présence
  useEffect(() => {
    if (isAuthenticated) {
      // S'abonner à l'événement "online_users"
      subscribeToEvent('online_users', handleOnlineUsers);
      
      // S'abonner à l'événement "user_status_changed"
      subscribeToEvent('user_status_changed', handleUserStatusChange);
      
      // Se désabonner lors du démontage
      return () => {
        unsubscribeFromEvent('online_users');
        unsubscribeFromEvent('user_status_changed');
      };
    }
  }, [isAuthenticated]);

  // Récupérer les utilisateurs en ligne via l'API
  const fetchOnlineUsers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/users/online');
      
      if (response.data.status === 'success') {
        setOnlineUsers(response.data.data);
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des utilisateurs en ligne:', error);
    } finally {
      setLoading(false);
    }
  };

  // Gérer la mise à jour des utilisateurs en ligne
  const handleOnlineUsers = (users) => {
    setOnlineUsers(users);
    setLoading(false);
  };

  // Gérer le changement de statut d'un utilisateur
  const handleUserStatusChange = (data) => {
    const { userId, isOnline } = data;
    
    setOnlineUsers(prev => {
      // Si l'utilisateur est maintenant en ligne et n'est pas déjà dans la liste
      if (isOnline) {
        const userExists = prev.some(user => user.id === userId);
        
        if (!userExists) {
          // Chercher les informations de l'utilisateur (on aura le nom d'utilisateur dans data)
          return [...prev, data];
        }
        
        // Mettre à jour le statut
        return prev.map(user => 
          user.id === userId 
            ? { ...user, isOnline: true } 
            : user
        );
      } else {
        // Mettre à jour le statut de l'utilisateur comme hors ligne
        return prev.map(user => 
          user.id === userId 
            ? { ...user, isOnline: false } 
            : user
        );
      }
    });
  };

  // Vérifier si un utilisateur est en ligne
  const isUserOnline = (userId) => {
    const user = onlineUsers.find(user => user.id === userId);
    return user ? user.isOnline : false;
  };

  // Mettre à jour son propre statut (utilisé pour le départ)
  const updateOwnStatus = async (isOnline = true) => {
    try {
      if (isOnline) {
        await api.post('/api/users/update-presence');
      } else {
        await api.post('/api/users/offline');
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour du statut:', error);
    }
  };

  return (
    <PresenceContext.Provider
      value={{
        onlineUsers,
        isConnected,
        loading,
        isUserOnline,
        updateOwnStatus,
        refreshOnlineUsers: fetchOnlineUsers
      }}
    >
      {children}
    </PresenceContext.Provider>
  );
};

export default PresenceContext;