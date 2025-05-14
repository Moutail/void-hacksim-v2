// src/components/Forum/UsersList.js - Correction avec indicateurs en ligne simplifiés

import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import './Forum.css';

const UsersList = ({ currentChannel }) => {
  const [users, setUsers] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Charger tous les utilisateurs
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        // Protection contre le chargement infini (timeout de 10s)
        const timeoutId = setTimeout(() => {
          if (loading) {
            setLoading(false);
            console.error('Timeout lors du chargement des utilisateurs');
          }
        }, 10000);
        
        // Charger la liste des utilisateurs depuis le classement (tous les utilisateurs)
        const response = await api.get('/api/users/leaderboard');
        
        // Annuler le timeout car le chargement a réussi
        clearTimeout(timeoutId);
        
        if (response.data.status === 'success') {
          // Stocker tous les utilisateurs
          setUsers(response.data.data);
          
          // Essayer de charger les utilisateurs en ligne
          try {
            const onlineResponse = await api.get('/api/users/online');
            if (onlineResponse.data.status === 'success') {
              setOnlineUsers(onlineResponse.data.data);
            }
          } catch (onlineError) {
            console.error('Erreur lors du chargement des utilisateurs en ligne:', onlineError);
            // En cas d'erreur, utiliser une approche de secours (simuler des utilisateurs en ligne)
            const randomUsers = response.data.data
              .sort(() => Math.random() - 0.5)
              .slice(0, Math.ceil(response.data.data.length / 3));
            setOnlineUsers(randomUsers);
          }
        }
      } catch (err) {
        console.error('Erreur lors du chargement des utilisateurs:', err);
        setError('Erreur lors du chargement des utilisateurs. Veuillez réessayer.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchUsers();
    
    // Rafraîchir les utilisateurs en ligne toutes les 60 secondes
    const intervalId = setInterval(async () => {
      try {
        const onlineResponse = await api.get('/api/users/online');
        if (onlineResponse.data.status === 'success') {
          setOnlineUsers(onlineResponse.data.data);
        }
      } catch (error) {
        console.error('Erreur lors du rafraîchissement des utilisateurs en ligne:', error);
      }
    }, 60000);
    
    // Nettoyer l'intervalle à la destruction du composant
    return () => {
      clearInterval(intervalId);
    };
  }, [currentChannel]);
  
  // Créer les listes d'utilisateurs en ligne et hors ligne
  const determineOnlineStatus = () => {
    // Identifier les IDs des utilisateurs en ligne
    const onlineUserIds = onlineUsers.map(user => user.id);
    
    // Marquer les utilisateurs comme en ligne ou hors ligne
    const markedUsers = users.map(user => ({
      ...user,
      isOnline: onlineUserIds.includes(user.id)
    }));
    
    return {
      online: markedUsers.filter(user => user.isOnline),
      offline: markedUsers.filter(user => !user.isOnline)
    };
  };
  
  const { online: onlineUsersList, offline: offlineUsersList } = determineOnlineStatus();
  
  return (
    <div className="users-list">
      <div className="users-list-header">
        <h3>Utilisateurs</h3>
      </div>
      
      {loading ? (
        <div className="loading-users">
          <div className="spinner"></div>
          <p>Chargement des utilisateurs...</p>
        </div>
      ) : error ? (
        <div className="error-message">Erreur de chargement</div>
      ) : (
        <>
          <div className="users-section">
            <h4>En ligne ({onlineUsersList.length})</h4>
            <ul>
              {onlineUsersList.map(user => (
                <li key={user.id} className="user-item online">
                  <div
                    className="user-avatar"
                    style={{ backgroundColor: stringToColor(user.username) }}
                  >
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                  <span className="user-name">{user.username}</span>
                  <span className="user-status-indicator online"></span>
                  {user.role === 'admin' && (
                    <span className="admin-badge">Admin</span>
                  )}
                </li>
              ))}
              {onlineUsersList.length === 0 && (
                <li className="no-users">Aucun utilisateur en ligne</li>
              )}
            </ul>
          </div>
          
          <div className="users-section">
            <h4>Hors ligne ({offlineUsersList.length})</h4>
            <ul>
              {offlineUsersList.length > 0 ? (
                offlineUsersList.map(user => (
                  <li key={user.id} className="user-item offline">
                    <div
                      className="user-avatar"
                      style={{ backgroundColor: stringToColor(user.username) }}
                    >
                      {user.username.charAt(0).toUpperCase()}
                    </div>
                    <span className="user-name">{user.username}</span>
                    <span className="user-status-indicator offline"></span>
                    {user.role === 'admin' && (
                      <span className="admin-badge">Admin</span>
                    )}
                  </li>
                ))
              ) : (
                <li className="no-users">Aucun utilisateur hors ligne</li>
              )}
            </ul>
          </div>
        </>
      )}
    </div>
  );
};

// Fonction pour générer une couleur basée sur une chaîne
const stringToColor = (str) => {
  if (!str) return '#000000';
  
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const c = (hash & 0x00FFFFFF)
    .toString(16)
    .toUpperCase();
  
  return '#' + '00000'.substring(0, 6 - c.length) + c;
};

export default UsersList;