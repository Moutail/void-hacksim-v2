// src/components/Navbar/Navbar.js - Mise à jour pour inclure l'icône de notification
import React from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import NotificationIcon from '../Notifications/NotificationIcon'; // Importer l'icône de notification
import './Navbar.css';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user && user.role === 'admin';
  
  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  
  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Link to="/dashboard" className="logo">
          <span className="logo-text">VOID</span>
          <span className="logo-subtitle">HackSimulator</span>
        </Link>
      </div>
      
      <div className="navbar-links">
        <NavLink to="/dashboard" className={({ isActive }) => isActive ? 'active' : ''}>
          <i className="fas fa-tachometer-alt"></i> Tableau de bord
        </NavLink>
        
        <NavLink to="/challenges" className={({ isActive }) => isActive ? 'active' : ''}>
          <i className="fas fa-flag"></i> Défis
        </NavLink>
        
        <NavLink to="/forum" className={({ isActive }) => isActive ? 'active' : ''}>
          <i className="fas fa-comments"></i> Forum
        </NavLink>
        
        <NavLink to="/leaderboard" className={({ isActive }) => isActive ? 'active' : ''}>
          <i className="fas fa-trophy"></i> Classement
        </NavLink>
        
        {isAdmin && (
          <NavLink to="/admin" className={({ isActive }) => isActive ? 'active' : ''}>
            <i className="fas fa-cogs"></i> Admin
          </NavLink>
        )}
      </div>
      
      <div className="navbar-user">
        {/* Icône de notification */}
        <NotificationIcon />
        
        <div className="user-dropdown">
          <button className="user-dropdown-btn">
            <div className="user-avatar">
              {user && user.username ? user.username.charAt(0).toUpperCase() : '?'}
            </div>
            <span className="user-name">{user ? user.username : 'Utilisateur'}</span>
            <i className="fas fa-chevron-down"></i>
          </button>
          
          <div className="user-dropdown-content">
            <Link to="/profile">
              <i className="fas fa-user"></i> Profil
            </Link>
            
            <Link to="/notifications">
              <i className="fas fa-bell"></i> Notifications
            </Link>
            
            <hr />
            
            <button onClick={handleLogout} className="logout-btn">
              <i className="fas fa-sign-out-alt"></i> Déconnexion
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;