// src/components/MatrixBackground/MatrixBackground.js
import React, { useEffect, useRef } from 'react';
import './MatrixBackground.css';

const MatrixBackground = () => {
  const canvasRef = useRef(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Définir les dimensions du canvas
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Caractères matrix
    const characters = 'アァカサタナハマヤャラワガザダバパイィキシチニヒミリヰギジヂビピウゥクスツヌフムユュルグズブヅプエェケセテネヘメレヱゲゼデベペオォコソトノホモヨョロヲゴゾドボポヴッン0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const charactersArray = characters.split('');
    
    // Colonnes pour la pluie
    const fontSize = 14;
    const columns = canvas.width / fontSize;
    
    // Position Y initiale pour chaque colonne
    const drops = [];
    for (let i = 0; i < columns; i++) {
      drops[i] = 1;
    }
    
    // Dessiner la pluie
    const draw = () => {
      // Fond noir semi-transparent pour créer un effet de traînée
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Texte vert pour les caractères
      ctx.fillStyle = '#0f0';
      ctx.font = `${fontSize}px monospace`;
      
      // Dessiner les caractères
      for (let i = 0; i < drops.length; i++) {
        // Caractère aléatoire
        const text = charactersArray[Math.floor(Math.random() * charactersArray.length)];
        
        // Dessiner le caractère
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);
        
        // Réinitialiser si le caractère a atteint le bas ou aléatoirement
        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        
        // Incrémenter Y
        drops[i]++;
      }
    };
    
    // Animation
    const interval = setInterval(draw, 35);
    
    // Nettoyage
    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);
  
  return <canvas ref={canvasRef} className="matrix-canvas" />;
};

export default MatrixBackground;
