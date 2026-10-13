import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <MotionConfig reducedMotion="user">
        <AuthProvider>
          <App />
          <Toaster
            // Placed where they never cover navigation, menus or the swipe buttons.
            {...(window.matchMedia('(min-width: 768px)').matches
              ? { position: 'bottom-right' }
              : { position: 'top-center', containerStyle: { top: 76 } })}
            toastOptions={{
              style: {
                background: 'var(--color-ink-800)',
                color: 'var(--color-white)',
                border: '1px solid color-mix(in srgb, var(--color-white) 12%, transparent)',
                borderRadius: '14px',
                fontWeight: 600,
              },
            }}
          />
        </AuthProvider>
      </MotionConfig>
    </BrowserRouter>
  </StrictMode>,
);
