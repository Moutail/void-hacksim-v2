// src/components/Admin/ChallengeForm.js
import React, { useState, useEffect } from 'react';
import './AdminForms.css';

const ChallengeForm = ({ challenge, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    level: 'débutant',
    type: 'terminal',
    instructions: '',
    objectives: [],
    points: 100,
    hints: [],
    active: true,
    initialFiles: {},
    initialFileContents: {}
  });
  
  const [newObjective, setNewObjective] = useState({
    description: '',
    validationFunction: 'function(command, history) {\n  // Fonction de validation\n  return false;\n}'
  });
  
  const [newHint, setNewHint] = useState({
    text: '',
    costPoints: 10
  });
  
  const [showFileManager, setShowFileManager] = useState(false);
  const [newPath, setNewPath] = useState('');
  const [newFile, setNewFile] = useState('');
  const [newFileContent, setNewFileContent] = useState('');
  const [activePath, setActivePath] = useState('');

  // Initialiser le formulaire avec les données du défi si en mode édition
  useEffect(() => {
    if (challenge) {
      setFormData({
        title: challenge.title || '',
        description: challenge.description || '',
        level: challenge.level || 'débutant',
        type: challenge.type || 'terminal',
        instructions: challenge.instructions || '',
        objectives: challenge.objectives || [],
        points: challenge.points || 100,
        hints: challenge.hints || [],
        active: challenge.active !== undefined ? challenge.active : true,
        initialFiles: challenge.initialFiles || {},
        initialFileContents: challenge.initialFileContents || {}
      });
    }
  }, [challenge]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleObjectiveChange = (e) => {
    const { name, value } = e.target;
    setNewObjective(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const addObjective = () => {
    if (newObjective.description.trim() === '') return;
    
    setFormData(prev => ({
      ...prev,
      objectives: [...prev.objectives, { ...newObjective, completed: false }]
    }));
    
    // Réinitialiser le formulaire d'objectif
    setNewObjective({
      description: '',
      validationFunction: 'function(command, history) {\n  // Fonction de validation\n  return false;\n}'
    });
  };

  const removeObjective = (index) => {
    setFormData(prev => ({
      ...prev,
      objectives: prev.objectives.filter((_, i) => i !== index)
    }));
  };

  const editObjective = (index) => {
    setNewObjective(formData.objectives[index]);
    removeObjective(index);
  };

  const handleHintChange = (e) => {
    const { name, value } = e.target;
    setNewHint(prev => ({
      ...prev,
      [name]: name === 'costPoints' ? parseInt(value) : value
    }));
  };

  const addHint = () => {
    if (newHint.text.trim() === '') return;
    
    setFormData(prev => ({
      ...prev,
      hints: [...prev.hints, { ...newHint }]
    }));
    
    // Réinitialiser le formulaire d'indice
    setNewHint({
      text: '',
      costPoints: 10
    });
  };

  const removeHint = (index) => {
    setFormData(prev => ({
      ...prev,
      hints: prev.hints.filter((_, i) => i !== index)
    }));
  };

  const editHint = (index) => {
    setNewHint(formData.hints[index]);
    removeHint(index);
  };

  // Gestionnaires pour les fichiers
  const addPath = () => {
    if (newPath.trim() === '') return;
    
    setFormData(prev => {
      const updatedFiles = { ...prev.initialFiles };
      updatedFiles[newPath] = [];
      return {
        ...prev,
        initialFiles: updatedFiles
      };
    });
    
    setActivePath(newPath);
    setNewPath('');
  };

  const removePath = (path) => {
    setFormData(prev => {
      const updatedFiles = { ...prev.initialFiles };
      const updatedContents = { ...prev.initialFileContents };
      
      // Supprimer les fichiers et leur contenu associés à ce chemin
      const pathPrefix = path + '/';
      
      // Supprimer le contenu des fichiers dans ce chemin
      Object.keys(updatedContents).forEach(filePath => {
        if (filePath.startsWith(pathPrefix) || filePath === path) {
          delete updatedContents[filePath];
        }
      });
      
      // Supprimer le chemin
      delete updatedFiles[path];
      
      return {
        ...prev,
        initialFiles: updatedFiles,
        initialFileContents: updatedContents
      };
    });
    
    // Réinitialiser le chemin actif si nécessaire
    if (activePath === path) {
      setActivePath('');
    }
  };

  const addFile = () => {
    if (newFile.trim() === '' || !activePath) return;
    
    setFormData(prev => {
      const updatedFiles = { ...prev.initialFiles };
      const updatedContents = { ...prev.initialFileContents };
      
      // Ajouter le fichier au chemin actif
      updatedFiles[activePath] = [...(updatedFiles[activePath] || []), newFile];
      
      // Ajouter le contenu du fichier si spécifié
      if (newFileContent.trim() !== '') {
        const filePath = `${activePath}/${newFile}`;
        updatedContents[filePath] = newFileContent;
      }
      
      return {
        ...prev,
        initialFiles: updatedFiles,
        initialFileContents: updatedContents
      };
    });
    
    setNewFile('');
    setNewFileContent('');
  };

  const removeFile = (path, file) => {
    setFormData(prev => {
      const updatedFiles = { ...prev.initialFiles };
      const updatedContents = { ...prev.initialFileContents };
      
      // Supprimer le fichier du chemin
      updatedFiles[path] = updatedFiles[path].filter(f => f !== file);
      
      // Supprimer le contenu du fichier
      const filePath = `${path}/${file}`;
      delete updatedContents[filePath];
      
      return {
        ...prev,
        initialFiles: updatedFiles,
        initialFileContents: updatedContents
      };
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="admin-form-container">
      <h2>{challenge ? 'Modifier le défi' : 'Créer un nouveau défi'}</h2>
      
      <form onSubmit={handleSubmit} className="challenge-form">
        <div className="form-group">
          <label htmlFor="title">Titre*</label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="description">Description*</label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="level">Niveau*</label>
            <select
              id="level"
              name="level"
              value={formData.level}
              onChange={handleChange}
              required
            >
              <option value="débutant">Débutant</option>
              <option value="intermédiaire">Intermédiaire</option>
              <option value="avancé">Avancé</option>
            </select>
          </div>
          
          <div className="form-group">
            <label htmlFor="type">Type*</label>
            <select
              id="type"
              name="type"
              value={formData.type}
              onChange={handleChange}
              required
            >
              <option value="terminal">Terminal</option>
              <option value="crypto">Cryptographie</option>
              <option value="code">Code</option>
              <option value="network">Réseau</option>
            </select>
          </div>
          
          <div className="form-group">
            <label htmlFor="points">Points*</label>
            <input
              type="number"
              id="points"
              name="points"
              value={formData.points}
              onChange={handleChange}
              min="10"
              max="1000"
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="active">Actif</label>
            <div className="checkbox-container">
              <input
                type="checkbox"
                id="active"
                name="active"
                checked={formData.active}
                onChange={handleChange}
              />
              <span className="checkbox-label">Le défi est disponible</span>
            </div>
          </div>
        </div>
        
        <div className="form-group">
          <label htmlFor="instructions">Instructions*</label>
          <textarea
            id="instructions"
            name="instructions"
            value={formData.instructions}
            onChange={handleChange}
            rows="6"
            required
          />
        </div>
        
        {/* Section des objectifs */}
        <div className="form-section">
          <h3>Objectifs</h3>
          
          <div className="objective-list">
            {formData.objectives.length > 0 ? (
              <div className="objectives-table">
                <div className="objectives-header">
                  <div>Description</div>
                  <div>Actions</div>
                </div>
                {formData.objectives.map((objective, index) => (
                  <div key={index} className="objective-item">
                    <div>{objective.description}</div>
                    <div className="objective-actions">
                      <button 
                        type="button" 
                        className="action-btn edit"
                        onClick={() => editObjective(index)}
                      >
                        <i className="fas fa-edit"></i>
                      </button>
                      <button 
                        type="button" 
                        className="action-btn delete"
                        onClick={() => removeObjective(index)}
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-items">Aucun objectif défini</div>
            )}
          </div>
          
          <div className="add-objective">
            <h4>Ajouter un objectif</h4>
            <div className="form-group">
              <label htmlFor="objectiveDescription">Description*</label>
              <input
                type="text"
                id="objectiveDescription"
                name="description"
                value={newObjective.description}
                onChange={handleObjectiveChange}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="validationFunction">Fonction de validation*</label>
              <textarea
                id="validationFunction"
                name="validationFunction"
                value={newObjective.validationFunction}
                onChange={handleObjectiveChange}
                rows="6"
              />
              <small>
                Exemple: function(command, history) {'{'}
                  return command === 'ls';
                {'}'}
              </small>
            </div>
            
            <button 
              type="button" 
              className="action-btn add"
              onClick={addObjective}
            >
              <i className="fas fa-plus"></i> Ajouter l'objectif
            </button>
          </div>
        </div>
        
        {/* Section des indices */}
        <div className="form-section">
          <h3>Indices</h3>
          
          <div className="hint-list">
            {formData.hints.length > 0 ? (
              <div className="hints-table">
                <div className="hints-header">
                  <div>Texte</div>
                  <div>Coût</div>
                  <div>Actions</div>
                </div>
                {formData.hints.map((hint, index) => (
                  <div key={index} className="hint-item">
                    <div>{hint.text}</div>
                    <div>{hint.costPoints} points</div>
                    <div className="hint-actions">
                      <button 
                        type="button" 
                        className="action-btn edit"
                        onClick={() => editHint(index)}
                      >
                        <i className="fas fa-edit"></i>
                      </button>
                      <button 
                        type="button" 
                        className="action-btn delete"
                        onClick={() => removeHint(index)}
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-items">Aucun indice défini</div>
            )}
          </div>
          
          <div className="add-hint">
            <h4>Ajouter un indice</h4>
            <div className="form-group">
              <label htmlFor="hintText">Texte de l'indice*</label>
              <textarea
                id="hintText"
                name="text"
                value={newHint.text}
                onChange={handleHintChange}
                rows="3"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="costPoints">Coût en points*</label>
              <input
                type="number"
                id="costPoints"
                name="costPoints"
                value={newHint.costPoints}
                onChange={handleHintChange}
                min="1"
                max="100"
              />
            </div>
            
            <button 
              type="button" 
              className="action-btn add"
              onClick={addHint}
            >
              <i className="fas fa-plus"></i> Ajouter l'indice
            </button>
          </div>
        </div>
        
        {/* Section des fichiers */}
        <div className="form-section">
          <h3>Fichiers initiaux</h3>
          <button 
            type="button" 
            className="toggle-btn"
            onClick={() => setShowFileManager(!showFileManager)}
          >
            {showFileManager ? 'Masquer le gestionnaire de fichiers' : 'Afficher le gestionnaire de fichiers'}
          </button>
          
          {showFileManager && (
            <div className="file-manager">
              <div className="file-manager-paths">
                <h4>Répertoires</h4>
                <div className="path-list">
                  {Object.keys(formData.initialFiles).length > 0 ? (
                    <div className="paths-table">
                      {Object.keys(formData.initialFiles).map(path => (
                        <div key={path} className={`path-item ${activePath === path ? 'active' : ''}`}>
                          <div 
                            className="path-name"
                            onClick={() => setActivePath(path)}
                          >
                            {path}
                          </div>
                          <div className="path-actions">
                            <button 
                              type="button" 
                              className="action-btn delete"
                              onClick={() => removePath(path)}
                            >
                              <i className="fas fa-trash"></i>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="no-items">Aucun répertoire défini</div>
                  )}
                </div>
                
                <div className="add-path">
                  <div className="form-group">
                    <label htmlFor="newPath">Nouveau chemin*</label>
                    <div className="path-input-group">
                      <input
                        type="text"
                        id="newPath"
                        value={newPath}
                        onChange={(e) => setNewPath(e.target.value)}
                        placeholder="/exemple/chemin"
                      />
                      <button 
                        type="button" 
                        className="action-btn add"
                        onClick={addPath}
                      >
                        <i className="fas fa-plus"></i>
                      </button>
                    </div>
                    <small>Exemple: /dossier ou /dossier/sousdossier</small>
                  </div>
                </div>
              </div>
              
              {activePath && (
                <div className="file-manager-files">
                  <h4>Fichiers dans {activePath}</h4>
                  <div className="file-list">
                    {formData.initialFiles[activePath]?.length > 0 ? (
                      <div className="files-table">
                        {formData.initialFiles[activePath].map(file => (
                          <div key={file} className="file-item">
                            <div className="file-name">{file}</div>
                            <div className="file-actions">
                              <button 
                                type="button" 
                                className="action-btn delete"
                                onClick={() => removeFile(activePath, file)}
                              >
                                <i className="fas fa-trash"></i>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="no-items">Aucun fichier dans ce répertoire</div>
                    )}
                  </div>
                  
                  <div className="add-file">
                    <div className="form-group">
                      <label htmlFor="newFile">Nouveau fichier*</label>
                      <input
                        type="text"
                        id="newFile"
                        value={newFile}
                        onChange={(e) => setNewFile(e.target.value)}
                        placeholder="fichier.txt"
                      />
                    </div>
                    
                    <div className="form-group">
                      <label htmlFor="newFileContent">Contenu du fichier</label>
                      <textarea
                        id="newFileContent"
                        value={newFileContent}
                        onChange={(e) => setNewFileContent(e.target.value)}
                        rows="4"
                        placeholder="Contenu du fichier (optionnel)"
                      />
                    </div>
                    
                    <button 
                      type="button" 
                      className="action-btn add"
                      onClick={addFile}
                    >
                      <i className="fas fa-plus"></i> Ajouter le fichier
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="form-actions">
          <button 
            type="button" 
            className="cancel-btn"
            onClick={onCancel}
          >
            Annuler
          </button>
          <button 
            type="submit" 
            className="save-btn"
          >
            {challenge ? 'Mettre à jour' : 'Créer'} le défi
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChallengeForm;