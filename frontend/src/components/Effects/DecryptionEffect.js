// src/components/Effects/DecryptionEffect.js
import React, { useState, useEffect } from 'react';
import './Effects.css';

const DecryptionEffect = ({ fileName = 'encrypted.dat', key = 'UNKNOWN', onComplete }) => {
  const [decryptedText, setDecryptedText] = useState('');
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('analyzing');
  
  const placeholder = `
÷ø¥œæ¶§∆¢£º¡™£¡¢∞¢¡£™£¡¢©©©¢TOPSEŒ©Œæ¶CRETµµ∂∆˚¬˚∂∂ƒ∂ƒƒ¬
¶§∆\`¡ª•¶§¢•ªCONFIDENTIAL£¢•¶§∞§¶§¶æ…÷≈ç√√∫˜µ≤≥÷
¡™£™DOCUMENT¢∞§¶§¡•¶§CLASSIªFIED£™¢¡™¢£∞VOID¢∞§¶
≈ø˚¬µµΩ≈ç√MISSION DETAILS∫˜˜˜˜∫√ç∫˙∆˚˚¬∆˚≈√ç≈≈¬¬
∫˜˜µ˜˜∂˜∆∂˜µIMPORTANT˚∆ø˚˚¬∆˚ƒ¬˚˚∆˚∫˜˜∫∆˚∂˚∆˚˚
∂˚ƒ∂˙∆¨ƒ∆TOP SECRET˚∂˚∂∆ƒ˚∂ƒ˚˚CONFIDENTIAL˚∂ƒ˚∂ƒ˚
  `;
  
  const finalText = `
MISSION DETAILS - TOP SECRET
===========================

OPERATION: VOID SHIELD
STATUS: ACTIVE
CLEARANCE: LEVEL 9

Secure the target system and extract
all information related to Project NEXUS.

Any unauthorized access to this document
will be traced and prosecuted.

VOID SECURITY PROTOCOL ACTIVE
  `;
  
  useEffect(() => {
    // Initialiser avec le texte brouillé
    setDecryptedText(placeholder);
    
    const totalSteps = 100;
    let currentStep = 0;
    
    const interval = setInterval(() => {
      currentStep++;
      const newProgress = Math.floor((currentStep / totalSteps) * 100);
      setProgress(newProgress);
      
      // Mettre à jour le message de statut en fonction de la progression
      if (newProgress < 20) {
        setStatus('analyzing_encryption');
      } else if (newProgress < 40) {
        setStatus('decryption_key_found');
      } else if (newProgress < 60) {
        setStatus('decrypting_data');
      } else if (newProgress < 90) {
        setStatus('verifying_integrity');
      } else {
        setStatus('decryption_complete');
      }
      
      // Révéler progressivement le texte réel
      if (newProgress > 30) {
        const decryptionRatio = (newProgress - 30) / 70; // 0 à 1 de 30% à 100%
        
        let newText = '';
        for (let i = 0; i < Math.max(placeholder.length, finalText.length); i++) {
          // Pour chaque caractère, décider s'il faut afficher le final ou le brouillé
          const shouldReveal = Math.random() < decryptionRatio;
          
          if (shouldReveal && i < finalText.length) {
            newText += finalText[i];
          } else if (i < placeholder.length) {
            newText += placeholder[i];
          } else if (i < finalText.length) {
            // Si le texte final est plus long que le placeholder
            const randomChar = chars.charAt(Math.floor(Math.random() * chars.length));
            newText += shouldReveal ? finalText[i] : randomChar;
          }
        }
        
        setDecryptedText(newText);
      }
      
      // Terminer le déchiffrement
      if (newProgress >= 100) {
        clearInterval(interval);
        setDecryptedText(finalText);
        
        // Appeler le callback onComplete après un délai
        setTimeout(() => {
          if (onComplete) onComplete();
        }, 1500);
      }
    }, 100);
    
    return () => clearInterval(interval);
  }, [onComplete]);
  
  // Caractères aléatoires pour le déchiffrement
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%^&*()_+~`|}{[]\\:;?><,./-=';
  
  return (
    <div className="terminal-effect decryption-effect">
      <div className="effect-header">
        <span className="blink">🔒</span> VOID DECRYPTION MODULE
      </div>
      <div className="effect-content">
        <div className="file-info">
          <div className="info-row">
            <span className="label">File:</span> 
            <span className="value">{fileName}</span>
          </div>
          <div className="info-row">
            <span className="label">Key:</span> 
            <span className="value">{key}</span>
          </div>
          <div className="info-row">
            <span className="label">Status:</span> 
            <span className="value">{status}</span>
          </div>
        </div>
        
        <div className="progress-container">
          <div className="progress-bar">
            <div className="progress" style={{ width: `${progress}%` }}></div>
          </div>
          <div className="progress-text">{progress}%</div>
        </div>
        
        <div className="decrypted-content">
          <pre>{decryptedText}</pre>
        </div>
      </div>
    </div>
  );
};

export default DecryptionEffect;