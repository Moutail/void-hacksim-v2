const App = () => {
  return (
    <div style={{ color: 'white', padding: '20px' }}>
      <h1>Test de chargement</h1>
      <p>Si vous voyez ce texte, l'application se charge correctement.</p>

      {/* Votre code existant */}
      <AuthProvider>
        <PresenceProvider>
          <Router basename={process.env.PUBLIC_URL || '/'}>
            <AppRoutes />
          </Router>
        </PresenceProvider>
      </AuthProvider>
    </div>
  );
};
