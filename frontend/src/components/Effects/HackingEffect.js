// Version corrigée de HackingEffect.js

import React, { useState, useEffect, useRef } from 'react';
import './Effects.css';

const HackingEffect = ({ target = 'system', duration = 5000, onComplete }) => {
  const [output, setOutput] = useState([]);
  const [status, setStatus] = useState('initializing');
  const outputRef = useRef(null);
  
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%^&*()_+~`|}{[]\\:;?><,./-=';
  const commands = [
    'INITIALIZING ATTACK VECTORS',
    'BYPASSING FIREWALL',
    'SCANNING VULNERABILITIES',
    'OBTAINING ACCESS TOKENS',
    'ELEVATING PRIVILEGES',
    'ESTABLISHING BACKDOOR',
    'EXTRACTING DATA',
    'COVERING TRACKS'
  ];
  
  // Fonction sécurisée pour faire défiler vers le bas
  const safeScrollToBottom = () => {
    if (outputRef.current) {
      try {
        outputRef.current.scrollTop = outputRef.current.scrollHeight;
      } catch (error) {
        console.warn('Erreur lors du défilement:', error);
      }
    }
  };
  
  useEffect(() => {
    let currentStep = 0;
    let delayMultiplier = duration / 5000; // Ajuster les délais en fonction de la durée souhaitée
    let isMounted = true; // Flag pour éviter les mises à jour sur un composant démonté
    
    const generateRandomLine = () => {
      return Array(50).fill(0).map(() => 
        chars.charAt(Math.floor(Math.random() * chars.length))
      ).join('');
    };
    
    const processStep = (step) => {
      if (!isMounted) return;
      
      if (step >= commands.length) {
        setStatus('access_granted');
        setOutput(prev => [
          ...prev, 
          { 
            type: 'final', 
            text: `ACCESS GRANTED TO ${target.toUpperCase()}` 
          }
        ]);
        
        // Scroll to bottom - safely
        safeScrollToBottom();
        
        setTimeout(() => {
          if (isMounted && onComplete) onComplete();
        }, 1000);
        return;
      }
      
      setStatus(commands[step].toLowerCase().replace(/ /g, '_'));
      
      setOutput(prev => [
        ...prev, 
        { 
          type: 'command', 
          text: `> ${commands[step]}...` 
        }
      ]);
      
      // Générer des lignes aléatoires
      const linesCount = Math.floor(Math.random() * 5) + 3;
      
      const generateLines = (index) => {
        if (!isMounted) return;
        
        if (index >= linesCount) {
          // Ajouter un message de succès à la fin de chaque étape
          setTimeout(() => {
            if (!isMounted) return;
            
            setOutput(prev => [
              ...prev, 
              { 
                type: 'success', 
                text: `[SUCCESS] ${commands[step]} COMPLETE` 
              }
            ]);
            
            // Passer à l'étape suivante
            setTimeout(() => {
              if (isMounted) {
                processStep(step + 1);
              }
            }, 300 * delayMultiplier);
            
            // Scroll to bottom - safely
            safeScrollToBottom();
          }, 200 * delayMultiplier);
          return;
        }
        
        setTimeout(() => {
          if (!isMounted) return;
          
          setOutput(prev => [
            ...prev, 
            { 
              type: 'output',
              text: generateRandomLine()
            }
          ]);
          
          // Scroll to bottom - safely
          safeScrollToBottom();
          
          generateLines(index + 1);
        }, (100 + Math.random() * 100) * delayMultiplier);
      };
      
      generateLines(0);
    };
    
    // Lancer la séquence de hacking
    processStep(0);
    
    // Cleanup function to prevent updates on unmounted component
    return () => {
      isMounted = false;
    };
  }, [target, duration, onComplete, chars, commands]);
  
  // Effect to scroll to bottom when output changes
  useEffect(() => {
    safeScrollToBottom();
  }, [output]);
  
  return (
    <div className="terminal-effect hacking-effect">
      <div className="effect-header">
        <span className="blink">⚠</span> VOID SECURITY EXPLOITATION FRAMEWORK v2.5
      </div>
      <div className="effect-content">
        <div className="target-info">
          <div className="info-row">
            <span className="label">TARGET:</span> 
            <span className="value">{target}</span>
          </div>
          <div className="info-row">
            <span className="label">STATUS:</span> 
            <span className="value">{status}</span>
          </div>
        </div>
        
        <div className="console-output" ref={outputRef}>
          {output.map((line, index) => (
            <div key={index} className={`line ${line.type}`}>
              {line.text}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HackingEffect;