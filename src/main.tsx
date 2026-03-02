import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { App } from './App';
import { extractSharedStateFromUrl } from './utils/urlState';

// Before React mounts: check for shared state in URL hash
// Extract it to sessionStorage so HashRouter doesn't conflict with #s= data
const sharedData = extractSharedStateFromUrl();
if (sharedData) {
  sessionStorage.setItem('splitluride-pending-merge', sharedData);
  // Clear the hash so HashRouter can take over
  const base = window.location.href.split('#')[0];
  window.history.replaceState(null, '', base + '#/');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
