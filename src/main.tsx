import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { I18nProvider } from './i18n/context';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <I18nProvider>
      <App />
    </I18nProvider>
  </ErrorBoundary>
);
