// src/components/Notifications/NotificationDropdown.js - Dropdown des notifications
import React from 'react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import './Notifications.css';

const NotificationDropdown = ({ 
  notifications, 
  loading, 
  onMarkAsRead, 
  onMarkAllAsRead,
  unreadCount
}) => {
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
    <div className="notification-dropdown">
      <div className="notification-header">
        <h3>Notifications</h3>
        {unreadCount > 0 && (
          <button 
            className="mark-all-read-btn"
            onClick={onMarkAllAsRead}
          >
            Tout marquer comme lu
          </button>
        )}
      </div>
      
      <div className="notification-list">
        {loading ? (
          <div className="notification-loading">
            <div className="spinner"></div>
            <p>Chargement des notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="notification-empty">
            <p>Aucune notification</p>
          </div>
        ) : (
          <>
            {notifications.map(notification => (
              <Link 
                key={notification._id}
                to={getNotificationLink(notification)}
                className={`notification-item ${notification.isRead ? '' : 'unread'}`}
                onClick={() => !notification.isRead && onMarkAsRead(notification._id)}
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
            ))}
            
            <Link to="/notifications" className="view-all-notifications">
              Voir toutes les notifications
            </Link>
          </>
        )}
      </div>
    </div>
  );
};

export default NotificationDropdown;