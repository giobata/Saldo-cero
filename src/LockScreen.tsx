import { useState, useEffect, useRef } from 'react';
import { verifyBiometric } from './biometric';

interface Props {
  onUnlock: () => void;
  onLogout: () => void;
}

export default function LockScreen({ onUnlock, onLogout }: Props) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const prompted = useRef(false);

  async function attempt() {
    setBusy(true);
    setError('');
    const ok = await verifyBiometric();
    setBusy(false);
    if (ok) onUnlock();
    else setError('No se pudo verificar. Intentá de nuevo.');
  }

  useEffect(() => {
    if (prompted.current) return;
    prompted.current = true;
    attempt();
  }, []);

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ alignItems: 'center' }}>
        <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="1.5">
          <path d="M12 11v3a6 6 0 01-.4 2.2" strokeLinecap="round" />
          <path d="M8.5 20.5A10 10 0 0010 14v-2a2 2 0 114 0v2" strokeLinecap="round" />
          <path d="M5.6 17.6A8 8 0 007 13v-1a5 5 0 0110 0v1" strokeLinecap="round" />
          <path d="M4 9a8 8 0 0116 0" strokeLinecap="round" />
          <path d="M15.5 20a14 14 0 00.5-3.5" strokeLinecap="round" />
        </svg>

        <h1 className="auth-title">Saldo Cero</h1>
        <p className="auth-subtitle" style={{ marginTop: 0 }}>
          Desbloqueá para ver tus datos
        </p>

        {error && <p className="auth-error">{error}</p>}

        <button className="btn btn-primary" onClick={attempt} disabled={busy} style={{ width: '100%' }}>
          {busy ? 'Verificando...' : 'Desbloquear'}
        </button>

        <button className="auth-toggle" onClick={onLogout}>
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
