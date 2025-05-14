// src/components/Notifications/NotificationIcon.js - Icône de notification avec compteur
import React, { useState, useEffect, useRef } from 'react';
import api from '../../utils/api';
import NotificationDropdown from './NotificationDropdown';
import './Notifications.css';

const NotificationIcon = () => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);
  
  // Charger le nombre de notifications non lues au chargement et toutes les minutes
  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const response = await api.get('/api/notifications/unread-count');
        
        if (response.data.status === 'success') {
          setUnreadCount(response.data.data.count);
        }
      } catch (error) {
        console.error('Erreur lors du chargement du nombre de notifications non lues:', error);
      }
    };
    
    fetchUnreadCount();
    
    // Rafraîchir toutes les minutes
    const interval = setInterval(fetchUnreadCount, 60000);
    
    return () => clearInterval(interval);
  }, []);
  
  // Fermer le dropdown quand on clique en dehors
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Charger les notifications quand on ouvre le dropdown
  const handleToggleDropdown = async () => {
    setShowDropdown(!showDropdown);
    
    // Si on ferme le dropdown, pas besoin de charger les notifications
    if (showDropdown) return;
    
    setLoading(true);
    
    try {
      const response = await api.get('/api/notifications?limit=5');
      
      if (response.data.status === 'success') {
        setNotifications(response.data.data.notifications);
        setUnreadCount(response.data.data.unreadCount);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des notifications:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Marquer une notification comme lue
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
      
      // Mettre à jour le compteur
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Erreur lors du marquage de la notification comme lue:', error);
    }
  };
  
  // Marquer toutes les notifications comme lues
  const handleMarkAllAsRead = async () => {
    try {
      await api.put('/api/notifications/mark-all-read');
      
      // Mettre à jour la liste des notifications
      setNotifications(prev => 
        prev.map(notif => ({ ...notif, isRead: true }))
      );
      
      // Mettre à jour le compteur
      setUnreadCount(0);
    } catch (error) {
      console.error('Erreur lors du marquage de toutes les notifications comme lues:', error);
    }
  };
  
  return (
    <div className="notification-container" ref={dropdownRef}>
      <div className="notification-icon" onClick={handleToggleDropdown}>
        <i className="fas fa-bell"></i>
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount}</span>
        )}
      </div>
      
      {showDropdown && (
        <NotificationDropdown 
          notifications={notifications}
          loading={loading}
          onMarkAsRead={handleMarkAsRead}
          onMarkAllAsRead={handleMarkAllAsRead}
          unreadCount={unreadCount}
        />
      )}
    </div>
  );
};

export default NotificationIcon;