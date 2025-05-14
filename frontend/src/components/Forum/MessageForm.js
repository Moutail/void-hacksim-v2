// src/components/Forum/MessageForm.js - Version corrigée pour éviter le problème d'affichage

import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import './Forum.css';

const MessageForm = ({ onSendMessage, currentChannel }) => {
  const [message, setMessage] = useState('');
  const [isAnnouncement, setIsAnnouncement] = useState(false);
  const [sending, setSending] = useState(false);
  const { user } = useAuth();
  const isAdmin = user && user.role === 'admin';
  
  // Gérer la soumission du formulaire
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation du message
    const trimmedMessage = message.trim();
    if (trimmedMessage === '' || sending) return;
    
    // Éviter les messages trop longs ou répétitifs
    if (trimmedMessage.length > 2000) {
      alert("Votre message est trop long. Limite de 2000 caractères.");
      return;
    }
    
    // Vérifier les caractères répétitifs (comme une longue séquence de 'd')
    const repeatedCharPattern = /(.)\1{20,}/; // 20+ occurrences consécutives d'un même caractère
    if (repeatedCharPattern.test(trimmedMessage)) {
      alert("Votre message contient trop de caractères répétitifs.");
      return;
    }
    
    try {
      setSending(true);
      
      // Envoyer le message
      await onSendMessage(trimmedMessage, isAnnouncement && isAdmin);
      
      // Réinitialiser le formulaire
      setMessage('');
      setIsAnnouncement(false);
    } catch (error) {
      console.error('Erreur lors de l\'envoi du message:', error);
      alert("Erreur lors de l'envoi du message. Veuillez réessayer.");
    } finally {
      setSending(false);
    }
  };
  
  return (
    <form className="message-form" onSubmit={handleSubmit}>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder={`Écrivez votre message dans #${currentChannel}...`}
        rows={3}
        disabled={sending}
        maxLength={2000} // Limitation côté client
      />
      
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