// src/components/Challenge/Challenge.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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

  // Charger le défi
  useEffect(() => {
    const loadChallenge = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/api/challenges/${id}`);
        
        if (response.data.status === 'success') {
          setChallenge(response.data.data.challenge);
          setAttempt(response.data.data.attemptId);
          
          // Initialiser les objectifs complétés
          if (response.data.data.challenge.objectives) {
            const completedObjectives = response.data.data.challenge.objectives
              .filter(obj => obj.completed)
              .map(obj => obj._id);
              
            setObjectivesCompleted(completedObjectives);
          }
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

  // Gérer l'exécution d'une commande
  const handleCommandExecute = async (command) => {
    try {
      const response = await api.post(`/api/challenges/${id}/command`, {
        command
      });
      
      if (response.data.status === 'success') {
        // Mise à jour des objectifs complétés
        if (response.data.data.objectivesUpdated) {
          const updatedChallenge = { ...challenge };
          
          response.data.data.objectivesCompleted.forEach(completed => {
            const objectiveIndex = updatedChallenge.objectives.findIndex(
              obj => obj._id === completed.objectiveId
            );
            
            if (objectiveIndex !== -1) {
              updatedChallenge.objectives[objectiveIndex].completed = true;
              
              if (!objectivesCompleted.includes(completed.objectiveId)) {
                setObjectivesCompleted([...objectivesCompleted, completed.objectiveId]);
              }
            }
          });
          
          setChallenge(updatedChallenge);
          
          // Si tous les objectifs sont complétés, afficher un message de succès
          if (response.data.data.allObjectivesCompleted) {
            // Utiliser setTimeout pour laisser le temps à l'utilisateur de voir le résultat de sa commande
            setTimeout(() => {
              showChallengeCompleteModal();
            }, 1500);
          }
        }
      }
    } catch (error) {
      console.error('Erreur lors de l\'exécution de la commande:', error);
    }
  };
  
  // Afficher le modal de succès
  const showChallengeCompleteModal = () => {
    // Cette fonction pourrait être implémentée avec un composant Modal personnalisé
    // Pour l'instant, on utilise une alerte simple
    alert(`Félicitations ! Vous avez terminé le défi "${challenge.title}" !`);
    navigate('/challenges');
  };

  // Récupérer un indice (renommé pour éviter les conflits avec les règles des hooks)
  const getHint = async (hintIndex) => {
    try {
      const response = await api.post(`/api/challenges/${id}/hint/${hintIndex}`);
      
      if (response.data.status === 'success') {
        // Ajouter l'indice aux indices utilisés
        const updatedChallenge = { ...challenge };
        
        // On pourrait stocker les indices utilisés dans l'état pour les afficher
        // et désactiver le bouton correspondant
        
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
              onCommandExecute={handleCommandExecute} 
            />
          )}
        </div>
        
        <div className="challenge-sidebar">
          <div className="challenge-objectives">
            <h2>Objectifs</h2>
            <ObjectivesList 
              objectives={challenge.objectives} 
              completedObjectives={objectivesCompleted} 
            />
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