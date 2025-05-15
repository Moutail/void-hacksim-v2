// src/components/Forum/MessageList.js - Version complète avec recherche et filtrage
import React, { useRef, useEffect, useState } from 'react';
import MessageItem from './MessageItem';
import './Forum.css';

const MessageList = ({
  messages,
  loading,
  onDeleteMessage,
  onAdminDeleteMessage,
  onEditMessage,
  onLikeMessage,
  onReplyMessage,
  onReportMessage,
  loadMoreMessages,
  hasMoreMessages,
  currentChannel,
  currentUser,
  isAdmin,
  lastReadPosition
}) => {
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    showOnlyMentions: false,
    fromUser: ''
  });
  
  // Scroll vers le bas pour les nouveaux messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);
  
  // Gérer le défilement pour charger plus de messages
  const handleScroll = () => {
    if (!messagesContainerRef.current) return;
    
    const { scrollTop } = messagesContainerRef.current;
    
    // Si on est près du haut, charger plus de messages
    if (scrollTop < 50 && hasMoreMessages && !loading) {
      loadMoreMessages();
    }
  };
  
  // Filtrer les messages
  const filteredMessages = messages.filter(message => {
    // Filtre de recherche textuelle
    if (searchTerm && !message.content.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    
    // Filtre par mentions
    if (filters.showOnlyMentions && !message.content.includes(`@${currentUser.username}`)) {
      return false;
    }
    
    // Filtre par utilisateur
    if (filters.fromUser && message.author.username !== filters.fromUser) {
      return false;
    }
    
    return true;
  });
  
  // Trouver la position de dernière lecture
  const lastReadIndex = lastReadPosition 
    ? messages.findIndex(msg => msg._id === lastReadPosition) 
    : -1;
  
  // Grouper les messages par auteur pour une meilleure lisibilité
  const groupedMessages = [];
  let currentGroup = [];
  
  filteredMessages.forEach((message, index) => {
    if (index === 0) {
      currentGroup.push(message);
    } else {
      // Si le message précédent est du même auteur et dans les 5 minutes, on le groupe
      const prevMessage = filteredMessages[index - 1];
      const sameAuthor = prevMessage.author._id === message.author._id;
      const timeDiff = Math.abs(
        new Date(message.createdAt) - new Date(prevMessage.createdAt)
      ) / 60000; // Différence en minutes
      
      if (sameAuthor && timeDiff < 5 && !message.replyTo) {
        currentGroup.push(message);
      } else {
        groupedMessages.push([...currentGroup]);
        currentGroup = [message];
      }
    }
  });
  
  if (currentGroup.length > 0) {
    groupedMessages.push(currentGroup);
  }
  
  // Réinitialiser les filtres
  const resetFilters = () => {
    setSearchTerm('');
    setFilters({
      showOnlyMentions: false,
      fromUser: ''
    });
  };
  
  return (
    <>
      {/* Barre de recherche et filtres */}
      <div className="message-list-toolbar">
        <div className="search-container">
          <input
            type="text"
            placeholder="Rechercher dans les messages..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button className="search-button">
            <i className="fas fa-search"></i>
          </button>
        </div>
        
        <div className="filter-options">
          <button 
            className={`filter-button ${filters.showOnlyMentions ? 'active' : ''}`}
            onClick={() => setFilters(prev => ({ ...prev, showOnlyMentions: !prev.showOnlyMentions }))}
            title="Afficher uniquement les messages qui vous mentionnent"
          >
            <i className="fas fa-at"></i> Mes mentions
          </button>
          
          {(searchTerm || filters.showOnlyMentions || filters.fromUser) && (
            <button 
              className="filter-reset"
              onClick={resetFilters}
              title="Réinitialiser les filtres"
            >
              <i className="fas fa-times"></i> Réinitialiser
            </button>
          )}
        </div>
      </div>
      
      {/* Liste des messages */}
      <div 
        className="message-list"
        ref={messagesContainerRef}
        onScroll={handleScroll}
      >
        {/* Bouton de chargement de messages supplémentaires */}
        {hasMoreMessages && (
          <div className="load-more-messages">
            <button onClick={loadMoreMessages} disabled={loading}>
              {loading ? 'Chargement...' : 'Charger plus de messages'}
            </button>
          </div>
        )}
        
        {/* Indicateur de chargement */}
        {loading && messages.length === 0 && (
          <div className="loading-messages">
            <div className="spinner"></div>
            <p>Chargement des messages...</p>
          </div>
        )}
        
        {/* Message si aucun message */}
        {!loading && filteredMessages.length === 0 && (
          <div className="empty-messages">
            {searchTerm || filters.showOnlyMentions || filters.fromUser ? (
              <p>Aucun message ne correspond aux critères de recherche.</p>
            ) : (
              <p>Aucun message dans ce canal. Soyez le premier à écrire !</p>
            )}
          </div>
        )}
        
        {/* Indicateur de nouveaux messages */}
        {lastReadIndex > 0 && (
          <div className="new-messages-divider">
            <span>Nouveaux messages ({lastReadIndex})</span>
          </div>
        )}
        
        {/* Affichage des groupes de messages */}
        {groupedMessages.map((group, groupIndex) => (
          <div key={`group-${groupIndex}`} className="message-group">
            {group.map((message, messageIndex) => {
              // Déterminer si c'est un nouveau message
              const isNewMessage = lastReadIndex > 0 && 
                messages.indexOf(message) < lastReadIndex;
              
              return (
                <MessageItem
                  key={message._id}
                  message={message}
                  currentUser={currentUser}
                  onDelete={() => {
                    if (currentUser.id === message.author._id || currentUser._id === message.author._id) {
                      onDeleteMessage(message._id);
                    } else if (isAdmin) {
                      onAdminDeleteMessage(message._id);
                    }
                  }}
                  onEdit={(content) => onEditMessage(message._id, content)}
                  onLike={() => onLikeMessage(message._id)}
                  onReply={(msg) => onReplyMessage(msg)}
                  onReport={(reason) => onReportMessage(message._id, reason)}
                  isHighlighted={isNewMessage}
                  isAdmin={isAdmin}
                  showHeader={messageIndex === 0} // Ne montrer l'en-tête que pour le premier message du groupe
                />
              );
            })}
          </div>
        ))}
        
        <div ref={messagesEndRef} />
      </div>
    </>
  );
};

export default MessageList;
