// src/pages/Admin/AdminPanel.js
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import './AdminPanel.css';
import ChallengeForm from './ChallengeForm';
import UserForm from './UserForm';

const AdminPanel = ({ section = 'dashboard' }) => {
  const { user } = useAuth();
  const [activeSection, setActiveSection] = useState(section);
  const [users, setUsers] = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalChallenges: 0,
    completedAttempts: 0,
    averageScore: 0
  });
  
  // États pour la gestion des formulaires
  const [showChallengeForm, setShowChallengeForm] = useState(false);
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingChallenge, setEditingChallenge] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, type: null, id: null });

  // Charger les données initiales
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Charger les utilisateurs
        if (activeSection === 'users' || activeSection === 'dashboard') {
          const usersResponse = await api.get('/api/users');
          
          if (usersResponse.data.status === 'success') {
            setUsers(usersResponse.data.data);
            if (activeSection === 'dashboard') {
              setStats(prev => ({
                ...prev,
                totalUsers: usersResponse.data.data.length
              }));
            }
          }
        }
        
        // Charger les défis
        if (activeSection === 'challenges' || activeSection === 'dashboard') {
          const challengesResponse = await api.get('/api/challenges');
          
          if (challengesResponse.data.status === 'success') {
            setChallenges(challengesResponse.data.data);
            if (activeSection === 'dashboard') {
              setStats(prev => ({
                ...prev,
                totalChallenges: challengesResponse.data.data.length
              }));
            }
          }
        }
        
        // Obtenir des statistiques supplémentaires pour le dashboard
        if (activeSection === 'dashboard') {
          // Calculer le score moyen des utilisateurs
          if (users.length > 0) {
            const totalScore = users.reduce((acc, user) => acc + user.score, 0);
            const averageScore = Math.round(totalScore / users.length);
            setStats(prev => ({ ...prev, averageScore }));
          }
          
          // Calculer le nombre total de défis complétés
          const completedChallengesCount = users.reduce(
            (acc, user) => acc + (user.completedChallenges?.length || 0), 
            0
          );
          setStats(prev => ({ ...prev, completedAttempts: completedChallengesCount }));
        }
      } catch (error) {
        console.error('Erreur lors du chargement des données:', error);
        setError(
          error.response?.data?.message || 
          'Erreur lors du chargement des données. Veuillez réessayer.'
        );
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [activeSection]);

  // Changer de section
  const handleSectionChange = (newSection) => {
    setActiveSection(newSection);
    // Réinitialiser les états de formulaire lors du changement de section
    setShowChallengeForm(false);
    setShowUserForm(false);
    setEditingChallenge(null);
    setEditingUser(null);
    setDeleteConfirm({ show: false, type: null, id: null });
  };

  // Gestionnaires pour les défis
  const handleAddChallenge = () => {
    setEditingChallenge(null);
    setShowChallengeForm(true);
  };

  const handleEditChallenge = (challenge) => {
    setEditingChallenge(challenge);
    setShowChallengeForm(true);
  };

  const handleSaveChallenge = async (challengeData) => {
    try {
      setLoading(true);
      
      let response;
      if (editingChallenge) {
        // Mise à jour d'un défi existant
        response = await api.put(`/api/challenges/${editingChallenge._id}`, challengeData);
        
        if (response.data.status === 'success') {
          setChallenges(prev => 
            prev.map(challenge => 
              challenge._id === editingChallenge._id ? response.data.data : challenge
            )
          );
        }
      } else {
        // Création d'un nouveau défi
        response = await api.post('/api/challenges', challengeData);
        
        if (response.data.status === 'success') {
          setChallenges(prev => [...prev, response.data.data]);
        }
      }
      
      setShowChallengeForm(false);
      setEditingChallenge(null);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du défi:', error);
      alert(error.response?.data?.message || 'Erreur lors de la sauvegarde du défi');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteChallenge = async (id) => {
    if (deleteConfirm.show && deleteConfirm.type === 'challenge' && deleteConfirm.id === id) {
      try {
        setLoading(true);
        
        const response = await api.delete(`/api/challenges/${id}`);
        
        if (response.data.status === 'success') {
          setChallenges(prev => prev.filter(challenge => challenge._id !== id));
          setDeleteConfirm({ show: false, type: null, id: null });
        }
      } catch (error) {
        console.error('Erreur lors de la suppression du défi:', error);
        alert(error.response?.data?.message || 'Erreur lors de la suppression du défi');
      } finally {
        setLoading(false);
      }
    } else {
      setDeleteConfirm({ show: true, type: 'challenge', id });
    }
  };

  // Gestionnaires pour les utilisateurs
  const handleAddUser = () => {
    setEditingUser(null);
    setShowUserForm(true);
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setShowUserForm(true);
  };

  const handleSaveUser = async (userData) => {
    try {
      setLoading(true);
      
      let response;
      if (editingUser) {
        // Mise à jour d'un utilisateur existant
        response = await api.put(`/api/users/${editingUser._id}`, userData);
        
        if (response.data.status === 'success') {
          setUsers(prev => 
            prev.map(user => 
              user._id === editingUser._id ? response.data.data : user
            )
          );
        }
      } else {
        // Création d'un nouvel utilisateur
        response = await api.post('/api/auth/register', userData);
        
        if (response.data.status === 'success') {
          // Recharger la liste des utilisateurs pour inclure le nouveau
          const usersResponse = await api.get('/api/users');
          if (usersResponse.data.status === 'success') {
            setUsers(usersResponse.data.data);
          }
        }
      }
      
      setShowUserForm(false);
      setEditingUser(null);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de l\'utilisateur:', error);
      alert(error.response?.data?.message || 'Erreur lors de la sauvegarde de l\'utilisateur');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (id) => {
    if (deleteConfirm.show && deleteConfirm.type === 'user' && deleteConfirm.id === id) {
      try {
        setLoading(true);
        
        const response = await api.delete(`/api/users/${id}`);
        
        if (response.data.status === 'success') {
          setUsers(prev => prev.filter(user => user._id !== id));
          setDeleteConfirm({ show: false, type: null, id: null });
        }
      } catch (error) {
        console.error('Erreur lors de la suppression de l\'utilisateur:', error);
        alert(error.response?.data?.message || 'Erreur lors de la suppression de l\'utilisateur');
      } finally {
        setLoading(false);
      }
    } else {
      setDeleteConfirm({ show: true, type: 'user', id });
    }
  };

  // Annuler la confirmation de suppression
  const handleCancelDelete = () => {
    setDeleteConfirm({ show: false, type: null, id: null });
  };

  if (!user || user.role !== 'admin') {
    return (
      <div className="admin-error">
        Accès non autorisé. Vous devez être administrateur pour voir cette page.
      </div>
    );
  }

  return (
    <div className="admin-container">
      <h1>Panneau d'administration</h1>
      
      <div className="admin-content">
        <div className="admin-sidebar">
          <div className="admin-menu">
            <button 
              className={`admin-menu-item ${activeSection === 'dashboard' ? 'active' : ''}`}
              onClick={() => handleSectionChange('dashboard')}
            >
              <i className="fas fa-tachometer-alt"></i>
              Dashboard
            </button>
            
            <button 
              className={`admin-menu-item ${activeSection === 'users' ? 'active' : ''}`}
              onClick={() => handleSectionChange('users')}
            >
              <i className="fas fa-users"></i>
              Utilisateurs
            </button>
            
            <button 
              className={`admin-menu-item ${activeSection === 'challenges' ? 'active' : ''}`}
              onClick={() => handleSectionChange('challenges')}
            >
              <i className="fas fa-tasks"></i>
              Défis
            </button>
          </div>
        </div>
        
        <div className="admin-main">
          {loading && !showChallengeForm && !showUserForm ? (
            <div className="admin-loading">Chargement des données...</div>
          ) : error ? (
            <div className="admin-error">{error}</div>
          ) : (
            <>
              {/* Section Dashboard */}
              {activeSection === 'dashboard' && (
                <div className="admin-dashboard">
                  <h2>Tableau de bord</h2>
                  
                  <div className="admin-stats">
                    <div className="admin-stat-card">
                      <div className="stat-icon">
                        <i className="fas fa-users"></i>
                      </div>
                      <div className="stat-content">
                        <div className="stat-value">{stats.totalUsers}</div>
                        <div className="stat-label">Utilisateurs</div>
                      </div>
                    </div>
                    
                    <div className="admin-stat-card">
                      <div className="stat-icon">
                        <i className="fas fa-tasks"></i>
                      </div>
                      <div className="stat-content">
                        <div className="stat-value">{stats.totalChallenges}</div>
                        <div className="stat-label">Défis</div>
                      </div>
                    </div>
                    
                    <div className="admin-stat-card">
                      <div className="stat-icon">
                        <i className="fas fa-check-circle"></i>
                      </div>
                      <div className="stat-content">
                        <div className="stat-value">{stats.completedAttempts}</div>
                        <div className="stat-label">Défis complétés</div>
                      </div>
                    </div>
                    
                    <div className="admin-stat-card">
                      <div className="stat-icon">
                        <i className="fas fa-star"></i>
                      </div>
                      <div className="stat-content">
                        <div className="stat-value">{stats.averageScore}</div>
                        <div className="stat-label">Score moyen</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="admin-actions">
                    <h3>Actions rapides</h3>
                    <div className="admin-actions-buttons">
                      <button className="admin-action-btn" onClick={handleAddChallenge}>
                        <i className="fas fa-plus"></i> Nouveau défi
                      </button>
                      <button className="admin-action-btn" onClick={handleAddUser}>
                        <i className="fas fa-user-plus"></i> Nouvel utilisateur
                      </button>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Section Utilisateurs */}
              {activeSection === 'users' && !showUserForm && (
                <div className="admin-users">
                  <h2>Gestion des utilisateurs</h2>
                  
                  <div className="admin-actions-top">
                    <button className="admin-action-btn" onClick={handleAddUser}>
                      <i className="fas fa-user-plus"></i> Ajouter un utilisateur
                    </button>
                  </div>
                  
                  <div className="admin-table-container">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Nom d'utilisateur</th>
                          <th>Email</th>
                          <th>Rôle</th>
                          <th>Score</th>
                          <th>Date de création</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map(userItem => (
                          <tr key={userItem._id}>
                            <td>{userItem._id.substring(0, 8)}...</td>
                            <td>{userItem.username}</td>
                            <td>{userItem.email}</td>
                            <td>
                              <span className={`user-role ${userItem.role}`}>
                                {userItem.role}
                              </span>
                            </td>
                            <td>{userItem.score}</td>
                            <td>{new Date(userItem.createdAt).toLocaleDateString()}</td>
                            <td>
                              <div className="admin-actions-cell">
                                <button 
                                  className="action-btn edit"
                                  onClick={() => handleEditUser(userItem)}
                                >
                                  <i className="fas fa-edit"></i>
                                </button>
                                <button 
                                  className="action-btn delete"
                                  onClick={() => handleDeleteUser(userItem._id)}
                                >
                                  <i className="fas fa-trash"></i>
                                </button>
                                
                                {deleteConfirm.show && 
                                 deleteConfirm.type === 'user' && 
                                 deleteConfirm.id === userItem._id && (
                                  <div className="delete-confirm">
                                    <span>Confirmer ?</span>
                                    <button 
                                      onClick={() => handleDeleteUser(userItem._id)}
                                      className="confirm-yes"
                                    >
                                      Oui
                                    </button>
                                    <button 
                                      onClick={handleCancelDelete}
                                      className="confirm-no"
                                    >
                                      Non
                                    </button>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              
              {/* Formulaire d'utilisateur */}
              {activeSection === 'users' && showUserForm && (
                <UserForm
                  user={editingUser} 
                  onSave={handleSaveUser} 
                  onCancel={() => setShowUserForm(false)}
                />
              )}
              
              {/* Section Défis */}
              {activeSection === 'challenges' && !showChallengeForm && (
                <div className="admin-challenges">
                  <h2>Gestion des défis</h2>
                  
                  <div className="admin-create-challenge">
                    <button 
                      className="admin-action-btn"
                      onClick={handleAddChallenge}
                    >
                      <i className="fas fa-plus"></i> Créer un nouveau défi
                    </button>
                  </div>
                  
                  <div className="admin-table-container">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Titre</th>
                          <th>Type</th>
                          <th>Niveau</th>
                          <th>Points</th>
                          <th>Statut</th>
                          <th>Date de création</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {challenges.map(challenge => (
                          <tr key={challenge._id}>
                            <td>{challenge.title}</td>
                            <td>
                              <span className={`challenge-type ${challenge.type}`}>
                                {challenge.type}
                              </span>
                            </td>
                            <td>
                              <span className={`challenge-level ${challenge.level}`}>
                                {challenge.level}
                              </span>
                            </td>
                            <td>{challenge.points}</td>
                            <td>
                              <span className={`challenge-status ${challenge.active ? 'active' : 'inactive'}`}>
                                {challenge.active ? 'Actif' : 'Inactif'}
                              </span>
                            </td>
                            <td>{new Date(challenge.createdAt).toLocaleDateString()}</td>
                            <td>
                              <div className="admin-actions-cell">
                                <button 
                                  className="action-btn edit"
                                  onClick={() => handleEditChallenge(challenge)}
                                >
                                  <i className="fas fa-edit"></i>
                                </button>
                                <button 
                                  className="action-btn delete"
                                  onClick={() => handleDeleteChallenge(challenge._id)}
                                >
                                  <i className="fas fa-trash"></i>
                                </button>
                                
                                {deleteConfirm.show && 
                                 deleteConfirm.type === 'challenge' && 
                                 deleteConfirm.id === challenge._id && (
                                  <div className="delete-confirm">
                                    <span>Confirmer ?</span>
                                    <button 
                                      onClick={() => handleDeleteChallenge(challenge._id)}
                                      className="confirm-yes"
                                    >
                                      Oui
                                    </button>
                                    <button 
                                      onClick={handleCancelDelete}
                                      className="confirm-no"
                                    >
                                      Non
                                    </button>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              
              {/* Formulaire de défi */}
              {activeSection === 'challenges' && showChallengeForm && (
                <ChallengeForm 
                  challenge={editingChallenge} 
                  onSave={handleSaveChallenge} 
                  onCancel={() => setShowChallengeForm(false)}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;