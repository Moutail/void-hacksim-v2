// src/components/Admin/UserForm.js
import React, { useState, useEffect } from 'react';
import './AdminForms.css';

const UserForm = ({ user, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'user',
    score: 0
  });
  
  const [showPassword, setShowPassword] = useState(false);

  // Initialiser le formulaire avec les données de l'utilisateur si en mode édition
  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username || '',
        email: user.email || '',
        password: '', // Ne pas pré-remplir le mot de passe
        role: user.role || 'user',
        score: user.score || 0
      });
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseInt(value) : value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Si on édite un utilisateur et qu'aucun mot de passe n'est fourni,
    // ne pas envoyer le champ password pour éviter de le réinitialiser
    if (user && !formData.password.trim()) {
      const { password, ...dataWithoutPassword } = formData;
      onSave(dataWithoutPassword);
    } else {
      onSave(formData);
    }
  };

  const toggleShowPassword = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="admin-form-container">
      <h2>{user ? 'Modifier l\'utilisateur' : 'Créer un nouvel utilisateur'}</h2>
      
      <form onSubmit={handleSubmit} className="user-form">
        <div className="form-group">
          <label htmlFor="username">Nom d'utilisateur*</label>
          <input
            type="text"
            id="username"
            name="username"
            value={formData.username}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="email">Email*</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="password">
            {user ? 'Nouveau mot de passe (laisser vide pour ne pas changer)' : 'Mot de passe*'}
          </label>
          <div className="password-input-group">
            <input
              type={showPassword ? "text" : "password"}
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required={!user}
              minLength={6}
            />
            <button 
              type="button" 
              className="toggle-password-btn"
              onClick={toggleShowPassword}
            >
              <i className={`fas fa-eye${showPassword ? '-slash' : ''}`}></i>
            </button>
          </div>
        </div>
        
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="role">Rôle*</label>
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleChange}
              required
            >
              <option value="user">Utilisateur</option>
              <option value="admin">Administrateur</option>
            </select>
          </div>
          
          <div className="form-group">
            <label htmlFor="score">Score</label>
            <input
              type="number"
              id="score"
              name="score"
              value={formData.score}
              onChange={handleChange}
              min="0"
            />
          </div>
        </div>
        
        <div className="form-actions">
          <button 
            type="button" 
            className="cancel-btn"
            onClick={onCancel}
          >
            Annuler
          </button>
          <button 
            type="submit" 
            className="save-btn"
          >
            {user ? 'Mettre à jour' : 'Créer'} l'utilisateur
          </button>
        </div>
      </form>
    </div>
  );
};

export default UserForm;