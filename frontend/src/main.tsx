import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { AuthProvider } from './contexts/AuthProvider';
import { captureVerificationToken } from './services/verification-token';
import './index.css';

const rootElement = document.getElementById('root');
const verificationToken = captureVerificationToken(window.location, window.history);

if (!rootElement) throw new Error('Elemento raiz da aplicação não foi encontrado.');

createRoot(rootElement).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App verificationToken={verificationToken} />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
