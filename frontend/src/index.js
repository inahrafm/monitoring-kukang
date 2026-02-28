/* index.js - File utama React */

import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// Membuat root element
const root = ReactDOM.createRoot(document.getElementById('root'));

// Render aplikasi
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Optional: Untuk mengukur performa aplikasi
reportWebVitals();

// Service worker registration (optional)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').then(registration => {
      console.log('SW registered: ', registration);
    }).catch(registrationError => {
      console.log('SW registration failed: ', registrationError);
    });
  });
}