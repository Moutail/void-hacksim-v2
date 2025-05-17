// src/components/Challenge/ObjectivesList-improved.js
import React, { useState, useEffect } from 'react';
import './ObjectivesList.css';

const ObjectivesList = ({ objectives, completedObjectives = [], refreshKey = 0 }) => {
  const [displayedObjectives, setDisplayedObjectives] = useState([]);
  
  // Traitement des props pour créer un état local stable
  useEffect(() => {
    if (!objectives || objectives.length === 0) return;
    
    // Préparer les objectifs avec leur état de complétion
    const processedObjectives = objectives.map(objective => {
      // Vérifier si l'objectif est complété via la prop
      const completedByProp = objective.completed === true;
      
      // Vérifier si l'objectif est dans la liste des objectifs complétés
      const completedById = Array.isArray(completedObjectives) && 
                           completedObjectives.includes(objective._id);
      
      // Un objectif est considéré complété si l'une des conditions est vraie
      const isCompleted = completedByProp || completedById;
      
      return {
        ...objective,
        isCompleted,
      };
    });
    
    console.log("ObjectivesList: Objectifs traités:", 
      processedObjectives.map(o => ({
        id: o._id,
        description: o.description.substring(0, 30),
        completed: o.isCompleted
      }))
    );
    
    // Mettre à jour l'état local
    setDisplayedObjectives(processedObjectives);
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