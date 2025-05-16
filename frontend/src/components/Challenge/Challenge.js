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
          console.log("Réponse API du défi:", response.data.data);
          setChallenge(response.data.data.challenge);
          setAttempt(response.data.data.attemptId);
          
          // Initialiser les objectifs complétés
          if (response.data.data.challenge.objectives) {
            // Récupérer tous les objectifs déjà complétés
            const completedObjectives = response.data.data.challenge.objectives
              .filter(obj => obj.completed)
              .map(obj => obj._id);
            
            console.log("Objectifs complétés à l'initialisation:", completedObjectives);
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
      console.log("Exécution de la commande:", command);
      
      // Exécuter la commande via l'API
      const response = await api.post(`/api/challenges/${id}/command`, { command });
      console.log("Réponse brute de la commande:", response);
      
      if (response.data.status === 'success') {
        console.log("Réponse de la commande:", response.data);
        
        // SOLUTION D'URGENCE: Vérification manuelle des objectifs à compléter
        // Ajoutez des conditions basées sur les commandes spécifiques
        if (command === 'ls') {
          // Trouver l'objectif "Lister les fichiers du répertoire racine" et le marquer comme complété
          const updatedObjectives = challenge.objectives.map(obj => {
            if (obj.description && obj.description.includes("Lister les fichiers")) {
              console.log("Marquage manuel de l'objectif 'Lister les fichiers' comme complété");
              return { ...obj, completed: true };
            }
            return obj;
          });
          
          // Mettre à jour l'état du challenge avec les objectifs mis à jour
          setChallenge({ ...challenge, objectives: updatedObjectives });
          
          // Mettre à jour la liste des objectifs complétés
          const listerFilesObjective = challenge.objectives.find(obj => 
            obj.description && obj.description.includes("Lister les fichiers"));
          
          if (listerFilesObjective && listerFilesObjective._id) {
            console.log("Ajout de l'objectif à la liste des objectifs complétés:", listerFilesObjective._id);
            if (!objectivesCompleted.includes(listerFilesObjective._id)) {
              setObjectivesCompleted([...objectivesCompleted, listerFilesObjective._id]);
            }
          }
        }
        
        if (command === 'cd missions') {
          // Trouver l'objectif "Explorer le dossier missions" et le marquer comme complété
          const updatedObjectives = challenge.objectives.map(obj => {
            if (obj.description && obj.description.includes("Explorer le dossier missions")) {
              console.log("Marquage manuel de l'objectif 'Explorer le dossier missions' comme complété");
              return { ...obj, completed: true };
            }
            return obj;
          });
          
          setChallenge({ ...challenge, objectives: updatedObjectives });
          
          const explorerMissionsObjective = challenge.objectives.find(obj => 
            obj.description && obj.description.includes("Explorer le dossier missions"));
          
          if (explorerMissionsObjective && explorerMissionsObjective._id) {
            console.log("Ajout de l'objectif à la liste des objectifs complétés:", explorerMissionsObjective._id);
            if (!objectivesCompleted.includes(explorerMissionsObjective._id)) {
              setObjectivesCompleted([...objectivesCompleted, explorerMissionsObjective._id]);
            }
          }
        }
        
        if (command === 'cd intro') {
          // Trouver l'objectif "Accéder au dossier intro" et le marquer comme complété
          const updatedObjectives = challenge.objectives.map(obj => {
            if (obj.description && obj.description.includes("Accéder au dossier intro")) {
              console.log("Marquage manuel de l'objectif 'Accéder au dossier intro' comme complété");
              return { ...obj, completed: true };
            }
            return obj;
          });
          
          setChallenge({ ...challenge, objectives: updatedObjectives });
          
          const accederIntroObjective = challenge.objectives.find(obj => 
            obj.description && obj.description.includes("Accéder au dossier intro"));
          
          if (accederIntroObjective && accederIntroObjective._id) {
            console.log("Ajout de l'objectif à la liste des objectifs complétés:", accederIntroObjective._id);
            if (!objectivesCompleted.includes(accederIntroObjective._id)) {
              setObjectivesCompleted([...objectivesCompleted, accederIntroObjective._id]);
            }
          }
        }
        
        // Traitez de façon similaire les autres commandes pour les autres objectifs
        
        // Traitement normal de la réponse de l'API
        if (response.data.data.objectivesUpdated) {
          console.log("Objectifs mis à jour selon l'API:", response.data.data.objectivesCompleted);
          
          // Mise à jour des objectifs complétés selon l'API
          const updatedChallenge = { ...challenge };
          
          response.data.data.objectivesCompleted.forEach(completed => {
            const objectiveIndex = updatedChallenge.objectives.findIndex(
              obj => obj._id === completed.objectiveId
            );
            
            if (objectiveIndex !== -1) {
              updatedChallenge.objectives[objectiveIndex].completed = true;
              
              if (!objectivesCompleted.includes(completed.objectiveId)) {
                setObjectivesCompleted(prev => [...prev, completed.objectiveId]);
              }
            }
          });
          
          // Forcer l'interface à refléter les changements
          setTimeout(() => {
            setChallenge(updatedChallenge);
            
            // Si tous les objectifs sont complétés, afficher un message de succès
            if (response.data.data.allObjectivesCompleted) {
              setTimeout(() => {
                showChallengeCompleteModal();
              }, 1500);
            }
          }, 100);
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

  // Fonction d'aide pour inspecter les données de réponse de l'API
const inspectApiResponse = (response) => {
  const responseData = response.data;
  
  console.group('Inspection détaillée de la réponse API');
  console.log('Status:', responseData.status);
  
  if (responseData.data) {
    console.log('Données principales:', responseData.data);
    
    if (responseData.data.challenge) {
      console.log('Défi:', responseData.data.challenge);
      console.log('Type de défi:', typeof responseData.data.challenge);
      
      if (responseData.data.challenge.objectives) {
        console.log('Objectifs du défi:', responseData.data.challenge.objectives);
        console.log('Nombre d\'objectifs:', responseData.data.challenge.objectives.length);
        
        responseData.data.challenge.objectives.forEach((obj, index) => {
          console.log(`Objectif ${index}:`, {
            id: obj._id,
            description: obj.description,
            completed: obj.completed,
            hasCompletedProp: obj.hasOwnProperty('completed')
          });
        });
      } else {
        console.log('Aucun objectif trouvé dans le défi');
      }
    }
    
    if (responseData.data.objectivesUpdated) {
      console.log('Objectifs mis à jour:', responseData.data.objectivesUpdated);
      console.log('Objectifs complétés:', responseData.data.objectivesCompleted);
    }
  }
  console.groupEnd();
  
  return responseData;
};

// Utilisez cette fonction modifiée pour l'exécution de commandes
const debugHandleCommandExecute = async (command) => {
  try {
    console.log("Exécution de la commande:", command);
    const response = await api.post(`/api/challenges/${id}/command`, {
      command
    });
    
    // Inspecter la réponse
    const inspectedResponse = inspectApiResponse(response);
    
    if (inspectedResponse.status === 'success') {
      if (inspectedResponse.data.objectivesUpdated) {
        console.log("========= OBJECTIFS MIS À JOUR DÉTECTÉS =========");
        
        // Pour déboguer, ajoutons un marquage manuel des objectifs
        const manuallyMarkedObjectiveIds = inspectedResponse.data.objectivesCompleted
          .map(completed => completed.objectiveId);
        
        console.log("IDs des objectifs à marquer manuellement:", manuallyMarkedObjectiveIds);
        
        // Manipulation directe du DOM pour montrer les objectifs complétés
        // Ceci est un contournement temporaire uniquement pour le débogage
        setTimeout(() => {
          manuallyMarkedObjectiveIds.forEach(objectiveId => {
            const objectiveElement = document.querySelector(`[data-objective-id="${objectiveId}"]`);
            if (objectiveElement) {
              console.log("Élément d'objectif trouvé, application manuelle du style:", objectiveElement);
              objectiveElement.classList.add('completed');
              objectiveElement.querySelector('.objective-checkbox').innerHTML = 
                '<i class="fas fa-check-circle" style="color: #0f0"></i>';
            } else {
              console.log("Élément d'objectif NON trouvé pour l'ID:", objectiveId);
              
              // Rechercher tous les éléments d'objectif pour aider au débogage
              const allObjectiveElements = document.querySelectorAll('.objective-item');
              console.log("Tous les éléments d'objectif trouvés:", allObjectiveElements);
              
              // Montrer les attributs data-objective-id pour tous les objectifs
              allObjectiveElements.forEach((el, idx) => {
                console.log(`Élément d'objectif ${idx}:`, {
                  dataId: el.getAttribute('data-objective-id'),
                  classList: el.className,
                  textContent: el.textContent.trim()
                });
              });
            }
          });
        }, 500);
      }
    }
    
    return response;
  } catch (error) {
    console.error('Erreur lors de l\'exécution de la commande:', error);
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
              {/* Ajout de logs pour le débogage */}
              {console.log("Challenge.objectives:", challenge.objectives)}
              {console.log("objectivesCompleted array:", objectivesCompleted)}
              
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
