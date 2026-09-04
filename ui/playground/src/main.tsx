import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider } from '@nova/components';
import '@nova/tokens/css';
import '@nova/components/css';
import './styles.css';
import { App } from './App';

const container = document.getElementById('root');
if (!container) throw new Error('#root missing from index.html');

createRoot(container).render(
  <StrictMode>
    {/* storageKey so a chosen theme survives a reload while exploring. */}
    <ThemeProvider storageKey="nova-playground">
      <App />
    </ThemeProvider>
  </StrictMode>,
);
