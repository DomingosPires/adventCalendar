import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/theme.css';

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <p>Calendário do Advento</p>
  </StrictMode>,
);
