// Exemple d'intégration du PresenceContext dans App.js

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { PresenceProvider } from './context/PresenceContext';

// Pages
import Login from './pages/Login/Login';
import Register from './pages/Register/Register';
import Dashboard from './pages/Dashboard/Dashboard';
import ChallengesList from './pages/ChallengesList/ChallengesList';
import Challenge from './components/Challenge/Challenge';
import Profile from './pages/Profile/Profile';
import Leaderboard from './pages/Leaderboard/Leaderboard';
import AdminPanel from './pages/Admin/AdminPanel';
import NotificationsPage from './pages/NotificationsPage';
import ForumPage from './pages/ForumPage';

// Composants
import Layout from './components/Layout/Layout';
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute';
import AdminRoute from './components/ProtectedRoute/AdminRoute';
import NotFound from './pages/NotFound/NotFound';

// Styles globaux
import './App.css';

const AppRoutes = () => {
  const { loading } = useAuth();
  
  if (loading) {
    return <div className="loading-screen">Chargement...</div>;
  }
  
  return (
    <Routes>
      {/* Routes publiques */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      
      {/* Routes protégées */}
      <Route path="/" element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="challenges" element={<ChallengesList />} />
        <Route path="challenges/:id" element={<Challenge />} />
        <Route path="profile" element={<Profile />} />
        <Route path="leaderboard" element={<Leaderboard />} />
        
        {/* Nouvelles routes */}
        <Route path="forum" element={<ForumPage />} />
        <Route path="forum/:channel" element={<ForumPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
      </Route>
      
      {/* Routes admin */}
      <Route path="/admin" element={
        <AdminRoute>
          <Layout />
        </AdminRoute>
      }>
        <Route index element={<AdminPanel />} />
        <Route path="challenges" element={<AdminPanel section="challenges" />} />
        <Route path="users" element={<AdminPanel section="users" />} />
      </Route>
      
      {/* Route 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <PresenceProvider>
        <Router basename={process.env.PUBLIC_URL}>
          <AppRoutes />
        </Router>
      </PresenceProvider>
    </AuthProvider>
  );
};

export default App;