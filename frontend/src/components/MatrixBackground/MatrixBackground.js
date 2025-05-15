// Modification du composant MatrixBackground pour le rendre compatible SSR
import React, { useEffect, useRef, useState } from 'react';
import './MatrixBackground.css';

const MatrixBackground = () => {
  const canvasRef = useRef(null);
  const [isBrowser, setIsBrowser] = useState(false);
  
  // Vérifier si le code s'exécute dans un navigateur
  useEffect(() => {
    setIsBrowser(true);
  }, []);
  
  useEffect(() => {
    // Ne rien faire si nous ne sommes pas dans un navigateur
    if (!isBrowser) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Le reste du code d'animation reste inchangé...
    
  }, [isBrowser]); // Ajout de isBrowser comme dépendance
  
  // Retourner un élément vide si ce n'est pas dans un navigateur
  if (!isBrowser) {
    return <div className="matrix-background-placeholder"></div>;
  }
  
  return (
    <canvas ref={canvasRef} className="matrix-background"></canvas>
  );
};

export default MatrixBackground;
