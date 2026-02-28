import { Page } from '../types';

interface Props {
  page: Page;
  onNavigate: (p: Page) => void;
}

export default function BottomNav({ page, onNavigate }: Props) {
  return (
    <nav className="bottom-nav">
      <button className={`nav-btn ${page === 'dashboard' ? 'active' : ''}`} onClick={() => onNavigate('dashboard')}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
        Inicio
      </button>

      <button className={`nav-btn ${page === 'ingresos' ? 'active green' : ''}`} onClick={() => onNavigate('ingresos')}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 19V5M5 12l7-7 7 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Ingresos
      </button>

      <button className={`nav-btn ${page === 'gastos' ? 'active red' : ''}`} onClick={() => onNavigate('gastos')}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 5v14M19 12l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Gastos
      </button>

      <button className={`nav-btn ${page === 'yo-debo' ? 'active orange' : ''}`} onClick={() => onNavigate('yo-debo')}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
          <path d="M12 6v6l4 2" strokeLinecap="round" />
        </svg>
        Yo Debo
      </button>

      <button className={`nav-btn ${page === 'me-deben' ? 'active blue' : ''}`} onClick={() => onNavigate('me-deben')}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 12V22H4V12" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M22 7H2v5h20V7z" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M12 22V7M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Me Deben
      </button>
    </nav>
  );
}
