// src/components/Layout/Layout.js
import React, { useState, useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Layout.css';
import NotificationIcon from '../Notifications/NotificationIcon';

const Layout = () => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  
  // Gérer le défilement pour changer l'apparence de la navbar
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    
    window.addEventListener('scroll', handleScroll);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);
  
  // Fermer le menu mobile et le dropdown lors du changement de route
  useEffect(() => {
    setMenuOpen(false);
    setUserDropdownOpen(false);
  }, [location.pathname]);
  
  // S'assurer que les canvas d'animation sont en arrière-plan et n'interfèrent pas avec l'interface
  useEffect(() => {
    const matrixCanvas = document.getElementById('matrix-canvas');
    if (matrixCanvas) {
      matrixCanvas.style.pointerEvents = 'none';
      matrixCanvas.style.zIndex = '-1';
    }

    const dataFlowCanvas = document.getElementById('data-flow-canvas');
    if (dataFlowCanvas) {
      dataFlowCanvas.style.pointerEvents = 'none';
      dataFlowCanvas.style.zIndex = '-1';
    }
  }, []);
  
  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  
  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
    // Fermer le dropdown utilisateur si le menu mobile est ouvert
    if (!menuOpen) {
      setUserDropdownOpen(false);
    }
  };
  
  const toggleUserDropdown = (e) => {
    e.stopPropagation();
    setUserDropdownOpen(!userDropdownOpen);
  };
  
  const isActive = (path) => {
    if (path === '/dashboard') {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="layout">
      {/* Header avec la navigation */}
      <header className={`header ${scrolled ? 'scrolled' : ''}`}>
        <div className="header-container">
          <div className="logo">
            <Link to="/dashboard">
              <span className="logo-text">VOID</span>
              <span className="logo-subtitle">HackSimulator</span>
            </Link>
          </div>
          
          <div className={`mobile-menu-toggle ${menuOpen ? 'active' : ''}`} onClick={toggleMenu}>
            <span></span>
            <span></span>
            <span></span>
          </div>
          
          <nav className={`navigation ${menuOpen ? 'open' : ''}`}>
            <ul className="nav-links">
              <li className={isActive('/dashboard') ? 'active' : ''}>
                <Link to="/dashboard">
                  <i className="fas fa-home"></i> 
                  <span>Tableau de bord</span>
                </Link>
              </li>
              <li className={isActive('/challenges') ? 'active' : ''}>
                <Link to="/challenges">
                  <i className="fas fa-tasks"></i> 
                  <span>Défis</span>
                </Link>
              </li>
              <li className={isActive('/leaderboard') ? 'active' : ''}>
                <Link to="/leaderboard">
                  <i className="fas fa-trophy"></i> 
                  <span>Classement</span>
                </Link>
              </li>
              {isAdmin && (
                <li className={isActive('/admin') ? 'active' : ''}>
                  <Link to="/admin">
                    <i className="fas fa-shield-alt"></i> 
                    <span>Admin</span>
                  </Link>
                </li>
              )}
            </ul>
            
            <div className="user-section">
              <div className="user-score">
                <i className="fas fa-star"></i>
                <span>{user?.score || 0} pts</span>
              </div>
              
              {/* Ajouter l'icône de notification ici */}
              <div className="notification-icon-container">
                <NotificationIcon />
              </div>
              
              <div className="user-menu-container">
                <div className="user-menu-trigger" onClick={toggleUserDropdown}>
                  <div className="user-avatar">
                    {user?.username ? user.username.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <span className="username">{user?.username}</span>
                  <i className={`fas fa-chevron-${userDropdownOpen ? 'up' : 'down'}`}></i>
                </div>
                
                {userDropdownOpen && (
                  <div className="user-dropdown">
                    <Link to="/profile" className="dropdown-item">
                      <i className="fas fa-user"></i> Profil
                    </Link>
                    <Link to="/notifications" className="dropdown-item">
                      <i className="fas fa-bell"></i> Notifications
                    </Link>
                    <div className="dropdown-divider"></div>
                    <button className="dropdown-item logout-btn" onClick={handleLogout}>
                      <i className="fas fa-sign-out-alt"></i> Déconnexion
                    </button>
                  </div>
                )}
              </div>
            </div>
          </nav>
        </div>
      </header>
      
      {/* Contenu principal */}
      <main className="main-content">
        <Outlet />
      </main>
      
      {/* Footer - conservé tel quel comme demandé */}
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-logo">VOID HackSimulator</div>
          <div className="footer-copyright">&copy; {new Date().getFullYear()} VOID Security. Tous droits réservés.</div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;