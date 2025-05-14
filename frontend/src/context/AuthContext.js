// src/context/AuthContext.js
import { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Vérifier si l'utilisateur est déjà connecté au chargement
  useEffect(() => {
    const checkUserLoggedIn = async () => {
      try {
        const token = localStorage.getItem('token');
        
        if (!token) {
          setLoading(false);
          return;
        }
        
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        const response = await api.get('/api/auth/me');
        
        if (response.data.status === 'success') {
          setUser(response.data.user);
        } else {
          // Gérer les erreurs d'authentification
          localStorage.removeItem('token');
          delete api.defaults.headers.common['Authorization'];
        }
      } catch (error) {
        console.error('Erreur d\'authentification:', error);
        localStorage.removeItem('token');
        delete api.defaults.headers.common['Authorization'];
      } finally {
        setLoading(false);
      }
    };
    
    checkUserLoggedIn();
  }, []);

  // Inscription
  const register = async (username, email, password) => {
    try {
      setError(null);
      const response = await api.post('/api/auth/register', {
        username,
        email,
        password
      });
      
      const { token, user } = response.data;
      
      localStorage.setItem('token', token);
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      setUser(user);
      return { success: true };
    } catch (error) {
      setError(
        error.response?.data?.message || 
        'Erreur lors de l\'inscription. Veuillez réessayer.'
      );
      return { success: false, error: error.response?.data?.message };
    }
  };

  // Connexion
  const login = async (email, password) => {
    try {
      setError(null);
      const response = await api.post('/api/auth/login', {
        email,
        password
      });
      
      const { token, user } = response.data;
      
      localStorage.setItem('token', token);
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      setUser(user);
      return { success: true };
    } catch (error) {
      setError(
        error.response?.data?.message || 
        'Email ou mot de passe incorrect.'
      );
      return { success: false, error: error.response?.data?.message };
    }
  };

  // Déconnexion
  const logout = () => {
    localStorage.removeItem('token');
    delete api.defaults.headers.common['Authorization'];
    setUser(null);
  };

  // Mise à jour du profil
  const updateProfile = async (userData) => {
    try {
      setError(null);
      const response = await api.put('/api/users/profile', userData);
      
      setUser(response.data.data);
      return { success: true };
    } catch (error) {
      setError(
        error.response?.data?.message || 
        'Erreur lors de la mise à jour du profil.'
      );
      return { success: false, error: error.response?.data?.message };
    }
  };

  // Changement de mot de passe
  const changePassword = async (currentPassword, newPassword) => {
    try {
      setError(null);
      await api.put('/api/users/change-password', {
        currentPassword,
        newPassword
      });
      
      return { success: true };
    } catch (error) {
      setError(
        error.response?.data?.message || 
        'Erreur lors du changement de mot de passe.'
      );
      return { success: false, error: error.response?.data?.message };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        register,
        login,
        logout,
        updateProfile,
        changePassword,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'admin'
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;