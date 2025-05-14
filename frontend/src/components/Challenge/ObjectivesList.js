// src/components/Challenge/ObjectivesList.js
import React from 'react';
import './ObjectivesList.css';

const ObjectivesList = ({ objectives, completedObjectives }) => {
  if (!objectives || objectives.length === 0) {
    return <p>Aucun objectif défini pour ce défi.</p>;
  }
  
  return (
    <div className="objectives-list">
      {objectives.map((objective, index) => {
        // Vérifier si l'objectif est complété
        const isCompleted = objective.completed || 
           (completedObjectives && completedObjectives.includes(objective._id));
                
        return (
          <div
             key={objective._id || index}
             className={`objective-item ${isCompleted ? 'completed' : ''}`}
          >
            <div className="objective-checkbox">
              {isCompleted ? '✅' : '❌'}
            </div>
            <div className="objective-description">
              {objective.description}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ObjectivesList;