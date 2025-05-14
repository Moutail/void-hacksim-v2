// src/pages/Dashboard/Dashboard.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Tutorial from '../../components/Tutorial/Tutorial';
import api from '../../utils/api';
import './Dashboard.css';

const Dashboard = () => {
  const { user } = useAuth();
  const [showTutorial, setShowTutorial] = useState(false);
  const [challenges, setChallenges] = useState([]);
  const [topUsers, setTopUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Debug: Vérifier les données de l'utilisateur et afficher le tutoriel si nécessaire
  useEffect(() => {
    console.log("User data in Dashboard:", user);
    console.log("tutorialCompleted status:", user?.tutorialCompleted);
    
    if (user && user.tutorialCompleted === false) {
      console.log("Tutorial should show!");
      setShowTutorial(true);
    }
  }, [user]);

  // Gestionnaire pour fermer le tutoriel
  const handleCloseTutorial = () => {
    console.log("Tutorial closed!");
    setShowTutorial(false);
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Charger les défis
        const challengesResponse = await api.get('/api/challenges');
        
        if (challengesResponse.data.status === 'success') {
          setChallenges(challengesResponse.data.data);
        }
        
        // Charger le classement des meilleurs utilisateurs
        const usersResponse = await api.get('/api/users/leaderboard');
        
        if (usersResponse.data.status === 'success') {
          setTopUsers(usersResponse.data.data);
        }
      } catch (error) {
        console.error('Erreur lors du chargement des données du tableau de bord:', error);
        setError('Erreur lors du chargement des données. Veuillez réessayer.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboardData();
  }, []);

  // Filtrer les défis récents (limités à 3)
  const recentChallenges = challenges
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 3);
  
  // Filtrer les défis complétés par l'utilisateur
  const completedChallenges = challenges.filter(challenge => challenge.isCompleted);
  
  // Calculer la progression globale
  const progressPercentage = challenges.length > 0
    ? Math.round((completedChallenges.length / challenges.length) * 100)
    : 0;

  if (loading) {
    return <div className="dashboard-loading">Chargement du tableau de bord...</div>;
  }

  if (error) {
    return <div className="dashboard-error">{error}</div>;
  }

  return (
    <>
      {showTutorial && <Tutorial onClose={handleCloseTutorial} />}
      
      <div className="dashboard">
        <div className="dashboard-header">
          <h1>Tableau de bord</h1>
          <div className="user-greeting">
            Bienvenue, <span className="username">{user?.username}</span> !
          </div>
        </div>
        
        <div className="dashboard-stats">
          <div className="stat-card">
            <div className="stat-icon">
              <i className="fas fa-trophy"></i>
            </div>
            <div className="stat-content">
              <div className="stat-value">{user?.score || 0}</div>
              <div className="stat-label">Points</div>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">
              <i className="fas fa-check-circle"></i>
            </div>
            <div className="stat-content">
              <div className="stat-value">{completedChallenges.length}</div>
              <div className="stat-label">Défis terminés</div>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">
              <i className="fas fa-star"></i>
            </div>
            <div className="stat-content">
              <div className="stat-value">
                {topUsers.findIndex(topUser => topUser.id === user?.id) + 1 || '-'}
              </div>
              <div className="stat-label">Classement</div>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">
              <i className="fas fa-tasks"></i>
            </div>
            <div className="stat-content">
              <div className="stat-value">{progressPercentage}%</div>
              <div className="stat-label">Progression</div>
            </div>
          </div>
        </div>

        <div className="quick-navigation">
          <h3>Navigation rapide</h3>
          <div className="quick-nav-items">
            <Link to="/forum" className="quick-nav-item">
              <i className="fas fa-comments"></i>
              <span>Forum</span>
            </Link>
            <Link to="/challenges" className="quick-nav-item">
              <i className="fas fa-flag"></i>
              <span>Défis</span>
            </Link>
            <Link to="/leaderboard" className="quick-nav-item">
              <i className="fas fa-trophy"></i>
              <span>Classement</span>
            </Link>
            <Link to="/notifications" className="quick-nav-item">
              <i className="fas fa-bell"></i>
              <span>Notifications</span>
            </Link>
          </div>
        </div>
        
        <button 
          className="replay-tutorial-btn"
          onClick={() => setShowTutorial(true)}
          style={{
            padding: '10px 15px',
            margin: '20px 0',
            backgroundColor: 'rgba(0, 255, 0, 0.1)',
            color: '#0f0',
            border: '1px solid #0f0',
            borderRadius: '4px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <i className="fas fa-question-circle"></i> Revoir le tutoriel
        </button>
        
        <div className="dashboard-sections">
          <div className="dashboard-section">
            <div className="section-header">
              <h2>Défis récents</h2>
              <Link to="/challenges" className="view-all-link">
                Voir tous les défis <i className="fas fa-arrow-right"></i>
              </Link>
            </div>
            
            <div className="challenges-grid">
              {recentChallenges.length > 0 ? (
                recentChallenges.map(challenge => (
                  <div className="challenge-card" key={challenge._id}>
                    <div className="challenge-card-header">
                      <span className={`challenge-type ${challenge.type}`}>
                        {challenge.type}
                      </span>
                      <span className={`challenge-level ${challenge.level}`}>
                        {challenge.level}
                      </span>
                    </div>
                    
                    <h3 className="challenge-title">{challenge.title}</h3>
                    <p className="challenge-description">{challenge.description}</p>
                    
                    <div className="challenge-card-footer">
                      <span className="challenge-points">
                        {challenge.points} points
                      </span>
                      <Link to={`/challenges/${challenge._id}`} className="challenge-button">
                        {challenge.isCompleted ? 'Rejouer' : 'Commencer'}
                      </Link>
                    </div>
                  </div>
                ))
              ) : (
                <div className="no-challenges">
                  Aucun défi disponible pour le moment.
                </div>
              )}
            </div>
          </div>
          
          <div className="dashboard-section">
            <div className="section-header">
              <h2>Meilleurs hackers</h2>
              <Link to="/leaderboard" className="view-all-link">
                Voir le classement complet <i className="fas fa-arrow-right"></i>
              </Link>
            </div>
            
            <div className="leaderboard">
              {topUsers.length > 0 ? (
                <table className="leaderboard-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Utilisateur</th>
                      <th>Score</th>
                      <th>Défis</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topUsers.map((topUser, index) => (
                      <tr key={topUser.id} className={topUser.id === user?.id ? 'current-user' : ''}>
                        <td>{index + 1}</td>
                        <td>{topUser.username}</td>
                        <td>{topUser.score}</td>
                        <td>{topUser.completedChallenges}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="no-users">
                  Aucun utilisateur classé pour le moment.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Dashboard;