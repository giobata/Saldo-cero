import { useState } from 'react';
import { supabase } from './supabase';

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError('Email o contraseña incorrectos.');
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setError('No se pudo crear la cuenta. Revisá el email y que la contraseña tenga al menos 6 caracteres.');
      } else {
        setSuccess('Cuenta creada. Revisá tu email para confirmar.');
      }
    }

    setLoading(false);
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title">Saldo Cero</h1>
        <p className="auth-subtitle">
          {mode === 'login' ? 'Iniciá sesión para sincronizar tus datos' : 'Creá tu cuenta'}
        </p>

        <form className="form" onSubmit={handleSubmit}>
          <div className="field">
            <label>Email</label>
            <input
              type="email"
              placeholder="tu@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div className="field">
            <label>Contraseña</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </div>

          {error && <p className="auth-error">{error}</p>}
          {success && <p className="auth-success">{success}</p>}

          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? 'Cargando...' : mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
          </button>
        </form>

        <button
          className="auth-toggle"
          onClick={() => { setMode(m => m === 'login' ? 'register' : 'login'); setError(''); setSuccess(''); }}
        >
          {mode === 'login' ? '¿No tenés cuenta? Registrate' : '¿Ya tenés cuenta? Iniciá sesión'}
        </button>
      </div>
    </div>
  );
}
