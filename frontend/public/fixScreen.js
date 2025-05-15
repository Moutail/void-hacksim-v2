// Correction d'urgence pour l'écran noir
(function() {
  // Attendre que le DOM soit chargé
  document.addEventListener('DOMContentLoaded', function() {
    // Vérifier si l'écran est noir (aucun contenu visible)
    setTimeout(function() {
      const rootEl = document.getElementById('root');
      
      // Si l'écran semble vide
      if (!rootEl || !rootEl.children.length || !rootEl.innerText.trim()) {
        console.log("Écran potentiellement noir détecté, application de correctifs...");
        
        // Forcer le style sur le body
        document.body.style.backgroundColor = '#f5f5f5';
        document.body.style.color = '#333';
        
        // Rediriger vers la page de login
        window.location.href = '/login';
      }
    }, 2000); // Attendre 2 secondes pour que l'app se charge
  });
})();
