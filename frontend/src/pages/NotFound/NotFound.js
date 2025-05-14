// src/pages/NotFound/NotFound.js
import React from 'react';
import { Link } from 'react-router-dom';
import './NotFound.css';

const NotFound = () => {
  return (
    <div className="not-found">
      <div className="not-found-content">
        <h1>404</h1>
        <div className="error-message">
          <div className="terminal-line">
            <span className="error-prompt">error: </span>
            <span className="error-text">page_not_found</span>
          </div>
          <div className="terminal-line">
            <span className="error-prompt">message: </span>
            <span className="error-text">La page que vous recherchez n'existe pas ou a été déplacée.</span>
          </div>
          <div className="terminal-line">
            <span className="error-prompt">solution: </span>
            <span className="error-text">Retournez au tableau de bord ou vérifiez l'URL.</span>
          </div>
        </div>
        <div className="action-buttons">
          <Link to="/dashboard" className="home-button">
            <i className="fas fa-home"></i> Tableau de bord
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;