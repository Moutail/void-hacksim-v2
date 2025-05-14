// src/pages/Login/Login.js
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import MatrixBackground from '../../components/MatrixBackground/MatrixBackground';
import '../../styles/enhanced-forms.css'; // Importez les nouveaux styles
import './Login.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation de base
    if (!email || !password) {
      setError('Veuillez remplir tous les champs');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const result = await login(email, password);
      
      if (result.success) {
        navigate('/dashboard');
      } else {
        setError(result.error || 'Erreur de connexion');
      }
    } catch (error) {
      setError('Une erreur est survenue. Veuillez réessayer.');
      console.error('Erreur de connexion:', error);
    } finally {
      setLoading(false);
    }
  };
  

  return (
    <div className="login-container">
      {/* Animation en arrière-plan avec z-index négatif */}
     {/* Animation en arrière-plan mais ne bloquant pas les interactions */}
      <MatrixBackground />
      <div className="login-box">
        <div className="login-header">
          <h1>VOID <span className="highlight">HackSimulator</span></h1>
          <p>Connectez-vous pour accéder à votre terminal</p>
        </div>
        
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              placeholder="votre@email.com"
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Mot de passe</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              placeholder="Votre mot de passe"
              required
            />
          </div>
          
          <button 
            type="submit" 
            className="login-button"
            disabled={loading}
          >
            {loading ? 'Connexion en cours...' : 'Se connecter'}
          </button>
        </form>
        
        <div className="login-footer">
          <p>Pas encore de compte ? <Link to="/register">Inscrivez-vous</Link></p>
        </div>
        
        <div className="matrix-background"></div>
      </div>
    </div>
  );
};

export default Login;