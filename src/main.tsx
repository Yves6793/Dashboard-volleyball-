/// <reference types="vite/client" />
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './components/App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Register service worker for offline support
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((reg) => {
        console.log('Offline SW registered successfully with scope:', reg.scope);
      })
      .catch((err) => {
        console.error('Offline SW registration failed:', err);
      });
  });
} else if ('serviceWorker' in navigator) {
  // In development, also load it to ensure it functions as expected
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((reg) => {
        console.log('Offline SW registered in development with scope:', reg.scope);
      })
      .catch((err) => {
        console.error('Offline SW registration in dev failed:', err);
      });
  });
}
