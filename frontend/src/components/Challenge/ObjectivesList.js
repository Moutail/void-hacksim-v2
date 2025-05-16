// src/components/Challenge/ObjectivesList.js - Version corrigée

import React, { useState, useEffect } from 'react';
import './ObjectivesList.css';

const ObjectivesList = ({ objectives, completedObjectives = [] }) => {
  const [refresh, setRefresh] = useState(0);
  
  // Force un re-rendu quand les props changent
  useEffect(() => {
    console.log("ObjectivesList: props mises à jour");
    console.log("Objectifs:", objectives?.map(o => ({ id: o._id, desc: o.description, completed: o.completed })));
    console.log("Objectifs complétés:", completedObjectives);
    
    // Forcer un re-rendu après un court délai
    const timer = setTimeout(() => {
      setRefresh(prev => prev + 1);
    }, 50);
    
    return () => clearTimeout(timer);
  }, [objectives, completedObjectives]);

  if (!objectives || objectives.length === 0) {
    return <div className="objectives-empty">Aucun objectif défini pour ce défi.</div>;
  }

  return (
    <div className="objectives-list" data-refresh={refresh}>
      {objectives.map((objective, index) => {
        // Vérifier si l'objectif est complété (plusieurs méthodes)
        const completedByProp = objective.completed === true;
        const completedByIds = Array.isArray(completedObjectives) && 
                               completedObjectives.includes(objective._id);
        const isCompleted = completedByProp || completedByIds;
        
        // Log pour débogage
        console.log(`Objectif ${index} "${objective.description.substring(0, 20)}...":`, {
          id: objective._id,
          completedByProp,
          completedByIds,
          finalStatus: isCompleted
        });
        
        return (
          <div 
            key={objective._id || index}
            className={`objective-item ${isCompleted ? 'completed' : ''}`}
            data-objective-id={objective._id}
          >
            <div className="objective-checkbox">
              {isCompleted ? (
                <i className="fas fa-check-circle" style={{ color: '#0f0' }}></i>
              ) : (
                <i className="fas fa-times-circle" style={{ color: '#ff3333' }}></i>
              )}
            </div>
            <div className="objective-description">
              {objective.description}
            </div>
          </div>
        );
      })}
      
      {/* Statistiques pour débogage */}
      <div className="objectives-stats" style={{ display: 'none' }}>
        <div>Total: {objectives.length}</div>
        <div>Complétés: {objectives.filter(o => o.completed).length}</div>
        <div>Par IDs: {completedObjectives.length}</div>
        <div>Refresh: {refresh}</div>
      </div>
    </div>
  );
};

export default ObjectivesList;
