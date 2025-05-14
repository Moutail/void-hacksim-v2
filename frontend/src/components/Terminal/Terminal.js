// src/components/Terminal/Terminal.js - Mise à jour avec effets spéciaux
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import './Terminal.css';

// Importer les composants d'effets
import { 
  DownloadSimulation, 
  HackingEffect,
  DecryptionEffect,
  ExploitEffect
} from '../Effects';

const Terminal = ({ challenge, onCommandExecute }) => {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState([]);
  const [commandHistory, setCommandHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [currentDirectory, setCurrentDirectory] = useState('/');
  const [filesystem, setFilesystem] = useState({});
  const [loading, setLoading] = useState(false);
  const [specialEffect, setSpecialEffect] = useState(null);
  const inputRef = useRef(null);
  const terminalRef = useRef(null);
  const navigate = useNavigate();

  // Initialiser le terminal
  useEffect(() => {
    const initializeTerminal = async () => {
      try {
        const response = await api.get('/api/terminal/filesystem');
        
        if (response.data.status === 'success') {
          setFilesystem(response.data.data.filesystem);
          setCurrentDirectory(response.data.data.currentDirectory);
          
          // Message de bienvenue
          setHistory([
            {
              type: 'system',
              content: `
  ██╗   ██╗ ██████╗ ██╗██████╗     ████████╗███████╗██████╗ ███╗   ███╗██╗███╗   ██╗ █████╗ ██╗     
  ██║   ██║██╔═══██╗██║██╔══██╗    ╚══██╔══╝██╔════╝██╔══██╗████╗ ████║██║████╗  ██║██╔══██╗██║     
  ██║   ██║██║   ██║██║██║  ██║       ██║   █████╗  ██████╔╝██╔████╔██║██║██╔██╗ ██║███████║██║     
  ╚██╗ ██╔╝██║   ██║██║██║  ██║       ██║   ██╔══╝  ██╔══██╗██║╚██╔╝██║██║██║╚██╗██║██╔══██║██║     
   ╚████╔╝ ╚██████╔╝██║██████╔╝       ██║   ███████╗██║  ██║██║ ╚═╝ ██║██║██║ ╚████║██║  ██║███████╗
    ╚═══╝   ╚═════╝ ╚═╝╚═════╝        ╚═╝   ╚══════╝╚═╝  ╚═╝╚═╝     ╚═╝╚═╝╚═╝  ╚═══╝╚═╝  ╚═╝╚══════╝
                                                                                       
  Système Terminal VOID v1.0 - Sécurisé
  Tapez 'help' pour voir les commandes disponibles
              `
            }
          ]);
        }
      } catch (error) {
        console.error('Erreur lors de l\'initialisation du terminal:', error);
        setHistory([
          {
            type: 'error',
            content: 'Erreur lors de l\'initialisation du terminal. Veuillez réessayer.'
          }
        ]);
      }
    };
    
    initializeTerminal();
  }, []);

  // Focus sur l'input lorsque l'utilisateur clique sur le terminal
  useEffect(() => {
    const handleClick = () => {
      if (inputRef.current && !specialEffect) {
        inputRef.current.focus();
      }
    };
    
    if (terminalRef.current) {
      terminalRef.current.addEventListener('click', handleClick);
    }
    
    return () => {
      if (terminalRef.current) {
        terminalRef.current.removeEventListener('click', handleClick);
      }
    };
  }, [specialEffect]);

  // Faire défiler vers le bas lorsque l'historique change
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [history]);

  // Déterminer le type d'effet spécial à afficher basé sur la commande
  const determineSpecialEffect = (command) => {
    const cmd = command.split(' ')[0].toLowerCase();
    const args = command.split(' ').slice(1);
    
    if (cmd === 'decrypt' && args.length >= 2) {
      return {
        type: 'decryption',
        params: {
          fileName: args[1] || 'unknown.enc',
          key: args[0] || 'UNKNOWN',
          duration: 5000
        }
      };
    } else if (cmd === 'download' && args.length >= 1) {
      return {
        type: 'download',
        params: {
          fileName: args[0] || 'file.dat',
          size: args[1] || '1.2 MB',
          duration: 4000
        }
      };
    } else if (cmd === 'hack' && args.length >= 1) {
      return {
        type: 'hacking',
        params: {
          target: args[0] || 'system',
          duration: 6000
        }
      };
    } else if (cmd === 'exploit' && args.length >= 2) {
      return {
        type: 'exploit',
        params: {
          vulnerability: args[0] || 'CVE-2025-1234',
          target: args[1] || '10.0.0.5',
          duration: 8000
        }
      };
    }
    
    return null;
  };

  // Exécuter une commande
  const executeCommand = async (command) => {
    if (!command.trim()) return;
    
    // Ajouter la commande à l'historique
    const newHistory = [...history, { type: 'command', content: command, directory: currentDirectory }];
    setHistory(newHistory);
    
    // Ajouter la commande à l'historique des commandes
    setCommandHistory([...commandHistory, command]);
    setHistoryIndex(-1);
    
    if (command.toLowerCase() === 'clear') {
      // Effacer l'historique du terminal
      setHistory([]);
      return;
    }
    
    if (command.toLowerCase() === 'exit') {
      // Quitter le défi
      navigate('/challenges');
      return;
    }
    
    // Vérifier si la commande nécessite un effet spécial
    const effect = determineSpecialEffect(command);
    
    try {
      setLoading(true);
      
      // Si un effet spécial est nécessaire, l'afficher d'abord
      if (effect) {
        setSpecialEffect(effect);
        
        // Attendre que l'effet soit terminé avant de continuer
        await new Promise(resolve => {
          setTimeout(async () => {
            try {
              const response = await api.post('/api/terminal/execute', {
                command,
                currentDirectory
              });
              
              if (response.data.status === 'success') {
                const result = response.data.data;
                
                // Mettre à jour le répertoire courant si changé
                if (result.newDirectory !== currentDirectory) {
                  setCurrentDirectory(result.newDirectory);
                }
                
                // Ajouter la sortie à l'historique
                if (result.output) {
                  setHistory(prev => [...prev, { 
                    type: result.success ? 'output' : 'error', 
                    content: result.output 
                  }]);
                } else if (result.error) {
                  setHistory(prev => [...prev, { 
                    type: 'error', 
                    content: result.error 
                  }]);
                }
                
                // Si la commande est liée au défi en cours, notifier le composant parent
                if (challenge && onCommandExecute) {
                  onCommandExecute(command);
                }
              }
            } catch (error) {
              console.error('Erreur lors de l\'exécution de la commande:', error);
              setHistory(prev => [
                ...prev,
                {
                  type: 'error',
                  content: error.response?.data?.message || 'Erreur lors de l\'exécution de la commande.'
                }
              ]);
            } finally {
              setLoading(false);
              setInput('');
              setSpecialEffect(null);
              resolve();
            }
          }, effect.params.duration || 3000);
        });
      } else {
        // Exécution normale sans effet spécial
        const response = await api.post('/api/terminal/execute', {
          command,
          currentDirectory
        });
        
        if (response.data.status === 'success') {
          const result = response.data.data;
          
          // Mettre à jour le répertoire courant si changé
          if (result.newDirectory !== currentDirectory) {
            setCurrentDirectory(result.newDirectory);
          }
          
          // Ajouter la sortie à l'historique
          if (result.output) {
            setHistory([...newHistory, { 
              type: result.success ? 'output' : 'error', 
              content: result.output 
            }]);
          } else if (result.error) {
            setHistory([...newHistory, { 
              type: 'error', 
              content: result.error 
            }]);
          }
          
          // Si la commande est liée au défi en cours, notifier le composant parent
          if (challenge && onCommandExecute) {
            onCommandExecute(command);
          }
        }
        
        setLoading(false);
        setInput('');
      }
    } catch (error) {
      console.error('Erreur lors de l\'exécution de la commande:', error);
      setHistory([
        ...newHistory,
        {
          type: 'error',
          content: error.response?.data?.message || 'Erreur lors de l\'exécution de la commande.'
        }
      ]);
      setLoading(false);
      setInput('');
      setSpecialEffect(null);
    }
  };

  // Gérer les touches spéciales
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      executeCommand(input);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      
      // Naviguer dans l'historique des commandes
      if (commandHistory.length > 0) {
        const newIndex = historyIndex < commandHistory.length - 1 ? historyIndex + 1 : historyIndex;
        setHistoryIndex(newIndex);
        setInput(commandHistory[commandHistory.length - 1 - newIndex] || '');
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      
      // Naviguer dans l'historique des commandes
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setInput(commandHistory[commandHistory.length - 1 - newIndex] || '');
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setInput('');
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      
      // Auto-complétion (version simple)
      if (input.trim() && filesystem[currentDirectory]) {
        const parts = input.split(' ');
        const lastPart = parts[parts.length - 1];
        
        if (lastPart) {
          const matches = filesystem[currentDirectory].filter(item => 
            item.startsWith(lastPart)
          );
          
          if (matches.length === 1) {
            // Un seul résultat, compléter automatiquement
            parts[parts.length - 1] = matches[0];
            setInput(parts.join(' '));
          } else if (matches.length > 1) {
            // Afficher les possibilités
            setHistory([
              ...history,
              { type: 'command', content: input, directory: currentDirectory },
              { type: 'output', content: matches.join('  ') }
            ]);
          }
        }
      }
    }
  };

  // Rendu des effets spéciaux
  const renderSpecialEffect = () => {
    if (!specialEffect) return null;
    
    switch (specialEffect.type) {
      case 'download':
        return (
          <DownloadSimulation 
            fileName={specialEffect.params.fileName}
            size={specialEffect.params.size}
            onComplete={() => setSpecialEffect(null)}
          />
        );
      case 'hacking':
        return (
          <HackingEffect 
            target={specialEffect.params.target}
            duration={specialEffect.params.duration}
            onComplete={() => setSpecialEffect(null)}
          />
        );
      case 'decryption':
        return (
          <DecryptionEffect 
            fileName={specialEffect.params.fileName}
            key={specialEffect.params.key}
            onComplete={() => setSpecialEffect(null)}
          />
        );
      case 'exploit':
        return (
          <ExploitEffect 
            vulnerability={specialEffect.params.vulnerability}
            target={specialEffect.params.target}
            onComplete={() => setSpecialEffect(null)}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="terminal" ref={terminalRef}>
      <div className="terminal-header">
        <div className="terminal-title">
          <i className="fas fa-terminal"></i>
          <span>VOID Terminal</span>
        </div>
        <div className="terminal-controls">
          <div className="control-dot yellow"></div>
          <div className="control-dot green"></div>
          <div className="control-dot red" onClick={() => navigate('/challenges')}></div>
        </div>
      </div>
      
      <div className="terminal-content">
        {history.map((item, index) => (
          <div key={index} className={`terminal-line ${item.type}`}>
            {item.type === 'command' && (
              <span className="prompt">{item.directory} $ </span>
            )}
            <span className="content" style={{ whiteSpace: 'pre-wrap' }}>{item.content}</span>
          </div>
        ))}
        
        {/* Afficher l'effet spécial s'il y en a un */}
        {specialEffect && (
          <div className="terminal-special-effect">
            {renderSpecialEffect()}
          </div>
        )}
        
        {/* Masquer la ligne d'entrée pendant un effet spécial */}
        {!specialEffect && (
          <div className="terminal-input-line">
            <span className="prompt">{currentDirectory} $ </span>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
              autoFocus
              className="terminal-input"
            />
          </div>
        )}
      </div>
      
      {challenge && (
        <div className="terminal-challenge-info">
          <div className="challenge-title">{challenge.title}</div>
          <div className="challenge-progress">
            {challenge.objectives.filter(obj => obj.completed).length} / {challenge.objectives.length} objectifs complétés
          </div>
        </div>
      )}
    </div>
  );
};

export default Terminal;