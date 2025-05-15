// src/components/Forum/ForumContainer.js - Code corrigé sans erreurs ESLint

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import { subscribeToEvent, unsubscribeFromEvent, emitEvent, disconnectSocket, initializeSocket } from '../../utils/socketClient';
import ChannelList from './ChannelList';
import MessageList from './MessageList';
import MessageForm from './MessageForm';
import UsersList from './UsersList';
import MessageItem from './MessageItem';
import './Forum.css';

const ForumContainer = ({ initialChannel = 'general' }) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentChannel, setCurrentChannel] = useState(initialChannel);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });
  const [processedMessageIds, setProcessedMessageIds] = useState(new Set()); // Pour suivre les messages déjà traités
  const [moderationNotice, setModerationNotice] = useState(null); // Nouvel état pour les notifications de modération
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user && user.role === 'admin';
  const [replyingTo, setReplyingTo] = useState(null);
  const [activeThread, setActiveThread] = useState(null);
  const [threadReplies, setThreadReplies] = useState([]);
  const [lastReadPositions, setLastReadPositions] = useState({});
  const [socketConnected, setSocketConnected] = useState(false);

  // Charger les messages au chargement du composant et quand le canal change
  useEffect(() => {
    setProcessedMessageIds(new Set()); // Réinitialiser les IDs de messages traités quand le canal change
    
    const fetchMessages = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await api.get(`/api/messages?channel=${currentChannel}&page=${pagination.page}&limit=${pagination.limit}`);
        
        if (response.data.status === 'success') {
          const newMessages = response.data.data.messages;
          
          // Mettre à jour les messages
          setMessages(newMessages);
          
          // Stocker les IDs des messages chargés depuis l'API
          const messageIds = new Set(newMessages.map(msg => msg._id));
          setProcessedMessageIds(messageIds);
          
          setPagination(response.data.data.pagination);
        }
      } catch (err) {
        console.error('Erreur lors du chargement des messages:', err);
        setError('Erreur lors du chargement des messages. Veuillez réessayer.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchMessages();
  }, [currentChannel, pagination.page, pagination.limit]);

  // Fonction pour forcer la reconnexion Socket.io
  const forceReconnectSocket = () => {
    disconnectSocket();
    initializeSocket(user.id, localStorage.getItem('token'), setSocketConnected);
    
    // Recharger les messages
    setMessages([]);
    setPagination(prev => ({ ...prev, page: 1 }));
    setProcessedMessageIds(new Set());
  };

  // Vérification de l'état de la connexion Socket.io
  useEffect(() => {
    const checkSocketConnection = () => {
      try {
        // Utiliser isConnected de socketClient
        const isConnected = require('../../utils/socketClient').isConnected;
        setSocketConnected(isConnected());
      } catch (error) {
        console.error("Erreur lors de la vérification de la connexion Socket.io:", error);
        setSocketConnected(false);
      }
    };
    
    // Vérifier immédiatement
    checkSocketConnection();
    
    // Vérifier périodiquement
    const interval = setInterval(checkSocketConnection, 5000);
    
    return () => clearInterval(interval);
  }, []);

  // Fonction pour gérer les réponses
  const handleReplyMessage = (message) => {
    setReplyingTo(message);
    // Faire défiler jusqu'au formulaire
    const formElement = document.querySelector('.message-form');
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Fonction pour annuler une réponse
  const cancelReply = () => {
    setReplyingTo(null);
  };

  // Fonction pour ouvrir un fil de discussion
  const handleOpenThread = async (messageId) => {
    setActiveThread(messageId);
    
    try {
      // Charger les réponses à ce message
      const response = await api.get(`/api/messages/thread/${messageId}`);
      
      if (response.data.status === 'success') {
        setThreadReplies(response.data.data || []);
      } else {
        setThreadReplies([]);
      }
    } catch (err) {
      console.error('Erreur lors du chargement du fil de discussion:', err);
      setError('Erreur lors du chargement du fil de discussion.');
      setThreadReplies([]);
    }
  };

  // Fonction pour fermer un fil de discussion
  const handleCloseThread = () => {
    setActiveThread(null);
    setThreadReplies([]);
  };

  // Fonction pour envoyer une réponse dans un fil de discussion
  const handleSendThreadReply = async (parentId, content) => {
    try {
      const response = await api.post('/api/messages', {
        content,
        channel: currentChannel,
        replyTo: parentId
      });
      
      if (response.data.status === 'success') {
        const newReply = response.data.data;
        
        // Ajouter la réponse au fil de discussion
        setThreadReplies(prev => [...prev, newReply]);
        
        // Émettre l'événement via Socket.io
        emitEvent('send_message', {
          _id: newReply._id,
          channelId: currentChannel,
          content,
          replyTo: parentId,
          userId: user.id,
          username: user.username,
          role: user.role,
          timestamp: newReply.createdAt || new Date().toISOString()
        });
      }
    } catch (err) {
      console.error('Erreur lors de l\'envoi de la réponse:', err);
      setError('Erreur lors de l\'envoi de la réponse.');
    }
  };

  // Fonction pour signaler un message
  const handleReportMessage = async (messageId, reason) => {
    try {
      // Appeler l'API de signalement
      const response = await api.post(`/api/messages/${messageId}/report`, { reason });
      
      if (response.data.status === 'success') {
        // Feedback à l'utilisateur
        setModerationNotice('Message signalé. Un administrateur l\'examinera prochainement.');
        
        // Effacer la notification après 5 secondes
        setTimeout(() => {
          setModerationNotice(null);
        }, 5000);
      }
    } catch (err) {
      console.error('Erreur lors du signalement du message:', err);
      setError('Erreur lors du signalement du message.');
    }
  };

  // S'abonner aux événements de messages en temps réel
  useEffect(() => {
    // Fonction pour gérer les nouveaux messages
    const handleNewMessage = (messageData) => {
      console.log("Nouveau message reçu via Socket.io:", messageData);
      
      // Vérifier si le message appartient au canal actuel
      if (messageData.channelId === currentChannel) {
        // Vérifier si le message a déjà été traité (éviter les doublons)
        if (messageData._id && processedMessageIds.has(messageData._id)) {
          console.log("Message déjà traité, ignoré:", messageData._id);
          return; // Ignorer ce message, il est déjà dans la liste
        }
        
        // Si le message n'a pas d'ID (messages envoyés par le client actuel via Socket.io),
        // vérifier s'il existe un message avec le même contenu et la même heure
        if (!messageData._id) {
          const isDuplicate = messages.some(msg => 
            msg.content === messageData.content && 
            Math.abs(new Date(msg.createdAt) - new Date(messageData.timestamp)) < 2000 // Moins de 2 secondes de différence
          );
          
          if (isDuplicate) {
            console.log("Message potentiellement dupliqué, ignoré");
            return;
          }
        }
        
        // S'assurer que toutes les propriétés nécessaires sont présentes et correctement formatées
        const newMessage = {
          _id: messageData._id || `temp-${Date.now()}`,
          content: messageData.content,
          author: {
            _id: messageData.userId || 'unknown',
            username: messageData.username || 'Utilisateur inconnu',
            role: messageData.role || 'user'
          },
          channel: currentChannel,
          isAnnouncement: messageData.isAnnouncement || false,
          createdAt: messageData.timestamp || new Date().toISOString(),
          likes: messageData.likes || []
        };
        
        console.log("Message formaté à ajouter:", newMessage);
        
        // Ajouter ce message à la liste des messages traités
        setProcessedMessageIds(prev => {
          const updated = new Set(prev);
          updated.add(newMessage._id);
          return updated;
        });
        
        // Ajouter le message au début de la liste (les plus récents en premier)
        setMessages(prevMessages => [newMessage, ...prevMessages]);
      }
    };
    
    // Fonction pour gérer la suppression des messages
    const handleMessageDeleted = (data) => {
      console.log("Notification de suppression de message reçue:", data);
      
      const { messageId, channelId, deletedBy } = data;
      
      // Vérifier si le message appartient au canal actuel
      if (channelId === currentChannel) {
        // Supprimer le message de la liste
        setMessages(prev => prev.filter(msg => msg._id !== messageId));
        
        // Retirer l'ID du message de la liste des messages traités
        setProcessedMessageIds(prev => {
          const updated = new Set(prev);
          updated.delete(messageId);
          return updated;
        });
        
        // Afficher une notification à l'utilisateur
        if (deletedBy && deletedBy.isAdmin) {
          // Message spécial pour la suppression par un admin
          const tempNotice = `Message supprimé par l'administrateur ${deletedBy.username || 'un administrateur'}`;
          setModerationNotice(tempNotice);
          
          // Effacer la notification après quelques secondes
          setTimeout(() => {
            if (moderationNotice === tempNotice) {
              setModerationNotice(null);
            }
          }, 5000);
        }
      }
    };
    
    // Fonction pour gérer la modification des messages
    const handleMessageEdited = (data) => {
      console.log("Notification de modification de message reçue:", data);
      
      const { messageId, channelId, content, editor } = data;
      
      // Vérifier si le message appartient au canal actuel
      if (channelId === currentChannel) {
        // Mettre à jour le contenu du message dans la liste
        setMessages(prev => prev.map(msg => {
          if (msg._id === messageId) {
            return {
              ...msg,
              content: content,
              isEdited: true,
              updatedAt: new Date().toISOString()
            };
          }
          return msg;
        }));
      }
    };
    
    // S'abonner aux événements
    subscribeToEvent('new_message', handleNewMessage);
    subscribeToEvent('message_deleted', handleMessageDeleted);
    subscribeToEvent('message_edited', handleMessageEdited);
    
    // Se désabonner à la destruction du composant
    return () => {
      unsubscribeFromEvent('new_message', handleNewMessage);
      unsubscribeFromEvent('message_deleted', handleMessageDeleted);
      unsubscribeFromEvent('message_edited', handleMessageEdited);
    };
  }, [currentChannel, messages, processedMessageIds, moderationNotice]);

  // Gérer le changement de canal
  const handleChannelChange = (channel) => {
    setCurrentChannel(channel);
    setPagination(prev => ({ ...prev, page: 1 }));
    setModerationNotice(null); // Effacer les notifications de modération lors du changement de canal
  };

    // Gérer l'envoi d'un nouveau message
    const handleSendMessage = async (content, isAnnouncement = false) => {
      try {
        // Vérification que content est bien une chaîne de caractères
        if (typeof content !== 'string') {
          console.error('Type de contenu invalide:', typeof content, content);
          setError('Format de message invalide');
          return;
        }
        
        // Créer l'objet de message
        const messageData = {
          content: content,
          channel: currentChannel
        };
        
        // Ajouter le flag d'annonce si nécessaire
        if (isAnnouncement && isAdmin) {
          messageData.isAnnouncement = true;
        }
        
        // Si on répond à un message, ajouter l'ID du message parent
        if (replyingTo && replyingTo._id) {
          messageData.replyTo = replyingTo._id;
        }
        
        console.log("Envoi de message avec données:", messageData);
        
        const response = await api.post('/api/messages', messageData);
        
        if (response.data.status === 'success') {
          const newMessage = response.data.data;
          
          // Émettre le message via Socket.io avec les informations complètes
          emitEvent('send_message', {
            _id: newMessage._id,
            channelId: currentChannel,
            content: content,
            isAnnouncement: newMessage.isAnnouncement || false,
            replyTo: newMessage.replyTo || null,
            userId: user.id,
            username: user.username,
            role: user.role,
            timestamp: newMessage.createdAt || new Date().toISOString()
          });
          
          // Si on répondait à un message, annuler la réponse
          if (replyingTo) {
            setReplyingTo(null);
          }
          
          // Vérifier si le message existe déjà (peut-être ajouté par Socket.io)
          if (!processedMessageIds.has(newMessage._id)) {
            // Ajouter l'ID à la liste des messages traités
            setProcessedMessageIds(prev => {
              const updated = new Set(prev);
              updated.add(newMessage._id);
              return updated;
            });
            
            // Ajouter le message à la liste
            setMessages(prev => [newMessage, ...prev]);
          }
        }
      } catch (err) {
        console.error('Erreur lors de l\'envoi du message:', err);
        setError('Erreur lors de l\'envoi du message. Veuillez réessayer.');
      }
    };

  // Gérer la suppression d'un message
  const handleDeleteMessage = async (messageId) => {
    try {
      // 1. Appeler l'API pour supprimer le message
      const response = await api.delete(`/api/messages/${messageId}`);
      
      if (response.data.status === 'success') {
        // 2. Émettre l'événement de suppression via Socket.io
        emitEvent('delete_message', {
          messageId,
          channelId: currentChannel,
          deletedBy: {
            userId: user.id,
            username: user.username,
            isAdmin: false
          }
        });
        
        // Note: La mise à jour locale de l'interface sera gérée par l'événement socket
        // qui sera reçu par tous les clients, y compris celui-ci
      }
    } catch (err) {
      console.error('Erreur lors de la suppression du message:', err);
      setError('Erreur lors de la suppression du message. Veuillez réessayer.');
    }
  };

  // Gérer la suppression d'un message par un administrateur
  const handleAdminDeleteMessage = async (messageId) => {
    if (!isAdmin) {
      console.error("Tentative de suppression admin par un utilisateur non-admin");
      return;
    }
    
    try {
      // Assurez-vous que messageId est valide
      if (!messageId || typeof messageId !== 'string') {
        console.error("ID de message invalide:", messageId);
        setError("ID de message invalide");
        return;
      }
      
      // Déboguer l'ID du message
      console.log("Tentative de suppression admin du message:", messageId);
      
      // Utiliser l'endpoint standard avec un flag admin
      const response = await api.delete(`/api/messages/${messageId}`, {
        data: { 
          isAdminAction: true,
          adminId: user.id,
          adminUsername: user.username
        }
      });
      
      if (response.data.status === 'success') {
        // Émettre l'événement de suppression via Socket.io avec flag admin
        emitEvent('delete_message', {
          messageId,
          channelId: currentChannel,
          isAdminAction: true,
          deletedBy: {
            userId: user.id,
            username: user.username,
            isAdmin: true
          }
        });
        
        // Message de confirmation
        setError(null);
        setError("Message supprimé avec succès par modération.");
        
        // Effacer le message après 3 secondes
        setTimeout(() => {
          setError(null);
        }, 3000);
      }
    } catch (err) {
      console.error('Erreur lors de la modération du message:', err);
      
      // Message d'erreur détaillé pour le débogage
      if (err.response) {
        console.error('Réponse d\'erreur:', err.response.data);
        console.error('Code d\'état:', err.response.status);
        setError(`Erreur (${err.response.status}): ${err.response.data.message || 'Erreur lors de la modération'}`);
      } else if (err.request) {
        console.error('Pas de réponse reçue:', err.request);
        setError('Le serveur n\'a pas répondu. Vérifiez votre connexion.');
      } else {
        console.error('Erreur de requête:', err.message);
        setError('Erreur lors de la modération du message. Veuillez réessayer.');
      }
    }
  };

  // Gérer la modification d'un message
  const handleEditMessage = async (messageId, content) => {
    try {
      const response = await api.put(`/api/messages/${messageId}`, { content });
      
      if (response.data.status === 'success') {
        // Émettre l'événement de modification via Socket.io
        emitEvent('edit_message', {
          messageId,
          channelId: currentChannel,
          content,
          editor: {
            id: user.id,
            username: user.username,
            isAdmin: isAdmin
          }
        });
        
        // Note: La mise à jour locale de l'interface sera gérée par l'événement socket
        // qui sera reçu par tous les clients, y compris celui-ci
      }
    } catch (err) {
      console.error('Erreur lors de la modification du message:', err);
      setError('Erreur lors de la modification du message. Veuillez réessayer.');
    }
  };

  // Gérer le like d'un message
  const handleLikeMessage = async (messageId) => {
    try {
      const response = await api.post(`/api/messages/${messageId}/like`);
      
      if (response.data.status === 'success') {
        // Mettre à jour le nombre de likes dans la liste
        setMessages(prev => prev.map(msg => {
          if (msg._id === messageId) {
            return {
              ...msg,
              likes: response.data.data.liked 
                ? [...(msg.likes || []), user.id] // Ajouter l'ID utilisateur
                : (msg.likes || []).filter(id => id !== user.id) // Retirer l'ID utilisateur
            };
          }
          return msg;
        }));
        
        // Émettre l'événement de like via Socket.io
        emitEvent('like_message', {
          messageId,
          channelId: currentChannel,
          likes: response.data.data.likes,
          liked: response.data.data.liked,
          userId: user.id,
          username: user.username
        });
      }
    } catch (err) {
      console.error('Erreur lors du like/unlike du message:', err);
      setError('Erreur lors du like/unlike du message. Veuillez réessayer.');
    }
  };

  // Charger plus de messages (pagination)
  const loadMoreMessages = () => {
    if (pagination.page < pagination.totalPages) {
      setPagination(prev => ({ ...prev, page: prev.page + 1 }));
    }
  };

  return (
    <div className="forum-container">
      <div className="forum-sidebar">
        <ChannelList 
          currentChannel={currentChannel} 
          onChannelChange={handleChannelChange}
          unreadCounts={lastReadPositions} // Pour afficher les badges de messages non lus
        />
        <UsersList currentChannel={currentChannel} />
      </div>
      
      <div className="forum-content">
        <div className="forum-header">
          <h2>#{currentChannel}</h2>
          <div className="forum-header-controls">
            {/* Indicateur de connexion Socket */}
            <div className={`socket-status ${socketConnected ? 'connected' : 'disconnected'}`}>
              <span className="status-dot"></span>
              {socketConnected ? 'En ligne' : 'Hors ligne'}
            </div>
            
            <button className="back-button" onClick={() => navigate('/dashboard')}>
              <i className="fas fa-arrow-left"></i> Retour
            </button>
          </div>
        </div>
        
        {/* Message d'erreur */}
        {error && <div className="error-message">{error}</div>}
        
        {/* Notification de modération */}
        {moderationNotice && (
          <div className="moderation-notice">
            <i className="fas fa-shield-alt"></i> {moderationNotice}
            <button onClick={() => setModerationNotice(null)}>
              <i className="fas fa-times"></i>
            </button>
          </div>
        )}
        
        {/* Bouton de reconnexion quand Socket.io est déconnecté */}
        {!socketConnected && (
          <div className="socket-warning">
            <i className="fas fa-exclamation-triangle"></i> 
            Mode hors ligne - Les mises à jour en temps réel sont désactivées
            <button onClick={forceReconnectSocket}>
              <i className="fas fa-sync-alt"></i> Reconnecter
            </button>
          </div>
        )}
        
        {/* Liste des messages principale */}
        <MessageList 
          messages={messages} 
          loading={loading} 
          onDeleteMessage={handleDeleteMessage}
          onAdminDeleteMessage={handleAdminDeleteMessage}
          onEditMessage={handleEditMessage}
          onLikeMessage={handleLikeMessage}
          onReplyMessage={handleReplyMessage}
          onReportMessage={handleReportMessage}
          onOpenThread={handleOpenThread}
          loadMoreMessages={loadMoreMessages}
          hasMoreMessages={pagination.page < pagination.totalPages}
          currentChannel={currentChannel}
          currentUser={user}
          isAdmin={isAdmin}
          lastReadPosition={lastReadPositions[currentChannel]}
        />
        
        {/* Modal de fil de discussion (thread) */}
        {activeThread && (
          <div className="thread-overlay">
            <div className="thread-container">
              <div className="thread-header">
                <h3>Discussion</h3>
                <button className="close-thread" onClick={handleCloseThread}>
                  <i className="fas fa-times"></i>
                </button>
              </div>
              
              <div className="thread-content">
                {/* Message original */}
                <div className="original-message">
                  {messages.find(msg => msg._id === activeThread) && (
                    <MessageItem 
                      message={messages.find(msg => msg._id === activeThread)} 
                      currentUser={user}
                      onLike={handleLikeMessage}
                      isInThread={true}
                      isAdmin={isAdmin}
                    />
                  )}
                </div>
                
                <div className="thread-replies">
                  {/* Réponses au message */}
                  {threadReplies.length === 0 ? (
                    <p className="no-replies">Aucune réponse à ce message.</p>
                  ) : (
                    threadReplies.map(reply => (
                      <MessageItem 
                        key={reply._id}
                        message={reply}
                        currentUser={user}
                        onDelete={() => handleDeleteMessage(reply._id)}
                        onEdit={(content) => handleEditMessage(reply._id, content)}
                        onLike={() => handleLikeMessage(reply._id)}
                        isInThread={true}
                        isAdmin={isAdmin}
                      />
                    ))
                  )}
                </div>
              </div>
              
              {/* Formulaire de réponse dans le thread */}
              <div className="thread-reply-form">
                <MessageForm 
                  onSendMessage={(content) => handleSendThreadReply(activeThread, content)}
                  currentChannel={currentChannel}
                  isThreadReply={true}
                />
              </div>
            </div>
          </div>
        )}
        
        {/* Formulaire d'envoi de message */}
        <MessageForm 
          onSendMessage={handleSendMessage}
          currentChannel={currentChannel}
          replyingTo={replyingTo}
          onCancelReply={cancelReply}
        />
      </div>
    </div>
  );
};

export default ForumContainer;
