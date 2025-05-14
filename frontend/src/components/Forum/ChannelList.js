// src/components/Forum/ChannelList.js - Liste des canaux de discussion
import React from 'react';
import { useAuth } from '../../context/AuthContext';
import './Forum.css';

const ChannelList = ({ currentChannel, onChannelChange }) => {
  const { user } = useAuth();
  const isAdmin = user && user.role === 'admin';
  
  const channels = [
    { id: 'general', name: 'Général', icon: 'fas fa-comments' },
    { id: 'help', name: 'Aide & Support', icon: 'fas fa-question-circle' },
    { id: 'challenges', name: 'Défis', icon: 'fas fa-trophy' },
    { id: 'announcements', name: 'Annonces', icon: 'fas fa-bullhorn' }
  ];
  
  return (
    <div className="channel-list">
      <div className="channel-list-header">
        <h3>Canaux</h3>
      </div>
      
      <ul>
        {channels.map(channel => (
          <li 
            key={channel.id}
            className={currentChannel === channel.id ? 'active' : ''}
            onClick={() => onChannelChange(channel.id)}
          >
            <i className={channel.icon}></i>
            <span className="channel-name">{channel.name}</span>
            {channel.id === 'announcements' && isAdmin && (
              <span className="admin-badge">Admin</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ChannelList; 