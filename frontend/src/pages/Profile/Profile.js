// src/pages/Profile/Profile.js
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import './Profile.css';

const Profile = () => {
  const { user, updateProfile, changePassword } = useAuth();
  
  // États pour les données de profil
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // États pour les formulaires
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // États pour les retours utilisateur
  const [profileUpdateSuccess, setProfileUpdateSuccess] = useState(false);
  const [passwordUpdateSuccess, setPasswordUpdateSuccess] = useState(false);
  const [profileUpdateError, setProfileUpdateError] = useState(null);
  const [passwordUpdateError, setPasswordUpdateError] = useState(null);
  
  // États pour l'interface
  const [activeTab, setActiveTab] = useState('info');
  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false
  });
  
  // Charger le profil
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const response = await api.get('/api/users/profile');
        
        if (response.data.status === 'success') {
          setUserProfile(response.data.data);
          setUsername(response.data.data.username);
          setEmail(response.data.data.email);
        }
      } catch (error) {
        console.error('Erreur lors du chargement du profil:', error);
        setError(
          error.response?.data?.message || 
          'Erreur lors du chargement du profil. Veuillez réessayer.'
        );
      } finally {
        setLoading(false);
      }
    };
    
    fetchProfile();
  }, []);

  // Mettre à jour le profil
  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    
    try {
      setProfileUpdateError(null);
      setProfileUpdateSuccess(false);
      
      const result = await updateProfile({ username, email });
      
      if (result.success) {
        setProfileUpdateSuccess(true);
        setUserProfile(prev => ({ ...prev, username, email }));
        
        // Cacher le message de succès après 3 secondes
        setTimeout(() => {
          setProfileUpdateSuccess(false);
        }, 3000);
      } else {
        setProfileUpdateError(result.error || 'Erreur lors de la mise à jour du profil.');
      }
    } catch (error) {
      setProfileUpdateError('Une erreur est survenue. Veuillez réessayer.');
      console.error('Erreur lors de la mise à jour du profil:', error);
    }
  };

  // Changer le mot de passe
  const handlePasswordChange = async (e) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      setPasswordUpdateError('Les mots de passe ne correspondent pas.');
      return;
    }
    
    try {
      setPasswordUpdateError(null);
      setPasswordUpdateSuccess(false);
      
      const result = await changePassword(currentPassword, newPassword);
      
      if (result.success) {
        setPasswordUpdateSuccess(true);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        
        // Cacher le message de succès après 3 secondes
        setTimeout(() => {
          setPasswordUpdateSuccess(false);
        }, 3000);
      } else {
        setPasswordUpdateError(result.error || 'Erreur lors du changement de mot de passe.');
      }
    } catch (error) {
      setPasswordUpdateError('Une erreur est survenue. Veuillez réessayer.');
      console.error('Erreur lors du changement de mot de passe:', error);
    }
  };

  // Gérer la visibilité des mots de passe
  const togglePasswordVisibility = (field) => {
    setShowPassword(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  if (loading) {
    return (
      <div className="profile-loading">
        <div className="loading-spinner"></div>
        <p>Chargement du profil...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="profile-error">
        <div className="error-icon">
          <i className="fas fa-exclamation-triangle"></i>
        </div>
        <p>{error}</p>
        <button onClick={() => window.location.reload()} className="retry-button">
          Réessayer
        </button>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="profile-error">
        <div className="error-icon">
          <i className="fas fa-user-slash"></i>
        </div>
        <p>Impossible de charger le profil.</p>
        <button onClick={() => window.location.reload()} className="retry-button">
          Réessayer
        </button>
      </div>
    );
  }

  const calculateCompletionRate = () => {
    const totalChallenges = userProfile.completedChallenges?.length + 5; // Exemple, à ajuster
    const completedCount = userProfile.completedChallenges?.length || 0;
    return Math.round((completedCount / totalChallenges) * 100);
  };

  return (
    <div className="profile-container">
      <div className="profile-header">
        <h1>Mon Profil</h1>
        <p className="profile-subtitle">Gérez vos informations personnelles et vos préférences</p>
      </div>
      
      <div className="profile-content">
        <div className="profile-sidebar">
          <div className="profile-card">
            <div className="profile-avatar-large">
              {userProfile.username.charAt(0).toUpperCase()}
            </div>
            
            <div className="profile-name">{userProfile.username}</div>
            <div className="profile-email">{userProfile.email}</div>
            
            <div className="profile-role">
              <span className={`role-badge ${userProfile.role}`}>
                {userProfile.role === 'admin' ? 'Administrateur' : 'Hacker'}
              </span>
            </div>
            
            <div className="profile-stats">
              <div className="stat-item">
                <div className="stat-value">{userProfile.score}</div>
                <div className="stat-label">Points</div>
              </div>
              
              <div className="stat-item">
                <div className="stat-value">{userProfile.completedChallenges?.length || 0}</div>
                <div className="stat-label">Défis complétés</div>
              </div>
              
              <div className="stat-item progress-stat">
                <div className="progress-container">
                  <div 
                    className="progress-bar" 
                    style={{ width: `${calculateCompletionRate()}%` }}
                  ></div>
                </div>
                <div className="stat-label">{calculateCompletionRate()}% Progression</div>
              </div>
            </div>
            
            <div className="join-date">
              <i className="fas fa-calendar-alt"></i>
              Membre depuis le {new Date(userProfile.createdAt).toLocaleDateString()}
            </div>
          </div>
          
          <div className="achievement-section">
            <h3>Badges & Réalisations</h3>
            <div className="achievement-list">
              <div className="achievement">
                <i className="fas fa-award"></i>
                <span>Premier défi réussi</span>
              </div>
              <div className="achievement locked">
                <i className="fas fa-lock"></i>
                <span>Maître des réseaux</span>
              </div>
              <div className="achievement locked">
                <i className="fas fa-lock"></i>
                <span>Cryptographe expert</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="profile-main">
          <div className="profile-tabs">
            <button 
              className={`tab-button ${activeTab === 'info' ? 'active' : ''}`}
              onClick={() => setActiveTab('info')}
            >
              <i className="fas fa-user"></i>
              <span>Informations</span>
            </button>
            
            <button 
              className={`tab-button ${activeTab === 'security' ? 'active' : ''}`}
              onClick={() => setActiveTab('security')}
            >
              <i className="fas fa-shield-alt"></i>
              <span>Sécurité</span>
            </button>
            
            <button 
              className={`tab-button ${activeTab === 'activity' ? 'active' : ''}`}
              onClick={() => setActiveTab('activity')}
            >
              <i className="fas fa-chart-line"></i>
              <span>Activité</span>
            </button>
          </div>
          
          <div className="profile-tab-content">
            {activeTab === 'info' && (
              <div className="profile-section">
                <h3>Informations du profil</h3>
                
                {profileUpdateSuccess && (
                  <div className="success-message">
                    <i className="fas fa-check-circle"></i>
                    Profil mis à jour avec succès !
                  </div>
                )}
                
                {profileUpdateError && (
                  <div className="error-message">
                    <i className="fas fa-exclamation-circle"></i>
                    {profileUpdateError}
                  </div>
                )}
                
                <form onSubmit={handleProfileUpdate} className="profile-form">
                  <div className="form-group">
                    <label htmlFor="username">
                      <i className="fas fa-user"></i>
                      Nom d'utilisateur
                    </label>
                    <input
                      type="text"
                      id="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="email">
                      <i className="fas fa-envelope"></i>
                      Email
                    </label>
                    <input
                      type="email"
                      id="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  
                  <button type="submit" className="update-button">
                    <i className="fas fa-save"></i>
                    Mettre à jour le profil
                  </button>
                </form>
              </div>
            )}
            
            {activeTab === 'security' && (
              <div className="profile-section">
                <h3>Sécurité du compte</h3>
                
                {passwordUpdateSuccess && (
                  <div className="success-message">
                    <i className="fas fa-check-circle"></i>
                    Mot de passe changé avec succès !
                  </div>
                )}
                
                {passwordUpdateError && (
                  <div className="error-message">
                    <i className="fas fa-exclamation-circle"></i>
                    {passwordUpdateError}
                  </div>
                )}
                
                <form onSubmit={handlePasswordChange} className="profile-form">
                  <div className="form-group">
                    <label htmlFor="currentPassword">
                      <i className="fas fa-key"></i>
                      Mot de passe actuel
                    </label>
                    <div className="password-input-group">
                      <input
                        type={showPassword.current ? "text" : "password"}
                        id="currentPassword"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        required
                      />
                      <button 
                        type="button"
                        className="toggle-password"
                        onClick={() => togglePasswordVisibility('current')}
                      >
                        <i className={`fas fa-eye${showPassword.current ? '-slash' : ''}`}></i>
                      </button>
                    </div>
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="newPassword">
                      <i className="fas fa-lock"></i>
                      Nouveau mot de passe
                    </label>
                    <div className="password-input-group">
                      <input
                        type={showPassword.new ? "text" : "password"}
                        id="newPassword"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        minLength="6"
                      />
                      <button 
                        type="button"
                        className="toggle-password"
                        onClick={() => togglePasswordVisibility('new')}
                      >
                        <i className={`fas fa-eye${showPassword.new ? '-slash' : ''}`}></i>
                      </button>
                    </div>
                    <div className="password-strength">
                      <div className={`strength-meter ${newPassword.length >= 6 ? 'medium' : ''} ${newPassword.length >= 10 ? 'strong' : ''}`}></div>
                      <span className="strength-text">
                        {newPassword ? 
                          (newPassword.length < 6 ? 'Faible' : newPassword.length < 10 ? 'Moyen' : 'Fort') 
                          : 'Aucun'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="confirmPassword">
                      <i className="fas fa-check-circle"></i>
                      Confirmer le mot de passe
                    </label>
                    <div className="password-input-group">
                      <input
                        type={showPassword.confirm ? "text" : "password"}
                        id="confirmPassword"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        minLength="6"
                      />
                      <button 
                        type="button"
                        className="toggle-password"
                        onClick={() => togglePasswordVisibility('confirm')}
                      >
                        <i className={`fas fa-eye${showPassword.confirm ? '-slash' : ''}`}></i>
                      </button>
                    </div>
                    {newPassword && confirmPassword && (
                      <div className="password-match">
                        {newPassword === confirmPassword ? (
                          <span className="match"><i className="fas fa-check"></i> Les mots de passe correspondent</span>
                        ) : (
                          <span className="no-match"><i className="fas fa-times"></i> Les mots de passe ne correspondent pas</span>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <button type="submit" className="update-button">
                    <i className="fas fa-lock"></i>
                    Changer le mot de passe
                  </button>
                </form>
                
                <div className="security-tips">
                  <h4><i className="fas fa-info-circle"></i> Conseils de sécurité</h4>
                  <ul>
                    <li>Utilisez un mot de passe d'au moins 8 caractères</li>
                    <li>Incluez des lettres, chiffres et caractères spéciaux</li>
                    <li>Ne réutilisez pas vos mots de passe</li>
                    <li>Changez régulièrement votre mot de passe</li>
                  </ul>
                </div>
              </div>
            )}
            
            {activeTab === 'activity' && (
              <div className="profile-section">
                <h3>Activité récente</h3>
                
                <div className="activity-empty">
                  <div className="activity-icon">
                    <i className="fas fa-chart-line"></i>
                  </div>
                  <p>Cette fonctionnalité sera bientôt disponible !</p>
                  <p className="activity-coming-soon">Vous pourrez bientôt suivre toute votre activité sur la plateforme.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;