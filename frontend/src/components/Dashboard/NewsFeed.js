// src/components/Dashboard/NewsFeed.js - Composant pour afficher les nouvelles et annonces sur le dashboard
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import './NewsFeed.css';

const NewsFeed = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const response = await api.get('/api/messages?channel=announcements&limit=5');
        
        if (response.data.status === 'success') {
          setAnnouncements(response.data.data.messages);
        }
      } catch (err) {
        console.error('Erreur lors du chargement des annonces:', err);
        setError('Erreur lors du chargement des annonces. Veuillez réessayer.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchAnnouncements();
  }, []);
  
  // Formater la date
  const formatDate = (date) => {
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true, locale: fr });
    } catch (error) {
      return 'date inconnue';
    }
  };
  
  return (
    <div className="news-feed-container">
      <div className="news-feed-header">
        <h2>Annonces & Actualités</h2>
        <Link to="/forum/announcements" className="view-all">
          Voir tout <i className="fas fa-chevron-right"></i>
        </Link>
      </div>
      
      {error && <div className="error-message">{error}</div>}
      
      <div className="news-feed-content">
        {loading ? (
          <div className="loading-news">
            <div className="spinner"></div>
            <p>Chargement des annonces...</p>
          </div>
        ) : announcements.length === 0 ? (
          <div className="empty-news">
            <p>Aucune annonce pour le moment.</p>
          </div>
        ) : (
          <div className="announcements-list">
            {announcements.map(announcement => (
              <div key={announcement._id} className="announcement-item">
                <div className="announcement-header">
                  <div className="announcement-author">
                    <div 
                      className="author-avatar"
                      style={{ backgroundColor: stringToColor(announcement.author.username) }}
                    >
                      {announcement.author.username.charAt(0).toUpperCase()}
                    </div>
                    <div className="author-info">
                      <span className="author-name">
                        {announcement.author.username}
                        {announcement.author.role === 'admin' && (
                          <span className="admin-badge">Admin</span>
                        )}
                      </span>
                      <span className="announcement-time">{formatDate(announcement.createdAt)}</span>
                    </div>
                  </div>
                </div>
                
                <div className="announcement-content">
                  {announcement.content}
                </div>
                
                <div className="announcement-footer">
                  <Link to="/forum/announcements" className="reply-button">
                    <i className="fas fa-reply"></i> Répondre
                  </Link>
                  
                  <div className="like-count">
                    <i className="fas fa-heart"></i>
                    <span>{announcement.likes ? announcement.likes.length : 0}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Fonction pour générer une couleur basée sur une chaîne
const stringToColor = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const c = (hash & 0x00FFFFFF)
    .toString(16)
    .toUpperCase();
  
  return '#' + '00000'.substring(0, 6 - c.length) + c;
};

export default NewsFeed;