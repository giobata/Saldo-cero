import { useState, useEffect, useRef, useCallback } from 'react';
import type { User } from '@supabase/supabase-js';
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

type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error';

function App() {
  const [data, setData] = useState<AppData>(loadData);
  const [page, setPage] = useState<Page>('dashboard');
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [openSettings, setOpenSettings] = useState(false);
  const [importMsg, setImportMsg] = useState('');
  const importRef = useRef<HTMLInputElement>(null);

  // Cloud sync
  const [user, setUser] = useState<User | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const userRef = useRef<User | null>(null);
  const skipSyncRef = useRef(false);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dataRef = useRef<AppData>(data);

  useEffect(() => { userRef.current = user; }, [user]);
  useEffect(() => { dataRef.current = data; }, [data]);

  const pushToCloud = useCallback(async (userId: string, appData: AppData) => {
    if (!supabase) return;
    try {
      const { error } = await supabase
        .from('user_data')
        .upsert({ id: userId, data: appData, updated_at: new Date().toISOString() });
      if (error) throw error;
      setSyncStatus('synced');
    } catch {
      setSyncStatus('error');
    }
  }, []);

  const pullFromCloud = useCallback(async (userId: string) => {
    if (!supabase) return;
    setSyncStatus('syncing');
    try {
      const { data: row, error } = await supabase
        .from('user_data')
        .select('data')
        .eq('id', userId)
        .maybeSingle();
      if (error) throw error;
      if (row?.data && Object.keys(row.data).length > 0) {
        skipSyncRef.current = true;
        setData({ ...emptyData, ...(row.data as Partial<AppData>) });
      } else {
        await pushToCloud(userId, dataRef.current);
      }
      setSyncStatus('synced');
    } catch {
      setSyncStatus('error');
    }
  }, [pushToCloud]);

  // Init Supabase auth listener
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) pullFromCloud(u.id);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) pullFromCloud(u.id);
    });
    return () => subscription.unsubscribe();
  }, [pullFromCloud]);

  // Pull from cloud when tab becomes visible (catch changes from other devices)
  useEffect(() => {
    if (!supabase) return;
    const onVisible = () => {
      if (document.visibilityState === 'visible' && userRef.current) {
        pullFromCloud(userRef.current.id);
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [pullFromCloud]);

  // Save locally + debounced push to cloud on every data change
  useEffect(() => {
    saveData(data);
    if (!supabase || !userRef.current) return;
    if (skipSyncRef.current) { skipSyncRef.current = false; return; }
    setSyncStatus('syncing');
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(() => {
      if (userRef.current) pushToCloud(userRef.current.id, dataRef.current);
    }, 1200);
  }, [data, pushToCloud]);

  async function loginWithGoogle() {
    if (!supabase) return;
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
  }

  async function handleLogout() {
    if (!supabase) return;
    await supabase.auth.signOut();
    setUser(null);
    setSyncStatus('idle');
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

  const updateGastoFijo = (id: string, updates: Partial<Pick<GastoFijo, 'description' | 'amount'>>) =>
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

  const syncDotColor = syncStatus === 'synced'
    ? 'var(--green)'
    : syncStatus === 'error'
      ? 'var(--red)'
      : 'var(--text-muted)';

  return (
    <div className="app">
      <Header page={page} onSettings={() => setOpenSettings(true)} />
      <main className="main-content">
        {renderPage()}
      </main>
      <BottomNav page={page} onNavigate={setPage} />

      <Modal isOpen={openSettings} onClose={() => setOpenSettings(false)} title="Configuración">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* ── Cloud sync section ── */}
          {supabase && (
            <>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-dim)' }}>
                Sincronización
              </div>
              {user ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: syncDotColor, flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                      {syncStatus === 'syncing' ? 'Sincronizando...' : syncStatus === 'error' ? 'Error al sincronizar' : 'Sincronizado'}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>{user.email}</div>
                  <button className="btn btn-secondary" onClick={handleLogout} style={{ fontSize: 13 }}>
                    Cerrar sesión
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
                    Iniciá sesión para sincronizar tus datos entre dispositivos automáticamente.
                  </p>
                  <button
                    className="btn btn-primary"
                    onClick={loginWithGoogle}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    Continuar con Google
                  </button>
                </div>
              )}
              <div style={{ height: 1, background: 'var(--border)' }} />
            </>
          )}

          {/* ── Backup section ── */}
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-dim)' }}>
            Backup manual
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
            Exportá tus datos como archivo JSON por si acaso.
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
              margin: 0,
            }}>
              {importMsg}
            </p>
          )}
        </div>
      </Modal>
    </div>
  );
}

export default App;
