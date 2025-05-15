// src/pages/Login/Login.js - Version simple pour test
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
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
    <div className="login-simple-container">
      <div className="login-simple-box">
        <div className="login-simple-header">
          <h1>VOID HackSimulator</h1>
          <p>Connectez-vous pour accéder à votre terminal</p>
        </div>
        
        {error && (
          <div className="login-simple-error">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="login-simple-form">
          <div className="login-simple-group">
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
          
          <div className="login-simple-group">
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
            className="login-simple-button"
            disabled={loading}
          >
            {loading ? 'Connexion en cours...' : 'Se connecter'}
          </button>
        </form>
        
        <div className="login-simple-footer">
          <p>Pas encore de compte ? <Link to="/register">Inscrivez-vous</Link></p>
        </div>
      </div>
    </div>
  );
};

export default Login;
