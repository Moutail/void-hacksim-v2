// src/components/Challenge/ObjectivesList.js
import React, { useEffect, useState } from 'react';

const ObjectivesList = ({ objectives, completedObjectives = [] }) => {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // Forcer un re-rendu des objectifs quand les props changent
  useEffect(() => {
    console.log("ObjectivesList - nouvelles props reçues:", {
      objectives: objectives?.length,
      completedObjectives: completedObjectives?.length
    });
    
    // Forcer un nouveau rendu après un court délai
    const timer = setTimeout(() => {
      setRefreshTrigger(prev => prev + 1);
    }, 100);
    
    return () => clearTimeout(timer);
  }, [objectives, completedObjectives]);

  // Rendu avec styles inline forcés pour éviter les problèmes de CSS
  return (
    <div style={{ margin: '10px 0' }}>
      {objectives && objectives.length > 0 ? objectives.map((objective, index) => {
        // Vérifier si l'objectif est complété (plusieurs méthodes)
        const isCompletedByProp = objective.completed === true;
        const isCompletedByArray = Array.isArray(completedObjectives) && 
                                 objective._id && 
                                 completedObjectives.includes(objective._id);
        const isCompleted = isCompletedByProp || isCompletedByArray;
        
        console.log(`Objectif [${index}]:`, {
          id: objective._id,
          desc: objective.description?.substring(0, 20),
          completedProp: isCompletedByProp,
          completedArray: isCompletedByArray,
          isCompleted
        });
        
        return (
          <div
            key={objective._id || `obj-${index}`}
            data-objective-id={objective._id}
            data-refresh-count={refreshTrigger}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '10px 15px',
              marginBottom: '10px',
              backgroundColor: isCompleted ? 'rgba(0, 255, 0, 0.1)' : 'rgba(0, 0, 0, 0.2)',
              borderRadius: '4px',
              borderLeft: isCompleted ? '3px solid #0f0' : '3px solid #ff3333',
              transition: 'all 0.3s ease'
            }}
          >
            <div style={{ 
              marginRight: '15px',
              fontSize: '18px',
              color: isCompleted ? '#0f0' : '#ff3333',
              width: '20px'
            }}>
              {isCompleted ? (
                <i className="fas fa-check-circle" style={{ color: '#0f0' }}></i>
              ) : (
                <i className="fas fa-times-circle" style={{ color: '#ff3333' }}></i>
              )}
            </div>
            <div style={{ 
              color: isCompleted ? '#fff' : '#ccc',
              fontWeight: isCompleted ? '500' : 'normal',
              fontSize: '14px'
            }}>
              {objective.description || "Objectif sans description"}
            </div>
          </div>
        );
      }) : (
        <p style={{ textAlign: 'center', color: '#888', fontStyle: 'italic' }}>
          Aucun objectif défini pour ce défi.
        </p>
      )}
      
      {/* Statistiques cachées pour aider au débogage */}
      <div style={{ display: 'none' }}>
        Refresh count: {refreshTrigger}
      </div>
    </div>
  );
};

export default ObjectivesList;
