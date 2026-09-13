import { useState, useEffect, useRef, useCallback } from 'react';
import { AppData, Page, Transaction, Debt, GastoFijo, IngresoFijo, Abono } from './types';
import { loadData, saveData, genId, emptyData } from './storage';
import { currentMonth } from './utils';
import { supabase } from './supabase';
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import Modal from './components/Modal';
import Dashboard from './pages/Dashboard';
import Ingresos from './pages/Ingresos';
import Gastos from './pages/Gastos';
import YoDebo from './pages/YoDebo';
import MeDeben from './pages/MeDeben';
import AuthPage from './AuthPage';
import LockScreen from './LockScreen';
import { isBiometricAvailable, isBiometricEnabled, enrollBiometric, disableBiometric } from './biometric';
import type { User } from '@supabase/supabase-js';

async function fetchRemoteData(): Promise<AppData | null> {
  const { data, error } = await supabase.from('app_data').select('data').single();
  if (error || !data) return null;
  return { ...emptyData, ...(data.data as Partial<AppData>) };
}

async function pushRemoteData(appData: AppData): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from('app_data').upsert(
    { user_id: user.id, data: appData, updated_at: new Date().toISOString() },
    { onConflict: 'user_id' }
  );
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [data, setData] = useState<AppData>(loadData);
  const [page, setPage] = useState<Page>('dashboard');
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [openSettings, setOpenSettings] = useState(false);
  const [importMsg, setImportMsg] = useState('');
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'error'>('idle');
  const [locked, setLocked] = useState(false);
  const [bioAvailable, setBioAvailable] = useState(false);
  const [bioEnabled, setBioEnabled] = useState(false);
  const [bioMsg, setBioMsg] = useState('');
  const importRef = useRef<HTMLInputElement>(null);
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstLoad = useRef(true);

  // Listen for auth changes
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthReady(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // When user logs in, load data from Supabase
  useEffect(() => {
    if (!user) return;
    isFirstLoad.current = true;
    fetchRemoteData().then(remote => {
      if (remote) {
        setData(remote);
        saveData(remote);
      } else {
        // First time on this account: upload existing local data
        pushRemoteData(loadData());
      }
      isFirstLoad.current = false;
    });
  }, [user?.id]);

  useEffect(() => {
    isBiometricAvailable().then(setBioAvailable);
  }, []);

  // Lock the app on load when biometric is enabled for this user
  useEffect(() => {
    if (!user) {
      setLocked(false);
      setBioEnabled(false);
      return;
    }
    const enabled = isBiometricEnabled(user.id);
    setBioEnabled(enabled);
    setLocked(enabled);
  }, [user?.id]);

  // Save locally immediately + debounce sync to Supabase
  const syncToSupabase = useCallback((appData: AppData) => {
    if (!user || isFirstLoad.current) return;
    saveData(appData);
    setSyncStatus('syncing');
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(async () => {
      try {
        await pushRemoteData(appData);
        setSyncStatus('idle');
      } catch {
        setSyncStatus('error');
      }
    }, 1500);
  }, [user]);

  useEffect(() => {
    if (!user) {
      saveData(data);
      return;
    }
    syncToSupabase(data);
  }, [data]);

  async function handleLogout() {
    await supabase.auth.signOut();
    setOpenSettings(false);
  }

  async function handleEnableBiometric() {
    if (!user) return;
    try {
      await enrollBiometric(user.id, user.email ?? 'usuario');
      setBioEnabled(true);
      setBioMsg('Listo, ya podés desbloquear con tu huella.');
    } catch {
      setBioMsg('No se pudo activar. Revisá que el dispositivo tenga huella o Face ID configurado.');
    }
    setTimeout(() => setBioMsg(''), 4000);
  }

  function handleDisableBiometric() {
    disableBiometric();
    setBioEnabled(false);
    setBioMsg('Desbloqueo biométrico desactivado.');
    setTimeout(() => setBioMsg(''), 4000);
  }

  // ── Export ──────────────────────────────────────────────
  function handleExport() {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `saldo-cero-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Import ──────────────────────────────────────────────
  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string);
        setData({ ...emptyData, ...parsed });
        setImportMsg('Datos restaurados correctamente.');
        setTimeout(() => { setImportMsg(''); setOpenSettings(false); }, 1500);
      } catch {
        setImportMsg('El archivo no es válido.');
        setTimeout(() => setImportMsg(''), 3000);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  // ── Ingresos ocasionales ────────────────────────────────
  const addIngreso = (t: Omit<Transaction, 'id' | 'createdAt'>) =>
    setData(d => ({ ...d, ingresos: [...d.ingresos, { ...t, id: genId(), createdAt: new Date().toISOString() }] }));

  const deleteIngreso = (id: string) =>
    setData(d => ({ ...d, ingresos: d.ingresos.filter(t => t.id !== id) }));

  // ── Ingresos fijos ──────────────────────────────────────
  const addIngresoFijo = (g: Omit<IngresoFijo, 'id' | 'createdAt' | 'active'>) =>
    setData(d => ({ ...d, ingresosFijos: [...d.ingresosFijos, { ...g, id: genId(), active: true, createdAt: new Date().toISOString() }] }));

  const deleteIngresoFijo = (id: string) =>
    setData(d => ({ ...d, ingresosFijos: d.ingresosFijos.filter(g => g.id !== id) }));

  const updateIngresoFijo = (id: string, updates: Partial<Pick<IngresoFijo, 'description' | 'amount'>>) =>
    setData(d => ({ ...d, ingresosFijos: d.ingresosFijos.map(g => g.id === id ? { ...g, ...updates } : g) }));

  const toggleIngresoFijoPago = (ingresoFijoId: string, month: string) =>
    setData(d => {
      const existing = d.ingresosFijosPagos.find(p => p.ingresoFijoId === ingresoFijoId && p.month === month);
      if (existing) {
        return {
          ...d,
          ingresosFijosPagos: d.ingresosFijosPagos.map(p =>
            p.id === existing.id ? { ...p, received: !p.received } : p
          ),
        };
      }
      return {
        ...d,
        ingresosFijosPagos: [...d.ingresosFijosPagos, {
          id: genId(),
          ingresoFijoId,
          month,
          received: true,
          createdAt: new Date().toISOString(),
        }],
      };
    });

  // ── Gastos ocasionales ──────────────────────────────────
  const addGasto = (t: Omit<Transaction, 'id' | 'createdAt'>) =>
    setData(d => ({ ...d, gastos: [...d.gastos, { ...t, id: genId(), createdAt: new Date().toISOString() }] }));

  const deleteGasto = (id: string) =>
    setData(d => ({ ...d, gastos: d.gastos.filter(t => t.id !== id) }));

  // ── Gastos fijos ────────────────────────────────────────
  const addGastoFijo = (g: Omit<GastoFijo, 'id' | 'createdAt' | 'active'>) =>
    setData(d => ({ ...d, gastosFijos: [...d.gastosFijos, { ...g, id: genId(), active: true, createdAt: new Date().toISOString() }] }));

  const deleteGastoFijo = (id: string) =>
    setData(d => ({ ...d, gastosFijos: d.gastosFijos.filter(g => g.id !== id) }));

  const updateGastoFijo = (id: string, updates: Partial<Pick<GastoFijo, 'description' | 'amount' | 'dueDay'>>) =>
    setData(d => ({ ...d, gastosFijos: d.gastosFijos.map(g => g.id === id ? { ...g, ...updates } : g) }));

  const toggleGastoFijoPago = (gastoFijoId: string, month: string) =>
    setData(d => {
      const existing = d.gastosFijosPagos.find(p => p.gastoFijoId === gastoFijoId && p.month === month);
      if (existing) {
        return {
          ...d,
          gastosFijosPagos: d.gastosFijosPagos.map(p =>
            p.id === existing.id ? { ...p, paid: !p.paid } : p
          ),
        };
      }
      return {
        ...d,
        gastosFijosPagos: [...d.gastosFijosPagos, {
          id: genId(),
          gastoFijoId,
          month,
          paid: true,
          createdAt: new Date().toISOString(),
        }],
      };
    });

  // ── Yo debo ─────────────────────────────────────────────
  const addYoDebo = (debt: Omit<Debt, 'id' | 'createdAt' | 'paid'>) =>
    setData(d => ({ ...d, yoDebo: [...d.yoDebo, { ...debt, id: genId(), paid: false, abonos: [], createdAt: new Date().toISOString() }] }));

  const toggleYoDebo = (id: string) =>
    setData(d => ({ ...d, yoDebo: d.yoDebo.map(x => x.id === id ? { ...x, paid: !x.paid } : x) }));

  const deleteYoDebo = (id: string) =>
    setData(d => ({ ...d, yoDebo: d.yoDebo.filter(x => x.id !== id) }));

  const addAbonoYoDebo = (debtId: string, abono: Omit<Abono, 'id' | 'createdAt'>) =>
    setData(d => ({
      ...d,
      yoDebo: d.yoDebo.map(debt => {
        if (debt.id !== debtId) return debt;
        const newAbono = { ...abono, id: genId(), createdAt: new Date().toISOString() };
        const abonos = [...(debt.abonos ?? []), newAbono];
        const totalAbonado = abonos.reduce((s, a) => s + a.amount, 0);
        return { ...debt, abonos, paid: totalAbonado >= debt.amount ? true : debt.paid };
      }),
    }));

  // ── Me deben ────────────────────────────────────────────
  const addMeDeben = (debt: Omit<Debt, 'id' | 'createdAt' | 'paid'>) =>
    setData(d => ({ ...d, meDeben: [...d.meDeben, { ...debt, id: genId(), paid: false, abonos: [], createdAt: new Date().toISOString() }] }));

  const toggleMeDeben = (id: string) =>
    setData(d => ({ ...d, meDeben: d.meDeben.map(x => x.id === id ? { ...x, paid: !x.paid } : x) }));

  const deleteMeDeben = (id: string) =>
    setData(d => ({ ...d, meDeben: d.meDeben.filter(x => x.id !== id) }));

  const addAbonoMeDeben = (debtId: string, abono: Omit<Abono, 'id' | 'createdAt'>) =>
    setData(d => ({
      ...d,
      meDeben: d.meDeben.map(debt => {
        if (debt.id !== debtId) return debt;
        const newAbono = { ...abono, id: genId(), createdAt: new Date().toISOString() };
        const abonos = [...(debt.abonos ?? []), newAbono];
        const totalAbonado = abonos.reduce((s, a) => s + a.amount, 0);
        return { ...debt, abonos, paid: totalAbonado >= debt.amount ? true : debt.paid };
      }),
    }));

  const renderPage = () => {
    switch (page) {
      case 'dashboard':
        return <Dashboard data={data} selectedMonth={selectedMonth} onMonthChange={setSelectedMonth} />;
      case 'ingresos':
        return (
          <Ingresos
            ingresos={data.ingresos}
            ingresosFijos={data.ingresosFijos}
            ingresosFijosPagos={data.ingresosFijosPagos}
            selectedMonth={selectedMonth}
            onMonthChange={setSelectedMonth}
            onAdd={addIngreso}
            onDelete={deleteIngreso}
            onAddIngresoFijo={addIngresoFijo}
            onDeleteIngresoFijo={deleteIngresoFijo}
            onUpdateIngresoFijo={updateIngresoFijo}
            onToggleIngresoFijoPago={toggleIngresoFijoPago}
          />
        );
      case 'gastos':
        return (
          <Gastos
            gastos={data.gastos}
            gastosFijos={data.gastosFijos}
            gastosFijosPagos={data.gastosFijosPagos}
            selectedMonth={selectedMonth}
            onMonthChange={setSelectedMonth}
            onAdd={addGasto}
            onDelete={deleteGasto}
            onAddGastoFijo={addGastoFijo}
            onDeleteGastoFijo={deleteGastoFijo}
            onUpdateGastoFijo={updateGastoFijo}
            onToggleGastoFijoPago={toggleGastoFijoPago}
          />
        );
      case 'yo-debo':
        return <YoDebo debts={data.yoDebo} onAdd={addYoDebo} onToggle={toggleYoDebo} onDelete={deleteYoDebo} onAddAbono={addAbonoYoDebo} />;
      case 'me-deben':
        return <MeDeben debts={data.meDeben} onAdd={addMeDeben} onToggle={toggleMeDeben} onDelete={deleteMeDeben} onAddAbono={addAbonoMeDeben} />;
    }
  };

  if (!authReady) return null;
  if (!user) return <AuthPage />;
  if (locked) return <LockScreen onUnlock={() => setLocked(false)} onLogout={() => { disableBiometric(); handleLogout(); }} />;

  return (
    <div className="app">
      <Header page={page} onSettings={() => setOpenSettings(true)} syncStatus={syncStatus} />
      <main className="main-content">
        {renderPage()}
      </main>
      <BottomNav page={page} onNavigate={setPage} />

      <Modal isOpen={openSettings} onClose={() => setOpenSettings(false)} title="Datos">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>
            Sesión iniciada como <strong>{user.email}</strong>. Tus datos se sincronizan automáticamente entre dispositivos.
          </p>

          <button className="btn btn-secondary" onClick={handleExport} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" strokeLinecap="round" strokeLinejoin="round" />
              <polyline points="7 10 12 15 17 10" strokeLinecap="round" strokeLinejoin="round" />
              <line x1="12" y1="15" x2="12" y2="3" strokeLinecap="round" />
            </svg>
            Exportar backup
          </button>

          <button
            className="btn btn-secondary"
            onClick={() => importRef.current?.click()}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" strokeLinecap="round" strokeLinejoin="round" />
              <polyline points="17 8 12 3 7 8" strokeLinecap="round" strokeLinejoin="round" />
              <line x1="12" y1="3" x2="12" y2="15" strokeLinecap="round" />
            </svg>
            Importar backup
          </button>

          <input
            ref={importRef}
            type="file"
            accept=".json,application/json"
            style={{ display: 'none' }}
            onChange={handleImportFile}
          />

          {importMsg && (
            <p style={{
              fontSize: 13,
              textAlign: 'center',
              color: importMsg.includes('correctamente') ? 'var(--green)' : 'var(--red)',
              marginTop: 4,
            }}>
              {importMsg}
            </p>
          )}

          {bioAvailable && (
            <>
              <div className="divider" style={{ marginTop: 4 }} />

              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                Pedí huella o Face ID cada vez que abras la app en este dispositivo.
              </p>

              <button
                className="btn btn-secondary"
                onClick={bioEnabled ? handleDisableBiometric : handleEnableBiometric}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: bioEnabled ? 'var(--green)' : undefined }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M12 11v3a6 6 0 01-.4 2.2" strokeLinecap="round" />
                  <path d="M8.5 20.5A10 10 0 0010 14v-2a2 2 0 114 0v2" strokeLinecap="round" />
                  <path d="M5.6 17.6A8 8 0 007 13v-1a5 5 0 0110 0v1" strokeLinecap="round" />
                  <path d="M4 9a8 8 0 0116 0" strokeLinecap="round" />
                </svg>
                {bioEnabled ? 'Desbloqueo biométrico activado' : 'Activar desbloqueo biométrico'}
              </button>

              {bioMsg && (
                <p style={{ fontSize: 13, textAlign: 'center', color: bioMsg.includes('No se pudo') ? 'var(--red)' : 'var(--green)' }}>
                  {bioMsg}
                </p>
              )}
            </>
          )}

          <div className="divider" style={{ marginTop: 4 }} />

          <button className="btn btn-secondary" onClick={handleLogout} style={{ color: 'var(--red)', borderColor: 'var(--red-dim)' }}>
            Cerrar sesión
          </button>
        </div>
      </Modal>
    </div>
  );
}

export default App;
