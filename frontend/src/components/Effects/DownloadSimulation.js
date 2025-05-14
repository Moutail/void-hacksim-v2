// src/components/Effects/DownloadSimulation.js
import React, { useState, useEffect } from 'react';
import './Effects.css';

const DownloadSimulation = ({ fileName = 'unknown.file', size = '1.2 MB', onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [bytesDownloaded, setBytesDownloaded] = useState(0);
  const [speed, setSpeed] = useState(0);
  const totalBytes = size.includes('MB') 
    ? parseFloat(size) * 1024 * 1024 
    : parseFloat(size) * 1024;
  
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          if (onComplete) setTimeout(onComplete, 500);
          return 100;
        }
        const increment = Math.floor(Math.random() * 5) + 1;
        return Math.min(prev + increment, 100);
      });
      
      // Simuler une fluctuation de vitesse aléatoire
      setSpeed(Math.floor(Math.random() * 800) + 200);
    }, 100);
    
    return () => clearInterval(interval);
  }, [onComplete]);
  
  // Mettre à jour les octets téléchargés en fonction du pourcentage
  useEffect(() => {
    setBytesDownloaded(Math.floor((progress / 100) * totalBytes));
  }, [progress, totalBytes]);
  
  const formatBytes = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };
  
  return (
    <div className="terminal-effect download-simulation">
      <div className="effect-header">
        <span className="blink">⚡</span> VOID SECURE TRANSFER PROTOCOL
      </div>
      <div className="effect-content">
        <div className="file-info">
          <div className="info-row">
            <span className="label">Target:</span> 
            <span className="value">{fileName}</span>
          </div>
          <div className="info-row">
            <span className="label">Size:</span> 
            <span className="value">{size}</span>
          </div>
          <div className="info-row">
            <span className="label">Server:</span> 
            <span className="value">void-sec-{Math.floor(Math.random() * 100)}.net</span>
          </div>
        </div>
        
        <div className="progress-container">
          <div className="progress-bar">
            <div className="progress" style={{ width: `${progress}%` }}></div>
          </div>
          <div className="progress-text">{progress}%</div>
        </div>
        
        <div className="download-stats">
          <div>{formatBytes(bytesDownloaded)} / {size}</div>
          <div className="speed">{speed} KB/s</div>
        </div>
        
        <div className="download-status">
          {progress < 100 ? (
            <span className="blink">TRANSFER IN PROGRESS</span>
          ) : (
            <span className="success">DOWNLOAD COMPLETE</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default DownloadSimulation;