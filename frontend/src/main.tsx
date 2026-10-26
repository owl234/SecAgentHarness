import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { LangProvider } from './i18n/LangContext';
import { ToastProvider } from './components/ui/ToastContext';
import 'katex/dist/katex.min.css';
import './styles/index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <LangProvider>
      <ToastProvider>
        <App />
      </ToastProvider>
    </LangProvider>
  </React.StrictMode>
);
