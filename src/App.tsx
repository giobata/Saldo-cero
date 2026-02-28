import { useState, useEffect, useRef } from 'react';
import { AppData, Page, Transaction, Debt, GastoFijo, IngresoFijo, Abono } from './types';
import { loadData, saveData, genId, emptyData } from './storage';
import { currentMonth } from './utils';
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import Modal from './components/Modal';
import Dashboard from './pages/Dashboard';
import Ingresos from './pages/Ingresos';
import Gastos from './pages/Gastos';
import YoDebo from './pages/YoDebo';
import MeDeben from './pages/MeDeben';

function App() {
  const [data, setData] = useState<AppData>(loadData);
  const [page, setPage] = useState<Page>('dashboard');
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [openSettings, setOpenSettings] = useState(false);
  const [importMsg, setImportMsg] = useState('');
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    saveData(data);
  }, [data]);

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

  return (
    <div className="app">
      <Header page={page} onSettings={() => setOpenSettings(true)} />
      <main className="main-content">
        {renderPage()}
      </main>
      <BottomNav page={page} onNavigate={setPage} />

      <Modal isOpen={openSettings} onClose={() => setOpenSettings(false)} title="Datos">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>
            Exportá tus datos como backup. Si limpias la caché del navegador, podés restaurarlos importando el archivo.
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
        </div>
      </Modal>
    </div>
  );
}

export default App;
