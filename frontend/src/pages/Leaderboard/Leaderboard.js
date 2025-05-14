// src/pages/Leaderboard/Leaderboard.js
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import './Leaderboard.css';

const Leaderboard = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // all, month, week
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const [animateTop3, setAnimateTop3] = useState(false);
  const [animateTable, setAnimateTable] = useState(false);
  const currentUserRef = useRef(null);
  
  // Charger les données du classement
  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setLoading(true);
        const response = await api.get('/api/users/leaderboard');
        
        if (response.data.status === 'success') {
          setUsers(response.data.data);
          setSearchResults(response.data.data);
        }
      } catch (error) {
        console.error('Erreur lors du chargement du classement:', error);
        setError(
          error.response?.data?.message || 
          'Erreur lors du chargement du classement. Veuillez réessayer.'
        );
      } finally {
        setLoading(false);
        
        // Ajouter une animation décalée
        setTimeout(() => {
          setAnimateTop3(true);
          
          setTimeout(() => {
            setAnimateTable(true);
          }, 300);
        }, 100);
      }
    };
    
    fetchLeaderboard();
  }, []);

  // Filtrer les utilisateurs selon la période
  const filterUsers = () => {
    if (filter === 'all') {
      return users;
    }
    
    // Cette fonction est un placeholder - dans une implémentation réelle,
    // vous récupéreriez ces données du backend ou filtreriez en fonction de dates réelles
    if (filter === 'month') {
      // Simuler un classement mensuel
      return users.map(user => ({
        ...user,
        score: Math.floor(user.score * 0.7), // 70% du score total pour ce mois
        completedChallenges: Math.floor(user.completedChallenges * 0.7)
      })).sort((a, b) => b.score - a.score);
    }
    
    if (filter === 'week') {
      // Simuler un classement hebdomadaire
      return users.map(user => ({
        ...user,
        score: Math.floor(user.score * 0.3), // 30% du score total pour cette semaine
        completedChallenges: Math.floor(user.completedChallenges * 0.3)
      })).sort((a, b) => b.score - a.score);
    }
    
    return users;
  };

  // Gérer la recherche d'utilisateurs
  const handleSearch = (e) => {
    const term = e.target.value.toLowerCase();
    setSearchTerm(term);
    
    if (term.trim() === '') {
      setSearchResults(users);
      return;
    }
    
    const results = users.filter(user => 
      user.username.toLowerCase().includes(term)
    );
    
    setSearchResults(results);
  };

  // Faire défiler jusqu'à l'utilisateur actuel
  useEffect(() => {
    if (animateTable && currentUserRef.current) {
      setTimeout(() => {
        currentUserRef.current.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
      }, 1000);
    }
  }, [animateTable]);

  const getUserRank = (userId) => {
    const filteredUsers = filterUsers();
    return filteredUsers.findIndex(u => u.id === userId) + 1;
  };

  const getTopUsers = () => {
    return filterUsers().slice(0, 3);
  };

  const getDisplayUsers = () => {
    return searchTerm ? searchResults : filterUsers();
  };

  const getMedalColor = (position) => {
    switch(position) {
      case 0: return 'gold';
      case 1: return 'silver';
      case 2: return 'bronze';
      default: return '';
    }
  };

  const getRankChange = (userId) => {
    // Fonction placeholder pour montrer les changements de classement
    // Dans une implémentation réelle, vous récupéreriez ces données du backend
    const random = Math.floor(Math.random() * 5) - 2; // -2 to 2
    if (random > 0) return `+${random}`;
    return random.toString();
  };

  if (loading) {
    return (
      <div className="leaderboard-loading">
        <div className="hexagon-loader">
          <div className="hexagon-container">
            <div className="hexagon"></div>
            <div className="hexagon"></div>
            <div className="hexagon"></div>
          </div>
        </div>
        <p>Chargement du classement...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="leaderboard-error">
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

  const topUsers = getTopUsers();
  const displayUsers = getDisplayUsers();
  const currentUserRank = user ? getUserRank(user.id) : -1;

  return (
    <div className="leaderboard-container">
      <div className="leaderboard-header">
        <h1>Classement des Hackers</h1>
        <p className="leaderboard-subtitle">Les meilleurs hackers de la communauté VOID</p>
      </div>
      
      <div className="leaderboard-filters">
        <div className="filter-buttons">
          <button 
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            <i className="fas fa-trophy"></i> Général
          </button>
          <button 
            className={`filter-btn ${filter === 'month' ? 'active' : ''}`}
            onClick={() => setFilter('month')}
          >
            <i className="fas fa-calendar-alt"></i> Ce mois
          </button>
          <button 
            className={`filter-btn ${filter === 'week' ? 'active' : ''}`}
            onClick={() => setFilter('week')}
          >
            <i className="fas fa-calendar-week"></i> Cette semaine
          </button>
        </div>
        
        <div className="search-container">
          <button 
            className={`search-toggle ${showSearch ? 'active' : ''}`}
            onClick={() => setShowSearch(!showSearch)}
          >
            <i className="fas fa-search"></i>
          </button>
          
          {showSearch && (
            <div className="search-input-container">
              <input
                type="text"
                placeholder="Rechercher un hacker..."
                value={searchTerm}
                onChange={handleSearch}
                className="search-input"
              />
              {searchTerm && (
                <button 
                  className="clear-search"
                  onClick={() => {
                    setSearchTerm('');
                    setSearchResults(users);
                  }}
                >
                  <i className="fas fa-times"></i>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Affichage spécial pour le top 3 */}
      {!searchTerm && (
        <div className={`leaderboard-podium ${animateTop3 ? 'animate' : ''}`}>
          {topUsers.map((topUser, index) => (
            <div 
              key={topUser.id} 
              className={`podium-position position-${index + 1} ${topUser.id === user?.id ? 'current-user' : ''}`}
            >
              <div className="position-number">{index + 1}</div>
              
              <div className={`medal-icon ${getMedalColor(index)}`}>
                <i className="fas fa-medal"></i>
              </div>
              
              <div className="podium-avatar">
                {topUser.username.charAt(0).toUpperCase()}
              </div>
              
              <div className="podium-info">
                <div className="podium-username">{topUser.username}</div>
                <div className="podium-score">{topUser.score} pts</div>
                <div className="podium-challenges">
                  <i className="fas fa-flag-checkered"></i> {topUser.completedChallenges}
                </div>
              </div>
              
              <div className="rank-change">
                {getRankChange(topUser.id) > 0 ? (
                  <span className="rank-up"><i className="fas fa-arrow-up"></i> {getRankChange(topUser.id)}</span>
                ) : getRankChange(topUser.id) < 0 ? (
                  <span className="rank-down"><i className="fas fa-arrow-down"></i> {getRankChange(topUser.id)}</span>
                ) : (
                  <span className="rank-same"><i className="fas fa-equals"></i></span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Affichage de son propre classement */}
      {user && currentUserRank > 3 && !searchTerm && (
        <div className="current-user-rank">
          <div className="current-user-label">Votre position</div>
          <div className="current-user-position">
            <span className="position-number">{currentUserRank}</span>
            <span className="current-username">{user.username}</span>
            <span className="current-score">{filterUsers().find(u => u.id === user.id)?.score || 0} pts</span>
          </div>
        </div>
      )}
      
      {/* Tableau de classement complet */}
      <div className={`leaderboard-table-container ${animateTable ? 'animate' : ''}`}>
        {displayUsers.length > 0 ? (
          <table className="leaderboard-table">
            <thead>
              <tr>
                <th>Rang</th>
                <th>Hacker</th>
                <th>Score</th>
                <th>Défis</th>
                <th>Évolution</th>
              </tr>
            </thead>
            <tbody>
              {displayUsers.map((leaderboardUser, index) => (
                <tr 
                  key={leaderboardUser.id} 
                  className={leaderboardUser.id === user?.id ? 'current-user-row' : ''}
                  ref={leaderboardUser.id === user?.id ? currentUserRef : null}
                >
                  <td className="rank-cell">
                    <span className="rank">{index + 1}</span>
                  </td>
                  <td className="user-cell">
                    <div className="user-info">
                      <div className="user-avatar">
                        {leaderboardUser.username.charAt(0).toUpperCase()}
                      </div>
                      <span className="username">{leaderboardUser.username}</span>
                    </div>
                  </td>
                  <td className="score-cell">{leaderboardUser.score}</td>
                  <td className="challenges-cell">
                    <i className="fas fa-flag-checkered"></i> {leaderboardUser.completedChallenges}
                  </td>
                  <td className="rank-change-cell">
                    {getRankChange(leaderboardUser.id) > 0 ? (
                      <span className="rank-up"><i className="fas fa-arrow-up"></i> {getRankChange(leaderboardUser.id)}</span>
                    ) : getRankChange(leaderboardUser.id) < 0 ? (
                      <span className="rank-down"><i className="fas fa-arrow-down"></i> {getRankChange(leaderboardUser.id)}</span>
                    ) : (
                      <span className="rank-same"><i className="fas fa-equals"></i></span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="no-results">
            <div className="no-results-icon">
              <i className="fas fa-search"></i>
            </div>
            <p>Aucun hacker trouvé pour "{searchTerm}"</p>
            <button 
              className="clear-search-button"
              onClick={() => {
                setSearchTerm('');
                setSearchResults(users);
              }}
            >
              Voir tous les hackers
            </button>
          </div>
        )}
      </div>
      
      {/* Légende du classement */}
      <div className="leaderboard-legend">
        <div className="legend-item">
          <i className="fas fa-info-circle"></i>
          <span>Le classement est basé sur les points cumulés en résolvant des défis</span>
        </div>
        <div className="legend-item">
          <span className="rank-up"><i className="fas fa-arrow-up"></i></span>
          <span>Évolution positive dans le classement</span>
        </div>
        <div className="legend-item">
          <span className="rank-down"><i className="fas fa-arrow-down"></i></span>
          <span>Évolution négative dans le classement</span>
        </div>
        <div className="legend-item">
          <span className="rank-same"><i className="fas fa-equals"></i></span>
          <span>Aucun changement de position</span>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;