import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { CalendarPage } from './components/pages/CalendarPage';
import './styles/theme.css';

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <CalendarPage />
  </StrictMode>,
);
