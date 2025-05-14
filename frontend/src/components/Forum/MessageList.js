// src/components/Forum/MessageList.js - Liste des messages avec fonctionnalité de suppression admin

import React, { useRef, useEffect } from 'react';
import MessageItem from './MessageItem';
import './Forum.css';

const MessageList = ({
  messages,
  loading,
  onDeleteMessage,
  onAdminDeleteMessage, // Nouvelle prop pour la suppression admin
  onEditMessage,
  onLikeMessage,
  loadMoreMessages,
  hasMoreMessages,
  currentChannel,
  currentUser,
  isAdmin // Prop pour vérifier si l'utilisateur est admin
}) => {
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  
  // Faire défiler vers le bas quand de nouveaux messages sont ajoutés
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
  
  return (
    <div 
      className="message-list"
      ref={messagesContainerRef}
      onScroll={handleScroll}
    >
      {hasMoreMessages && (
        <div className="load-more-messages">
          <button onClick={loadMoreMessages} disabled={loading}>
            {loading ? 'Chargement...' : 'Charger plus de messages'}
          </button>
        </div>
      )}
      
      {loading && messages.length === 0 && (
        <div className="loading-messages">
          <div className="spinner"></div>
          <p>Chargement des messages...</p>
        </div>
      )}
      
      {!loading && messages.length === 0 && (
        <div className="empty-messages">
          <p>Aucun message dans ce canal. Soyez le premier à écrire !</p>
        </div>
      )}
      
      {messages.map(message => (
        <MessageItem
          key={message._id}
          message={message}
          currentUser={currentUser}
          onDelete={() => {
            // Si l'utilisateur est l'auteur, utiliser la suppression normale
            // Si l'utilisateur est admin mais pas l'auteur, utiliser la suppression admin
            if (currentUser.id === message.author._id) {
              onDeleteMessage(message._id);
            } else if (isAdmin) {
              onAdminDeleteMessage(message._id);
            }
          }}
          onEdit={(content) => onEditMessage(message._id, content)}
          onLike={() => onLikeMessage(message._id)}
          onReport={(reason) => {
            // Implémentation future du signalement
            console.log(`Message ${message._id} signalé: ${reason}`);
          }}
          isAdmin={isAdmin} // Passer le statut admin au MessageItem
        />
      ))}
      
      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageList;