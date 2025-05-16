// src/components/Challenge/Challenge.js - Version complète améliorée avec Socket.io

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import api from '../../utils/api';
import Terminal from '../Terminal/Terminal';
import ObjectivesList from './ObjectivesList';
import './Challenge.css';

const Challenge = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [challenge, setChallenge] = useState(null);
  const [attempt, setAttempt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showInstructions, setShowInstructions] = useState(true);
  const [terminalActive, setTerminalActive] = useState(true);
  const [objectivesCompleted, setObjectivesCompleted] = useState([]);
  const [currentDirectory, setCurrentDirectory] = useState('/');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [socket, setSocket] = useState(null);
  const [alreadyCompleted, setAlreadyCompleted] = useState(false);

  // Charger le défi et l'état actuel
  useEffect(() => {
    const loadChallenge = async () => {
      try {
        setLoading(true);
        
        // Récupérer les données du défi et de la tentative en cours
        const response = await api.get(`/api/challenges/${id}`);
        
        if (response.data.status === 'success') {
          console.log("Données du défi chargées:", response.data.data);
          
          setChallenge(response.data.data.challenge);
          setAttempt(response.data.data.attemptId);
          
          // Vérifier si ce défi a déjà été complété par l'utilisateur
          if (response.data.data.isAlreadyCompleted) {
            setAlreadyCompleted(true);
          }
          
          // Initialiser les objectifs complétés
          // Transformer les objectifs pour marquer ceux déjà complétés
          const completedIds = response.data.data.challenge.objectives
            .filter(obj => obj.completed)
            .map(obj => obj._id);
          
          console.log("Objectifs marqués comme complétés:", completedIds);
          setObjectivesCompleted(completedIds);
        }
      } catch (error) {
        console.error('Erreur lors du chargement du défi:', error);
        setError(
          error.response?.data?.message || 
          'Erreur lors du chargement du défi. Veuillez réessayer.'
        );
      } finally {
        setLoading(false);
      }
    };
    
    loadChallenge();
  }, [id]);

  // Initialiser et configurer Socket.io
  useEffect(() => {
    // Récupérer le socket global de l'application (ou en créer un nouveau)
    const newSocket = window.globalSocket || io();
    
    // Si c'est un nouveau socket, le stocker globalement
    if (!window.globalSocket) {
      window.globalSocket = newSocket;
    }
    
    setSocket(newSocket);
    
    // S'assurer que l'utilisateur est connecté au socket
    const userId = localStorage.getItem('userId');
    if (!newSocket.connected) {
      newSocket.connect();
      newSocket.emit('authenticate', { userId });
    }
    
    // Rejoindre la salle du défi
    if (id) {
      newSocket.emit('join_challenge', { challengeId: id });
      console.log(`Rejointe à la salle du défi ${id}`);
    }
    
    // Écouter les mises à jour d'objectifs
    const handleObjectivesUpdate = (data) => {
       console.log('[Socket.io Client] Mise à jour des objectifs reçue:', data);
       if (data.challengeId !== id) {
      console.log('[Socket.io Client] Mise à jour ignorée, challengeId ne correspond pas:', data.challengeId, id);
      return;
    }
      
      console.log('Mise à jour des objectifs reçue via socket:', data);
      
      // Mise à jour des objectifs complétés
      const newlyCompletedIds = data.completedObjectives.map(obj => obj.objectiveId);
      
      setObjectivesCompleted(prevIds => {
        const updatedIds = [...prevIds];
        
        // Ajouter les nouveaux objectifs complétés
        newlyCompletedIds.forEach(objId => {
          if (!updatedIds.includes(objId)) {
            updatedIds.push(objId);
          }
        });
        
        console.log('Liste mise à jour des objectifs complétés via socket:', updatedIds);
        return updatedIds;
      });
      
      // Mettre à jour le state du challenge
      setChallenge(prevChallenge => {
        if (!prevChallenge) return null;
        
        const updatedObjectives = prevChallenge.objectives.map(obj => {
          if (newlyCompletedIds.includes(obj._id)) {
            return { ...obj, completed: true };
          }
          return obj;
        });
        
        return { ...prevChallenge, objectives: updatedObjectives };
      });
      
      // Force un re-rendu du composant ObjectivesList
      setRefreshTrigger(prev => prev + 1);
    };

    
    
    // Écouter la complétion du défi
    const handleChallengeCompleted = (data) => {
      if (data.challengeId !== id) return;
      
      console.log('Défi complété via socket!', data);
      
      // Afficher le message de félicitations après un court délai
      setTimeout(() => {
        showChallengeCompleteModal();
      }, 1500);
    };

     // Écouter l'événement de secours (global)
  const handleGlobalObjectivesUpdate = (data) => {
    console.log('[Socket.io Client] Mise à jour globale des objectifs reçue:', data);
    
    if (data.challengeId !== id) {
      console.log('[Socket.io Client] Mise à jour globale ignorée, challengeId ne correspond pas');
      return;
    }
    
    // Même traitement que handleObjectivesUpdate
    const newlyCompletedIds = data.completedObjectives.map(obj => obj.objectiveId);
    
    setObjectivesCompleted(prevIds => {
      const updatedIds = [...prevIds];
      newlyCompletedIds.forEach(objId => {
        if (!updatedIds.includes(objId)) {
          updatedIds.push(objId);
        }
      });
      return updatedIds;
    });
    
    setChallenge(prevChallenge => {
      if (!prevChallenge) return null;
      const updatedObjectives = prevChallenge.objectives.map(obj => {
        if (newlyCompletedIds.includes(obj._id)) {
          return { ...obj, completed: true };
        }
        return obj;
      });
      return { ...prevChallenge, objectives: updatedObjectives };
    });
    
    setRefreshTrigger(prev => prev + 1);
  };

  // Vérifier la connexion Socket.io
  const checkSocketConnection = () => {
    console.log('[Socket.io Client] État de la connexion:', newSocket.connected);
    
    if (!newSocket.connected) {
      console.log('[Socket.io Client] Tentative de reconnexion...');
      newSocket.connect();
    }
  };
  
  // Ajouter un intervalle pour vérifier la connexion périodiquement
  const connectionInterval = setInterval(checkSocketConnection, 10000);
  
  // Écouter les événements de connexion
  newSocket.on('connect', () => {
    console.log('[Socket.io Client] Connecté!');
    
    // Rejoindre la salle immédiatement après connexion
    newSocket.emit('join_challenge', { challengeId: id });
    console.log(`[Socket.io Client] Demande de rejoindre la salle du défi ${id}`);
  });
  
  newSocket.on('disconnect', () => {
    console.log('[Socket.io Client] Déconnecté!');
  });
  
  newSocket.on('connect_error', (error) => {
    console.log('[Socket.io Client] Erreur de connexion:', error);
  });
    
   // Ajouter les écouteurs d'événements
  newSocket.on('challenge_objectives_updated', handleObjectivesUpdate);
  newSocket.on('challenge_objectives_updated_global', handleGlobalObjectivesUpdate);
  newSocket.on('challenge_completed', handleChallengeCompleted);
    
    // Fonction de nettoyage - retirer les écouteurs lors du démontage
    return () => {
       clearInterval(connectionInterval);
        newSocket.off('challenge_objectives_updated', handleObjectivesUpdate);
        newSocket.off('challenge_objectives_updated_global', handleGlobalObjectivesUpdate);
        newSocket.off('challenge_completed', handleChallengeCompleted);
        newSocket.off('connect');
        newSocket.off('disconnect');
        newSocket.off('connect_error');
      
      // Quitter la salle du défi
      if (id) {
        newSocket.emit('leave_challenge', { challengeId: id });
      }
    };
  }, [id]); // Dépendance sur l'ID du défi
  
    // Fonction pour forcer le rafraîchissement de tous les objectifs
    const refreshObjectives = async () => {
    try {
      console.log(`[Refresh] Rafraîchissement des objectifs pour le défi ${id}`);
      const response = await api.get(`/api/challenges/${id}`);
      
      if (response.data.status === 'success') {
        const newCompletedIds = response.data.data.challenge.objectives
          .filter(obj => obj.completed)
          .map(obj => obj._id);
        
        // Vérifier s'il y a des changements
        const hasChanges = newCompletedIds.length !== objectivesCompleted.length ||
          newCompletedIds.some(id => !objectivesCompleted.includes(id));
        
        if (hasChanges) {
          console.log('[Refresh] Nouveaux objectifs complétés trouvés:', 
            newCompletedIds.filter(id => !objectivesCompleted.includes(id)));
            
          setObjectivesCompleted(newCompletedIds);
          setChallenge(response.data.data.challenge);
          setRefreshTrigger(prev => prev + 1);
        }
      }
    } catch (error) {
      console.error('[Refresh] Erreur lors du rafraîchissement des objectifs:', error);
    }
  };

  // Gérer l'exécution d'une commande
  const handleCommandExecute = async (commandResult) => {
    try {
      // Si commandResult est une chaîne (ancienne version), convertir en objet
      let command = typeof commandResult === 'string' ? commandResult : commandResult.command;
      console.log("Exécution de la commande:", commandResult);
      console.log("État actuel: challengeId =", id, ", attemptId =", attempt);
      
      // Exécuter la commande via l'API avec les informations du défi
      const response = await api.post(`/api/terminal/execute`, {
        command,
        currentDirectory,
        challengeId: id,
        attemptId: attempt
      });
      
      if (response.data.status === 'success') {
        console.log("Réponse du serveur:", response.data);
        
        // Mettre à jour le répertoire courant si nécessaire
        if (response.data.data.newDirectory !== currentDirectory) {
          setCurrentDirectory(response.data.data.newDirectory);
        }
        
        // Mettre à jour le système de fichiers dans le Terminal
        if (response.data.filesystem) {
          console.log("Système de fichiers mis à jour reçu du serveur");
        }
        
        // Vérifier si des objectifs ont été complétés
        if (response.data.data.objectivesUpdated) {
          console.log("Objectifs mis à jour:", response.data.data.objectivesCompleted);
          
          // Mise à jour des objectifs complétés
          const newlyCompletedIds = response.data.data.objectivesCompleted
            .map(obj => obj.objectiveId);
          
          setObjectivesCompleted(prevIds => {
            const updatedIds = [...prevIds];
            
            // Ajouter les nouveaux objectifs complétés
            newlyCompletedIds.forEach(id => {
              if (!updatedIds.includes(id)) {
                updatedIds.push(id);
              }
            });
            
            console.log("Liste mise à jour des objectifs complétés:", updatedIds);
            return updatedIds;
          });
          
          // Mettre à jour le state du challenge pour forcer un re-rendu
          setChallenge(prevChallenge => {
            if (!prevChallenge) return null;
            
            const updatedObjectives = prevChallenge.objectives.map(obj => {
              if (newlyCompletedIds.includes(obj._id)) {
                return { ...obj, completed: true };
              }
              return obj;
            });
            
            return { ...prevChallenge, objectives: updatedObjectives };
          });
          
          // Forcer le rafraîchissement du composant ObjectivesList
          setRefreshTrigger(prev => prev + 1);
          
          // Si tous les objectifs sont complétés, afficher un message de succès
          if (response.data.data.allObjectivesCompleted) {
            // Dans ce cas, nous laissons Socket.io gérer l'événement de complétion
            // car l'événement sera envoyé par le serveur via socket
            
            // Néanmoins, nous pouvons rafraîchir les objectifs pour s'assurer
            // que tout est bien synchronisé
            await refreshObjectives();
          }
        }
        
        return response.data.data;
      }
    } catch (error) {
      console.error('Erreur lors de l\'exécution de la commande:', error);
      
      // Afficher des détails sur l'erreur pour le débogage
      if (error.response) {
        console.error('Détails de l\'erreur:', error.response.data);
        console.error('Status code:', error.response.status);
      }
      
      return {
        success: false,
        error: error.response?.data?.message || 'Erreur lors de l\'exécution de la commande'
      };
    }
  };
  
  // Afficher le modal de succès
  const showChallengeCompleteModal = () => {
    // Cette fonction pourrait être implémentée avec un composant Modal personnalisé
    // Pour l'instant, on utilise une alerte simple
    let message = `Félicitations ! Vous avez terminé le défi "${challenge.title}" !`;
    
    if (alreadyCompleted) {
      message += "\n\nVous aviez déjà terminé ce défi auparavant, aucun point supplémentaire n'a été attribué.";
    } else {
      message += `\n\nVous avez gagné ${challenge.points} points !`;
    }
    
    alert(message);
    
    // Rediriger vers la liste des défis après un court délai
    setTimeout(() => {
      navigate('/challenges');
    }, 2000);
  };

  // Récupérer un indice
  const getHint = async (hintIndex) => {
    try {
      const response = await api.post(`/api/challenges/${id}/hint/${hintIndex}`);
      
      if (response.data.status === 'success') {
        return response.data.data.hint;
      }
    } catch (error) {
      console.error('Erreur lors de l\'utilisation de l\'indice:', error);
      return null;
    }
  };

  // Handler pour afficher un indice
  const handleHintClick = async (index, costPoints) => {
    const hintText = await getHint(index);
    if (hintText) {
      // Afficher l'indice dans un modal ou une alerte
      alert(`Indice: ${hintText}\n\nCoût: ${costPoints} points`);
    }
  };

  if (loading) {
    return <div className="challenge-loading">Chargement du défi...</div>;
  }

  if (error) {
    return <div className="challenge-error">{error}</div>;
  }

  if (!challenge) {
    return <div className="challenge-error">Défi non trouvé.</div>;
  }

  return (
    <div className="challenge-container">
      <div className="challenge-header">
        <h1 className="challenge-title">{challenge.title}</h1>
        <div className="challenge-info">
          <div className="challenge-level">Niveau: {challenge.level}</div>
          <div className="challenge-type">Type: {challenge.type}</div>
          <div className="challenge-points">Points: {challenge.points}</div>
        </div>
        <button 
          className="toggle-instructions-btn"
          onClick={() => setShowInstructions(!showInstructions)}
        >
          {showInstructions ? 'Masquer instructions' : 'Afficher instructions'}
        </button>
      </div>
      
      {alreadyCompleted && (
        <div className="challenge-already-completed">
          <div className="alert alert-info">
            <i className="fas fa-info-circle"></i>
            Vous avez déjà complété ce défi. Les objectifs peuvent être refaits, mais aucun point supplémentaire ne sera attribué.
          </div>
        </div>
      )}
      
      {showInstructions && (
        <div className="challenge-instructions">
          <h2>Instructions</h2>
          <div className="instructions-content">
            {challenge.instructions.split('\n').map((line, index) => (
              <p key={index}>{line}</p>
            ))}
          </div>
        </div>
      )}
      
      <div className="challenge-main">
        <div className="challenge-terminal-container">
          {terminalActive && (
            <Terminal 
              challenge={challenge} 
              currentDirectory={currentDirectory}
              onCommandExecute={handleCommandExecute} 
              attemptId={attempt}
            />
          )}
        </div>
        
        <div className="challenge-sidebar">
          <div className="challenge-objectives">
            <h2>Objectifs</h2>
            <ObjectivesList 
              objectives={challenge.objectives} 
              completedObjectives={objectivesCompleted} 
              refreshKey={refreshTrigger}
            />
            <button 
              className="refresh-objectives-btn"
              onClick={refreshObjectives}
              title="Actualiser les objectifs manuellement"
            >
              <i className="fas fa-sync"></i> Actualiser
            </button>
          </div>
          
          {challenge.hints && challenge.hints.length > 0 && (
            <div className="challenge-hints">
              <h2>Indices</h2>
              <div className="hints-list">
                {challenge.hints.map((hint, index) => (
                  <div className="hint-item" key={index}>
                    <button 
                      className="use-hint-btn"
                      onClick={() => handleHintClick(index, hint.costPoints)}
                    >
                      Utiliser l'indice {index + 1} (-{hint.costPoints} points)
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="challenge-actions">
            <button 
              className="challenge-exit-btn"
              onClick={() => navigate('/challenges')}
            >
              Quitter le défi
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Challenge;
