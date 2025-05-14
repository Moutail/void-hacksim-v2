// src/pages/ChallengesList/ChallengesList.js
import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import './ChallengesList.css';

const ChallengesList = () => {
  const { user } = useAuth();
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // all, completed, incomplete
  const [typeFilter, setTypeFilter] = useState('all'); // all, terminal, crypto, code, network
  const [levelFilter, setLevelFilter] = useState('all'); // all, débutant, intermédiaire, avancé
  const [searchTerm, setSearchTerm] = useState('');
  const [activeView, setActiveView] = useState('grid'); // grid, list
  const [animateCards, setAnimateCards] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const searchInputRef = useRef(null);
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    terminal: 0,
    crypto: 0,
    code: 0,
    network: 0
  });

  // Charger les défis
  useEffect(() => {
    const fetchChallenges = async () => {
      try {
        setLoading(true);
        const response = await api.get('/api/challenges');
        
        if (response.data.status === 'success') {
          const challengesData = response.data.data;
          setChallenges(challengesData);
          
          // Calculer les statistiques
          const completedCount = challengesData.filter(c => c.isCompleted).length;
          const terminalCount = challengesData.filter(c => c.type === 'terminal').length;
          const cryptoCount = challengesData.filter(c => c.type === 'crypto').length;
          const codeCount = challengesData.filter(c => c.type === 'code').length;
          const networkCount = challengesData.filter(c => c.type === 'network').length;
          
          setStats({
            total: challengesData.length,
            completed: completedCount,
            terminal: terminalCount,
            crypto: cryptoCount,
            code: codeCount,
            network: networkCount
          });
        }
      } catch (error) {
        console.error('Erreur lors du chargement des défis:', error);
        setError(
          error.response?.data?.message || 
          'Erreur lors du chargement des défis. Veuillez réessayer.'
        );
      } finally {
        setLoading(false);
        
        // Déclencher les animations après le chargement
        setTimeout(() => {
          setAnimateCards(true);
        }, 100);
      }
    };
    
    fetchChallenges();
  }, []);

  // Gérer le focus sur le champ de recherche
  useEffect(() => {
    if (searchInputRef.current && searchTerm) {
      searchInputRef.current.focus();
    }
  }, [searchTerm]);

  // Filtrer les défis
  const filteredChallenges = challenges.filter(challenge => {
    // Filtrer par recherche
    if (searchTerm && !challenge.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !challenge.description.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    
    // Filtrer par statut
    if (filter === 'completed' && !challenge.isCompleted) {
      return false;
    }
    if (filter === 'incomplete' && challenge.isCompleted) {
      return false;
    }
    
    // Filtrer par type
    if (typeFilter !== 'all' && challenge.type !== typeFilter) {
      return false;
    }
    
    // Filtrer par niveau
    if (levelFilter !== 'all' && challenge.level !== levelFilter) {
      return false;
    }
    
    return true;
  });

  // Calculer le taux de complétion
  const calculateCompletionRate = () => {
    if (stats.total === 0) return 0;
    return Math.round((stats.completed / stats.total) * 100);
  };

  // Obtenir l'icône pour le type de défi
  const getChallengeTypeIcon = (type) => {
    switch(type) {
      case 'terminal': return 'fas fa-terminal';
      case 'crypto': return 'fas fa-lock';
      case 'code': return 'fas fa-code';
      case 'network': return 'fas fa-network-wired';
      default: return 'fas fa-question-circle';
    }
  };

  // Obtenir la couleur du niveau
  const getLevelColorClass = (level) => {
    switch(level) {
      case 'débutant': return 'level-beginner';
      case 'intermédiaire': return 'level-intermediate';
      case 'avancé': return 'level-advanced';
      default: return '';
    }
  };

  // Gérer la réinitialisation des filtres
  const handleResetFilters = () => {
    setFilter('all');
    setTypeFilter('all');
    setLevelFilter('all');
    setSearchTerm('');
  };

  // États de chargement et d'erreur
  if (loading) {
    return (
      <div className="challenges-loading">
        <div className="terminal-loader">
          <div className="terminal-header">
            <div className="terminal-title">VOID Terminal</div>
            <div className="terminal-controls">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
          <div className="terminal-body">
            <div className="terminal-text">
              <div className="terminal-line">
                <span className="terminal-prompt">$</span> chargement des défis...
              </div>
              <div className="terminal-line">
                <span className="terminal-prompt">$</span> identification des vulnérabilités...
              </div>
              <div className="terminal-line">
                <span className="terminal-prompt">$</span> préparation de l'environnement...
              </div>
              <div className="terminal-line typing">
                <span className="terminal-prompt">$</span> <span className="cursor"></span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="challenges-error">
        <div className="error-icon">
          <i className="fas fa-exclamation-triangle"></i>
        </div>
        <div className="error-message">{error}</div>
        <button 
          className="retry-button"
          onClick={() => window.location.reload()}
        >
          <i className="fas fa-redo"></i> Réessayer
        </button>
      </div>
    );
  }

  return (
    <div className="challenges-list-container">
      <div className="challenges-header">
        <div className="challenges-title-section">
          <h1>Défis disponibles</h1>
          <p className="challenges-subtitle">
            Testez vos compétences et gagnez des points en relevant ces défis
          </p>
        </div>
        
        <div className="challenges-stats">
          <div className="stats-card">
            <div className="stats-value">{stats.total}</div>
            <div className="stats-label">Défis</div>
          </div>
          <div className="stats-card">
            <div className="stats-value">{stats.completed}</div>
            <div className="stats-label">Complétés</div>
          </div>
          <div className="stats-card">
            <div className="stats-value">{calculateCompletionRate()}%</div>
            <div className="stats-label">Progression</div>
            <div className="progress-bar-container">
              <div 
                className="progress-bar" 
                style={{ width: `${calculateCompletionRate()}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="challenges-controls">
        <div className="search-section">
          <div className="search-input-container">
            <i className="fas fa-search search-icon"></i>
            <input
              type="text"
              placeholder="Rechercher un défi..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
              ref={searchInputRef}
            />
            {searchTerm && (
              <button 
                className="clear-search"
                onClick={() => setSearchTerm('')}
              >
                <i className="fas fa-times"></i>
              </button>
            )}
          </div>
          
          <div className="view-toggle">
            <button 
              className={`view-button ${activeView === 'grid' ? 'active' : ''}`}
              onClick={() => setActiveView('grid')}
              title="Vue en grille"
            >
              <i className="fas fa-th"></i>
            </button>
            <button 
              className={`view-button ${activeView === 'list' ? 'active' : ''}`}
              onClick={() => setActiveView('list')}
              title="Vue en liste"
            >
              <i className="fas fa-list"></i>
            </button>
          </div>
        </div>
        
        <div className="filters-section">
          <button 
            className={`filters-toggle ${showFilters ? 'active' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            <i className="fas fa-filter"></i>
            <span>Filtres</span>
            {(filter !== 'all' || typeFilter !== 'all' || levelFilter !== 'all') && (
              <span className="filters-active-badge"></span>
            )}
          </button>
          
          {showFilters && (
            <div className="filters-panel">
              <div className="filters-header">
                <h3>Filtrer les défis</h3>
                <button 
                  className="reset-filters"
                  onClick={handleResetFilters}
                  disabled={filter === 'all' && typeFilter === 'all' && levelFilter === 'all'}
                >
                  <i className="fas fa-undo"></i> Réinitialiser
                </button>
              </div>
              
              <div className="filters-body">
                <div className="filter-group">
                  <label>Statut:</label>
                  <div className="filter-buttons">
                    <button 
                      className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
                      onClick={() => setFilter('all')}
                    >
                      Tous
                    </button>
                    <button 
                      className={`filter-btn ${filter === 'completed' ? 'active' : ''}`}
                      onClick={() => setFilter('completed')}
                    >
                      <i className="fas fa-check-circle"></i> Complétés
                    </button>
                    <button 
                      className={`filter-btn ${filter === 'incomplete' ? 'active' : ''}`}
                      onClick={() => setFilter('incomplete')}
                    >
                      <i className="fas fa-times-circle"></i> Non complétés
                    </button>
                  </div>
                </div>
                
                <div className="filter-group">
                  <label>Type:</label>
                  <div className="filter-buttons">
                    <button 
                      className={`filter-btn ${typeFilter === 'all' ? 'active' : ''}`}
                      onClick={() => setTypeFilter('all')}
                    >
                      Tous
                    </button>
                    <button 
                      className={`filter-btn ${typeFilter === 'terminal' ? 'active' : ''}`}
                      onClick={() => setTypeFilter('terminal')}
                    >
                      <i className="fas fa-terminal"></i> Terminal
                    </button>
                    <button 
                      className={`filter-btn ${typeFilter === 'crypto' ? 'active' : ''}`}
                      onClick={() => setTypeFilter('crypto')}
                    >
                      <i className="fas fa-lock"></i> Cryptographie
                    </button>
                    <button 
                      className={`filter-btn ${typeFilter === 'code' ? 'active' : ''}`}
                      onClick={() => setTypeFilter('code')}
                    >
                      <i className="fas fa-code"></i> Code
                    </button>
                    <button 
                      className={`filter-btn ${typeFilter === 'network' ? 'active' : ''}`}
                      onClick={() => setTypeFilter('network')}
                    >
                      <i className="fas fa-network-wired"></i> Réseau
                    </button>
                  </div>
                </div>
                
                <div className="filter-group">
                  <label>Niveau:</label>
                  <div className="filter-buttons">
                    <button 
                      className={`filter-btn ${levelFilter === 'all' ? 'active' : ''}`}
                      onClick={() => setLevelFilter('all')}
                    >
                      Tous
                    </button>
                    <button 
                      className={`filter-btn ${levelFilter === 'débutant' ? 'active' : ''}`}
                      onClick={() => setLevelFilter('débutant')}
                    >
                      <i className="fas fa-seedling"></i> Débutant
                    </button>
                    <button 
                      className={`filter-btn ${levelFilter === 'intermédiaire' ? 'active' : ''}`}
                      onClick={() => setLevelFilter('intermédiaire')}
                    >
                      <i className="fas fa-user-ninja"></i> Intermédiaire
                    </button>
                    <button 
                      className={`filter-btn ${levelFilter === 'avancé' ? 'active' : ''}`}
                      onClick={() => setLevelFilter('avancé')}
                    >
                      <i className="fas fa-dragon"></i> Avancé
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {filteredChallenges.length === 0 ? (
        <div className="no-challenges">
          <div className="no-results-icon">
            <i className="fas fa-search"></i>
          </div>
          <p className="no-results-text">Aucun défi ne correspond à vos critères de recherche.</p>
          <button 
            className="reset-search-button"
            onClick={handleResetFilters}
          >
            <i className="fas fa-undo"></i> Réinitialiser les filtres
          </button>
        </div>
      ) : (
        <>
          <div className="challenges-count">
            {filteredChallenges.length} défi{filteredChallenges.length > 1 ? 's' : ''} trouvé{filteredChallenges.length > 1 ? 's' : ''}
          </div>
          
          {activeView === 'grid' ? (
            <div className="challenges-grid">
              {filteredChallenges.map((challenge, index) => (
                <div 
                  className={`challenge-card ${animateCards ? 'animate' : ''}`} 
                  key={challenge._id}
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div className="challenge-card-header">
                    <div className="challenge-type-badge">
                      <i className={getChallengeTypeIcon(challenge.type)}></i>
                      <span className="type-name">{challenge.type}</span>
                    </div>
                    
                    <div className={`challenge-level-badge ${getLevelColorClass(challenge.level)}`}>
                      {challenge.level === 'débutant' && <i className="fas fa-seedling"></i>}
                      {challenge.level === 'intermédiaire' && <i className="fas fa-user-ninja"></i>}
                      {challenge.level === 'avancé' && <i className="fas fa-dragon"></i>}
                      <span className="level-name">{challenge.level}</span>
                    </div>
                    
                    {challenge.isCompleted && (
                      <div className="challenge-completed-badge">
                        <i className="fas fa-check-circle"></i>
                      </div>
                    )}
                  </div>
                  
                  <h3 className="challenge-title">{challenge.title}</h3>
                  
                  <div className="challenge-description-container">
                    <p className="challenge-description">{challenge.description}</p>
                  </div>
                  
                  <div className="challenge-card-footer">
                    <div className="challenge-points">
                      <i className="fas fa-star"></i>
                      <span>{challenge.points} points</span>
                    </div>
                    
                    <Link to={`/challenges/${challenge._id}`} className="challenge-button">
                      {challenge.isCompleted ? (
                        <>
                          <i className="fas fa-redo-alt"></i>
                          <span>Rejouer</span>
                        </>
                      ) : (
                        <>
                          <i className="fas fa-play"></i>
                          <span>Commencer</span>
                        </>
                      )}
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="challenges-list">
              <div className="list-header">
                <div className="list-cell list-title-cell">Titre</div>
                <div className="list-cell list-type-cell">Type</div>
                <div className="list-cell list-level-cell">Niveau</div>
                <div className="list-cell list-points-cell">Points</div>
                <div className="list-cell list-status-cell">Statut</div>
                <div className="list-cell list-action-cell">Action</div>
              </div>
              
              <div className="list-body">
                {filteredChallenges.map((challenge, index) => (
                  <div 
                    className={`list-row ${challenge.isCompleted ? 'completed' : ''} ${animateCards ? 'animate' : ''}`} 
                    key={challenge._id}
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <div className="list-cell list-title-cell">
                      <div className="challenge-title-wrapper">
                        <h3 className="challenge-title">{challenge.title}</h3>
                        <p className="challenge-description">{challenge.description}</p>
                      </div>
                    </div>
                    
                    <div className="list-cell list-type-cell">
                      <div className="type-badge">
                        <i className={getChallengeTypeIcon(challenge.type)}></i>
                        <span>{challenge.type}</span>
                      </div>
                    </div>
                    
                    <div className="list-cell list-level-cell">
                      <div className={`level-badge ${getLevelColorClass(challenge.level)}`}>
                        {challenge.level}
                      </div>
                    </div>
                    
                    <div className="list-cell list-points-cell">
                      <div className="points-badge">
                        <i className="fas fa-star"></i>
                        <span>{challenge.points}</span>
                      </div>
                    </div>
                    
                    <div className="list-cell list-status-cell">
                      {challenge.isCompleted ? (
                        <div className="status-completed">
                          <i className="fas fa-check-circle"></i>
                          <span>Complété</span>
                        </div>
                      ) : (
                        <div className="status-incomplete">
                          <i className="fas fa-hourglass-half"></i>
                          <span>À faire</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="list-cell list-action-cell">
                      <Link to={`/challenges/${challenge._id}`} className="challenge-button-list">
                        {challenge.isCompleted ? 'Rejouer' : 'Commencer'}
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ChallengesList;