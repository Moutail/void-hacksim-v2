// src/pages/ForumPage.js
import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ForumContainer from '../components/Forum/ForumContainer';

const ForumPage = () => {
  const { channel } = useParams();
  const navigate = useNavigate();
  
  // Rediriger vers le canal général si aucun canal n'est spécifié
  useEffect(() => {
    if (!channel) {
      navigate('/forum/general', { replace: true });
    }
  }, [channel, navigate]);
  
  return (
    <div className="page-container">
      <ForumContainer initialChannel={channel || 'general'} />
    </div>
  );
};

export default ForumPage;