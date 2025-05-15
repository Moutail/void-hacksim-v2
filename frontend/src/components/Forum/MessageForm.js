// src/components/Forum/MessageForm.js - Version corrigée
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import './Forum.css';

const MessageForm = ({ onSendMessage, currentChannel, replyingTo, onCancelReply, isThreadReply = false }) => {
  const [message, setMessage] = useState('');
  const [isAnnouncement, setIsAnnouncement] = useState(false);
  const [sending, setSending] = useState(false);
  const textareaRef = useRef(null);
  
  const { user } = useAuth();
  const isAdmin = user && user.role === 'admin';
  
  // Charger le brouillon sauvegardé au changement de canal
  useEffect(() => {
    if (!isThreadReply && !replyingTo) {
      const savedDraft = localStorage.getItem(`draft_${currentChannel}`);
      if (savedDraft) {
        setMessage(savedDraft);
      }
    }
    
    // Focus sur le textarea si on répond à un message
    if (replyingTo && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [currentChannel, replyingTo, isThreadReply]);
  
  // Sauvegarder le brouillon lors de l'écriture
  useEffect(() => {
    if (isThreadReply || replyingTo) return;
    
    const interval = setInterval(() => {
      if (message.trim()) {
        localStorage.setItem(`draft_${currentChannel}`, message);
      }
    }, 3000);
    
    return () => {
      clearInterval(interval);
      // Sauvegarder en quittant
      if (message.trim()) {
        localStorage.setItem(`draft_${currentChannel}`, message);
      }
    };
  }, [message, currentChannel, replyingTo, isThreadReply]);
  
  // Gérer la soumission du formulaire
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation du message
    const trimmedMessage = message.trim();
    if (trimmedMessage === '' || sending) return;
    
    // Éviter les messages trop longs
    if (trimmedMessage.length > 2000) {
      alert("Votre message est trop long. Limite de 2000 caractères.");
      return;
    }
    
    try {
      setSending(true);
      
      // Important: Envoyer uniquement une chaîne de caractères comme contenu
      // et non un objet complet
      await onSendMessage(trimmedMessage, isAnnouncement && isAdmin);
      
      // Réinitialiser le formulaire
      setMessage('');
      setIsAnnouncement(false);
      
      // Supprimer le brouillon
      if (!isThreadReply) {
        localStorage.removeItem(`draft_${currentChannel}`);
      }
      
      // Annuler la réponse si applicable
      if (replyingTo && onCancelReply) {
        onCancelReply();
      }
    } catch (error) {
      console.error('Erreur lors de l\'envoi du message:', error);
      alert("Erreur lors de l'envoi du message. Veuillez réessayer.");
    } finally {
      setSending(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="message-form">
      {replyingTo && (
        <div className="reply-info">
          <span>Réponse à {replyingTo.author.username}:</span>
          <button type="button" className="cancel-reply" onClick={onCancelReply}>
            <i className="fas fa-times"></i>
          </button>
        </div>
      )}
      
      <div className="textarea-container">
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={`Écrivez votre message dans #${currentChannel}...`}
          rows={3}
          disabled={sending}
          maxLength={2000}
        />
      </div>
      
      <div className="message-form-actions">
        {isAdmin && currentChannel === 'announcements' && (
          <label className="announcement-checkbox">
            <input
              type="checkbox"
              checked={isAnnouncement}
              onChange={(e) => setIsAnnouncement(e.target.checked)}
              disabled={sending}
            />
            <span>Marquer comme annonce importante</span>
          </label>
        )}
        
        <div className="message-controls">
          <div className="message-length">
            {message.length}/2000
          </div>
          
          <button 
            type="submit"
            className={`send-button ${sending ? 'sending' : ''}`}
            disabled={message.trim() === '' || sending}
          >
            {sending ? (
              <>
                <i className="fas fa-spinner fa-spin"></i>
                Envoi...
              </>
            ) : (
              <>
                <i className="fas fa-paper-plane"></i>
                Envoyer
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
};

export default MessageForm;
