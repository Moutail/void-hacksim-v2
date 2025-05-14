// src/pages/NotificationsPage.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import formatDistanceToNow from 'date-fns/formatDistanceToNow';
import fr from 'date-fns/locale/fr';
import api from '../utils/api';
import './NotificationsPage.css'; // Vous devrez créer ce fichier CSS

const NotificationsPage = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        setLoading(true);
        const response = await api.get('/api/notifications');
        
        if (response.data.status === 'success') {
          setNotifications(response.data.data.notifications);
        }
      } catch (err) {
        console.error('Erreur lors du chargement des notifications:', err);
        setError('Erreur lors du chargement des notifications. Veuillez réessayer.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchNotifications();
  }, []);

  const handleMarkAsRead = async (notificationId) => {
    try {
      await api.put(`/api/notifications/${notificationId}/read`);
      
      // Mettre à jour la liste des notifications
      setNotifications(prev => 
        prev.map(notif => 
          notif._id === notificationId 
            ? { ...notif, isRead: true } 
            : notif
        )
      );
    } catch (error) {
      console.error('Erreur lors du marquage de la notification comme lue:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.put('/api/notifications/mark-all-read');
      
      // Mettre à jour la liste des notifications
      setNotifications(prev => 
        prev.map(notif => ({ ...notif, isRead: true }))
      );
    } catch (error) {
      console.error('Erreur lors du marquage de toutes les notifications comme lues:', error);
    }
  };

  // Fonction pour formater la date
  const formatDate = (date) => {
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true, locale: fr });
    } catch (error) {
      return 'date inconnue';
    }
  };

  // Fonction pour générer le lien en fonction du type de notification
  const getNotificationLink = (notification) => {
    if (!notification.relatedTo || !notification.relatedTo.model || !notification.relatedTo.id) {
      return '/dashboard';
    }
    
    switch (notification.relatedTo.model) {
      case 'Message':
        // Déterminer le canal en fonction du contenu du message
        if (notification.content.includes('#general')) {
          return '/forum/general';
        } else if (notification.content.includes('#help')) {
          return '/forum/help';
        } else if (notification.content.includes('#challenges')) {
          return '/forum/challenges';
        } else if (notification.content.includes('#announcements')) {
          return '/forum/announcements';
        } else {
          return '/forum';
        }
      case 'Challenge':
        return `/challenges/${notification.relatedTo.id}`;
      case 'User':
        return `/profile/${notification.relatedTo.id}`;
      default:
        return '/dashboard';
    }
  };

  // Fonction pour récupérer l'icône en fonction du type de notification
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'new_message':
        return 'fas fa-comment';
      case 'mention':
        return 'fas fa-at';
      case 'new_challenge':
        return 'fas fa-trophy';
      case 'challenge_completed':
        return 'fas fa-check-circle';
      case 'announcement':
        return 'fas fa-bullhorn';
      case 'welcome':
        return 'fas fa-user';
      case 'rank_up':
        return 'fas fa-arrow-up';
      case 'system':
        return 'fas fa-cog';
      default:
        return 'fas fa-bell';
    }
  };

  return (
    <div className="notifications-page">
      <div className="notifications-header">
        <h1>Mes Notifications</h1>
        {notifications.some(n => !n.isRead) && (
          <button 
            className="mark-all-read-btn"
            onClick={handleMarkAllAsRead}
          >
            Tout marquer comme lu
          </button>
        )}
      </div>
      
      {error && <div className="error-message">{error}</div>}
      
      <div className="notifications-list">
        {loading ? (
          <div className="loading-notifications">
            <div className="spinner"></div>
            <p>Chargement des notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="empty-notifications">
            <div className="empty-icon">
              <i className="fas fa-bell-slash"></i>
            </div>
            <p>Aucune notification</p>
          </div>
        ) : (
          notifications.map(notification => (
            <Link 
              key={notification._id}
              to={getNotificationLink(notification)}
              className={`notification-item ${notification.isRead ? '' : 'unread'}`}
              onClick={() => !notification.isRead && handleMarkAsRead(notification._id)}
            >
              <div className="notification-icon">
                <i className={getNotificationIcon(notification.type)}></i>
              </div>
              <div className="notification-content">
                <div className="notification-title">{notification.title}</div>
                <div className="notification-text">{notification.content}</div>
                <div className="notification-time">{formatDate(notification.createdAt)}</div>
              </div>
              {!notification.isRead && (
                <div className="notification-unread-marker"></div>
              )}
            </Link>
          ))
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;