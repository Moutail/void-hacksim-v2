// src/components/Tutorial/Tutorial.js - Mise à jour avec effets démo
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import './Tutorial.css';

// Importer les composants d'effets pour la démo
import { 
  DownloadSimulation, 
  HackingEffect,
  DecryptionEffect,
  ExploitEffect
} from '../Effects';

const tutorialSteps = [
  {
    title: "Bienvenue sur VOID HackSimulator",
    content: "Vous venez de rejoindre la communauté des hackers éthiques. Ce tutoriel vous guidera à travers les fonctionnalités de base.",
    image: "/images/tutorial/welcome.jpeg",
  },
  {
    title: "Le Terminal",
    content: "Le terminal est votre principal outil pour interagir avec le système. Utilisez des commandes comme 'ls', 'cd' et 'cat' pour naviguer et explorer.",
    image: "/images/tutorial/terminal.jpeg",
    code: "ls\ncd missions\ncat readme.txt"
  },
  {
    title: "Commandes spéciales",
    content: "Pour certaines opérations avancées, utilisez des commandes comme 'decrypt', 'download', 'hack' et 'exploit'. Ces commandes déclenchent des effets visuels qui simulent les opérations réelles.",
    demo: "specialCommands",
  },
  {
    title: "Les Défis",
    content: "Complétez des défis pour améliorer vos compétences et gagner des points. Chaque défi a des objectifs spécifiques à accomplir.",
    image: "/images/tutorial/challenges.jpeg",
  },
  {
    title: "Le Classement",
    content: "Comparez vos performances avec d'autres hackers dans le classement. Gagnez plus de points pour monter dans le classement.",
    image: "/images/tutorial/leaderboard.jpeg",
  },
  {
    title: "Votre Profil",
    content: "Suivez votre progression, gérez vos préférences et consultez votre historique dans votre profil personnel.",
    image: "/images/tutorial/profile.jpeg",
  },
  {
    title: "C'est parti !",
    content: "Vous êtes prêt à commencer votre aventure de hacking éthique. Bonne chance !",
    image: "/images/tutorial/start.jpeg",
  }
];

const Tutorial = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [currentDemo, setCurrentDemo] = useState(null);
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();

  // Gérer la fermeture du tutoriel
  const handleCloseTutorial = async (completed = true) => {
    setIsVisible(false);
    
    try {
      // Marquer le tutoriel comme complété dans la base de données
      await api.put('/api/users/tutorial-completed');
      
      // Mettre à jour l'état local de l'utilisateur
      if (updateUser) {
        updateUser({ ...user, tutorialCompleted: true });
      }
      
      // Rediriger vers le dashboard
      if (completed) {
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour du statut du tutoriel:', error);
    }
  };

  // Naviguer aux étapes précédentes et suivantes
  const handlePrevStep = () => {
    setCurrentDemo(null);
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };
  
  const handleNextStep = () => {
    setCurrentDemo(null);
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleCloseTutorial();
    }
  };

  // Gérer l'affichage des démos
  useEffect(() => {
    const currentTutorial = tutorialSteps[currentStep];
    
    if (currentTutorial && currentTutorial.demo === 'specialCommands') {
      // Rotation automatique des démos
      let demoIndex = 0;
      const demos = ['download', 'decrypt', 'hack', 'exploit'];
      
      const demoInterval = setInterval(() => {
        setCurrentDemo(demos[demoIndex]);
        demoIndex = (demoIndex + 1) % demos.length;
      }, 5000);
      
      return () => clearInterval(demoInterval);
    } else {
      setCurrentDemo(null);
    }
  }, [currentStep]);

  // Si le tutoriel n'est pas visible, ne rien rendre
  if (!isVisible) {
    return null;
  }

  const currentTutorial = tutorialSteps[currentStep];

  // Rendu des démos d'effets
  const renderDemo = () => {
    switch (currentDemo) {
      case 'download':
        return (
          <div className="tutorial-demo">
            <h3>Commande: download</h3>
            <p>Exemple: download secret_data.zip</p>
            <DownloadSimulation 
              fileName="secret_data.zip" 
              size="2.4 MB"
              onComplete={() => {}} 
            />
          </div>
        );
      case 'decrypt':
        return (
          <div className="tutorial-demo">
            <h3>Commande: decrypt</h3>
            <p>Exemple: decrypt V01D-S3CR3T encrypted.dat</p>
            <DecryptionEffect 
              fileName="encrypted.dat" 
              key="V01D-S3CR3T"
              onComplete={() => {}}
            />
          </div>
        );
      case 'hack':
        return (
          <div className="tutorial-demo">
            <h3>Commande: hack</h3>
            <p>Exemple: hack target-server</p>
            <HackingEffect 
              target="target-server" 
              duration={4000}
              onComplete={() => {}}
            />
          </div>
        );
      case 'exploit':
        return (
          <div className="tutorial-demo">
            <h3>Commande: exploit</h3>
            <p>Exemple: exploit CVE-2025-1234 10.0.0.5</p>
            <ExploitEffect 
              vulnerability="CVE-2025-1234" 
              target="10.0.0.5"
              onComplete={() => {}}
            />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="tutorial-overlay">
      <div className="tutorial-modal">
        <button className="tutorial-close-btn" onClick={() => handleCloseTutorial(false)}>
          <i className="fas fa-times"></i>
        </button>
        
        <div className="tutorial-progress">
          {tutorialSteps.map((_, index) => (
            <div 
              key={index} 
              className={`progress-dot ${index === currentStep ? 'active' : ''}`}
              onClick={() => setCurrentStep(index)}
            />
          ))}
        </div>
        
        <div className="tutorial-content">
          {currentTutorial.demo ? (
            <div className="tutorial-demo-container">
              <div className="tutorial-text-full">
                <h2>{currentTutorial.title}</h2>
                <p>{currentTutorial.content}</p>
              </div>
              {renderDemo()}
            </div>
          ) : (
            <>
              <div className="tutorial-image">
                {currentTutorial.image && (
                  <img src={currentTutorial.image} alt={currentTutorial.title} />
                )}
              </div>
              
              <div className="tutorial-text">
                <h2>{currentTutorial.title}</h2>
                <p>{currentTutorial.content}</p>
                
                {currentTutorial.code && (
                  <div className="tutorial-code">
                    <pre><code>{currentTutorial.code}</code></pre>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
        
        <div className="tutorial-nav">
          <button 
            className="tutorial-prev-btn"
            onClick={handlePrevStep}
            disabled={currentStep === 0}
          >
            <i className="fas fa-arrow-left"></i> Précédent
          </button>
          
          <button 
            className="tutorial-skip-btn"
            onClick={() => handleCloseTutorial(false)}
          >
            Passer le tutoriel
          </button>
          
          <button 
            className="tutorial-next-btn"
            onClick={handleNextStep}
          >
            {currentStep < tutorialSteps.length - 1 ? 'Suivant' : 'Terminer'} <i className="fas fa-arrow-right"></i>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Tutorial;