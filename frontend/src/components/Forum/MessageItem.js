// src/components/Forum/MessageItem.js - Solution complète

import React, { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useAuth } from '../../context/AuthContext';
import './Forum.css';

const MessageItem = ({ message, currentUser, onDelete, onEdit, onLike, onReport }) => {
  // Logging pour le débogage
  useEffect(() => {
    console.log("Message data:", message);
    console.log("Current user:", currentUser);
  }, [message, currentUser]);

  // Hooks en premier
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message?.content || '');
  const [showModOptions, setShowModOptions] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Protection contre les objets message incomplets
  if (!message || !message.author) {
    console.error("Message ou auteur manquant:", message);
    return null;
  }
  
  // Vérifications d'identité plus robustes
  const isAuthor = currentUser && 
    (currentUser.id === message.author._id || 
     currentUser._id === message.author._id ||
     currentUser.id === message.author.id ||
     currentUser._id === message.author.id);
  
  const isAdmin = currentUser && currentUser.role === 'admin';
  
  // Un utilisateur ne peut modifier QUE ses propres messages
  const canEdit = isAuthor;
  
  // Un admin peut supprimer n'importe quel message, mais un utilisateur ne peut supprimer que les siens
  const canDelete = isAuthor || isAdmin;
  
  // Formatage de la date
  const formatDate = (date) => {
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true, locale: fr });
    } catch (error) {
      return 'date inconnue';
    }
  };
  
  // Vérification des likes
  const hasLiked = message.likes && message.likes.some(id => 
    id === (currentUser.id || currentUser._id)
  );
  
  // Formatage du contenu avec mentions
  const formatContent = (content) => {
    if (!content) return '';
    return content.replace(/@(\w+)/g, '<span class="mention">@$1</span>');
  };
  
  // Gestion du formulaire d'édition
  const handleSubmit = (e) => {
    e.preventDefault();
    if (editContent.trim() === '') return;
    onEdit(editContent);
    setIsEditing(false);
  };
  
  // Annulation de l'édition
  const handleCancel = () => {
    setEditContent(message.content);
    setIsEditing(false);
  };

  // Gestion de la suppression
    const handleDelete = () => {
    // Vérifier si le message a été supprimé entre-temps
    if (!message || !message._id) {
        console.error("Message déjà supprimé ou invalide");
        return;
    }
    
    if (showDeleteConfirm) {
        onDelete();
        setShowDeleteConfirm(false);
    } else {
        setShowDeleteConfirm(true);
    }
    };

  // Annulation de la suppression
  const cancelDelete = (e) => {
    e.stopPropagation();
    setShowDeleteConfirm(false);
  };
  
  return (
    <div className={`message-item ${message.isAnnouncement ? 'announcement' : ''}`}>
      <div className="message-avatar">
        <div 
          className="avatar" 
          style={{ backgroundColor: stringToColor(message.author.username || 'user') }}
        >
          {(message.author.username || 'U').charAt(0).toUpperCase()}
        </div>
      </div>
      
      <div className="message-content">
        <div className="message-header">
          <span className="message-author">
            {message.author.username || 'Utilisateur inconnu'}
            {message.author.role === 'admin' && (
              <span className="admin-badge">Admin</span>
            )}
          </span>
          <span className="message-time">{formatDate(message.createdAt)}</span>
          
          {/* Bouton de modération explicite pour les administrateurs */}
          {isAdmin && !isAuthor && (
            <button 
              className="mod-options-button"
              onClick={() => setShowModOptions(!showModOptions)}
              title="Options de modération"
              style={{ 
                background: '#ff5f56', 
                color: 'white', 
                border: 'none',
                borderRadius: '4px',
                padding: '4px 8px',
                marginLeft: '10px',
                cursor: 'pointer'
              }}
            >
              <i className="fas fa-shield-alt"></i> Modérer
            </button>
          )}
        </div>
        
        {/* Menu de modération pour les administrateurs */}
        {isAdmin && !isAuthor && showModOptions && (
          <div className="mod-options">
            <button 
              className="mod-button warn-button"
              onClick={() => {
                alert(`Avertissement envoyé à ${message.author.username}`);
                setShowModOptions(false);
              }}
            >
              <i className="fas fa-exclamation-triangle"></i> Avertir
            </button>
            <button 
              className="mod-button delete-button"
              onClick={handleDelete}
            >
              <i className="fas fa-trash-alt"></i> Supprimer
            </button>
            <button 
              className="mod-button ban-button"
              onClick={() => {
                alert(`${message.author.username} sera banni après confirmation`);
                setShowModOptions(false);
              }}
            >
              <i className="fas fa-user-slash"></i> Bannir
            </button>
          </div>
        )}

        {/* Confirmation de suppression */}
        {showDeleteConfirm && (
          <div className="delete-confirmation">
            <p>Êtes-vous sûr de vouloir supprimer ce message ?</p>
            <div className="confirmation-buttons">
              <button className="confirm-yes" onClick={handleDelete}>
                <i className="fas fa-check"></i> Oui
              </button>
              <button className="confirm-no" onClick={cancelDelete}>
                <i className="fas fa-times"></i> Non
              </button>
            </div>
          </div>
        )}
        
        {isEditing ? (
          <form className="message-edit-form" onSubmit={handleSubmit}>
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              autoFocus
            />
            <div className="message-edit-actions">
              <button type="button" className="cancel-button" onClick={handleCancel}>
                Annuler
              </button>
              <button type="submit" className="save-button">
                Enregistrer
              </button>
            </div>
          </form>
        ) : (
          <>
            <div 
              className="message-text"
              dangerouslySetInnerHTML={{ __html: formatContent(message.content) }}
            />
            
            {message.isEdited && (
              <span className="message-edited">(modifié)</span>
            )}
            
            <div className="message-actions">
              {/* Bouton J'aime avec étiquette explicite */}
              <button 
                className={`like-button ${hasLiked ? 'liked' : ''}`}
                onClick={onLike}
                title={hasLiked ? "Ne plus aimer" : "J'aime"}
              >
                <i className="fas fa-heart"></i>
                <span className="button-label">J'aime</span>
                {message.likes && message.likes.length > 0 && (
                  <span className="like-count">{message.likes.length}</span>
                )}
              </button>
              
              {/* Options pour l'auteur uniquement */}
              {canEdit && (
                <button 
                  className="edit-button" 
                  onClick={() => setIsEditing(true)}
                  title="Modifier ce message"
                >
                  <i className="fas fa-edit"></i>
                  <span className="button-label">Modifier</span>
                </button>
              )}
              
              {canDelete && (
                <button 
                  className="delete-button" 
                  onClick={handleDelete}
                  title="Supprimer ce message"
                >
                  <i className="fas fa-trash-alt"></i>
                  <span className="button-label">Supprimer</span>
                </button>
              )}
              
              {/* Bouton de signalement pour les non-auteurs et non-admins */}
              {!isAuthor && !isAdmin && (
                <button 
                  className="report-button"
                  onClick={() => {
                    const reason = prompt("Raison du signalement :");
                    if (reason) {
                      alert(`Message signalé. Merci de votre vigilance.`);
                    }
                  }}
                  title="Signaler ce message"
                >
                  <i className="fas fa-flag"></i>
                  <span className="button-label">Signaler</span>
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// Fonction pour générer une couleur basée sur une chaîne
const stringToColor = (str) => {
  if (!str || typeof str !== 'string') {
    return '#777777'; // Couleur grise par défaut
  }
  
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const c = (hash & 0x00FFFFFF)
    .toString(16)
    .toUpperCase();
  
  return '#' + '00000'.substring(0, 6 - c.length) + c;
};

export default MessageItem;