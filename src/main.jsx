import React from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import './styles.css';
import App from './App';

// HashRouter keeps client-side routes working on static GitHub Pages hosting,
// including direct refreshes of Vote, Rankings, Winners, History and Admin.
createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>
);
