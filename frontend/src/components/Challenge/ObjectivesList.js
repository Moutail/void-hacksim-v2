// src/components/Challenge/ObjectivesList.js - Version mise à jour

import React, { useEffect, useState } from 'react';
import './ObjectivesList.css';

const ObjectivesList = ({ objectives, completedObjectives = [], refreshKey = 0 }) => {
  // Utiliser un état pour la liste combinée des objectifs
  const [displayedObjectives, setDisplayedObjectives] = useState([]);
  
  useEffect(() => {
    if (!objectives || objectives.length === 0) return;
    
    // Créer une liste combinée avec l'état complété correct
    const updatedObjectives = objectives.map(objective => {
      // Vérifier si l'objectif est complété via la prop ou via l'ID
      const isCompletedById = Array.isArray(completedObjectives) && 
                             completedObjectives.includes(objective._id);
      return {
        ...objective,
        isCompleted: objective.completed || isCompletedById
      };
    });
    
    setDisplayedObjectives(updatedObjectives);
    
    console.log("ObjectivesList mis à jour:", {
      objectivesCount: objectives.length,
      completedCount: completedObjectives.length,
      updatedList: updatedObjectives.map(o => ({ 
        id: o._id, 
        desc: o.description.substring(0, 20), 
        completed: o.isCompleted 
      }))
    });
  }, [objectives, completedObjectives, refreshKey]);

  if (!objectives || objectives.length === 0) {
    return <div className="objectives-empty">Aucun objectif défini pour ce défi.</div>;
  }

  return (
    <div className="objectives-list">
      {displayedObjectives.map((objective, index) => (
        <div 
          key={objective._id || index}
          className={`objective-item ${objective.isCompleted ? 'completed' : ''}`}
          data-objective-id={objective._id}
        >
          <div className="objective-checkbox">
            {objective.isCompleted ? (
              <i className="fas fa-check-circle" style={{ color: '#0f0' }}></i>
            ) : (
              <i className="fas fa-times-circle" style={{ color: '#ff3333' }}></i>
            )}
          </div>
          <div className="objective-description">
            {objective.description}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ObjectivesList;
