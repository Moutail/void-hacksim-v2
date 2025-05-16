// src/components/Challenge/Challenge.js - Version améliorée avec persistance des objectifs

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
  const [currentDirectory, setCurrentDirectory] = useState('/');

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
          
          // Si tous les objectifs sont complétés, afficher un message de succès
          if (response.data.data.allObjectivesCompleted) {
            setTimeout(() => {
              showChallengeCompleteModal();
            }, 1500);
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
    alert(`Félicitations ! Vous avez terminé le défi "${challenge.title}" !`);
    navigate('/challenges');
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
          
          {/* Section de débogage - à supprimer en production */}
          <div className="debug-info" style={{ display: 'none' }}>
            <h3>Infos de débogage</h3>
            <p>Tentative ID: {attempt}</p>
            <p>Objectifs complétés: {objectivesCompleted.length}</p>
            <p>Répertoire actuel: {currentDirectory}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Challenge;
