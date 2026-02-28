import { useState, useEffect } from 'react';
import { AppData, Page, Transaction, Debt } from './types';
import { loadData, saveData, genId } from './storage';
import { currentMonth } from './utils';
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import Dashboard from './pages/Dashboard';
import Ingresos from './pages/Ingresos';
import Gastos from './pages/Gastos';
import YoDebo from './pages/YoDebo';
import MeDeben from './pages/MeDeben';

function App() {
  const [data, setData] = useState<AppData>(loadData);
  const [page, setPage] = useState<Page>('dashboard');
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);

  useEffect(() => {
    saveData(data);
  }, [data]);

  const addIngreso = (t: Omit<Transaction, 'id' | 'createdAt'>) =>
    setData(d => ({ ...d, ingresos: [...d.ingresos, { ...t, id: genId(), createdAt: new Date().toISOString() }] }));

  const deleteIngreso = (id: string) =>
    setData(d => ({ ...d, ingresos: d.ingresos.filter(t => t.id !== id) }));

  const addGasto = (t: Omit<Transaction, 'id' | 'createdAt'>) =>
    setData(d => ({ ...d, gastos: [...d.gastos, { ...t, id: genId(), createdAt: new Date().toISOString() }] }));

  const deleteGasto = (id: string) =>
    setData(d => ({ ...d, gastos: d.gastos.filter(t => t.id !== id) }));

  const addYoDebo = (debt: Omit<Debt, 'id' | 'createdAt' | 'paid'>) =>
    setData(d => ({ ...d, yoDebo: [...d.yoDebo, { ...debt, id: genId(), paid: false, createdAt: new Date().toISOString() }] }));

  const toggleYoDebo = (id: string) =>
    setData(d => ({ ...d, yoDebo: d.yoDebo.map(x => x.id === id ? { ...x, paid: !x.paid } : x) }));

  const deleteYoDebo = (id: string) =>
    setData(d => ({ ...d, yoDebo: d.yoDebo.filter(x => x.id !== id) }));

  const addMeDeben = (debt: Omit<Debt, 'id' | 'createdAt' | 'paid'>) =>
    setData(d => ({ ...d, meDeben: [...d.meDeben, { ...debt, id: genId(), paid: false, createdAt: new Date().toISOString() }] }));

  const toggleMeDeben = (id: string) =>
    setData(d => ({ ...d, meDeben: d.meDeben.map(x => x.id === id ? { ...x, paid: !x.paid } : x) }));

  const deleteMeDeben = (id: string) =>
    setData(d => ({ ...d, meDeben: d.meDeben.filter(x => x.id !== id) }));

  const renderPage = () => {
    switch (page) {
      case 'dashboard':
        return <Dashboard data={data} selectedMonth={selectedMonth} onMonthChange={setSelectedMonth} />;
      case 'ingresos':
        return <Ingresos ingresos={data.ingresos} selectedMonth={selectedMonth} onMonthChange={setSelectedMonth} onAdd={addIngreso} onDelete={deleteIngreso} />;
      case 'gastos':
        return <Gastos gastos={data.gastos} selectedMonth={selectedMonth} onMonthChange={setSelectedMonth} onAdd={addGasto} onDelete={deleteGasto} />;
      case 'yo-debo':
        return <YoDebo debts={data.yoDebo} onAdd={addYoDebo} onToggle={toggleYoDebo} onDelete={deleteYoDebo} />;
      case 'me-deben':
        return <MeDeben debts={data.meDeben} onAdd={addMeDeben} onToggle={toggleMeDeben} onDelete={deleteMeDeben} />;
    }
  };

  return (
    <div className="app">
      <Header page={page} />
      <main className="main-content">
        {renderPage()}
      </main>
      <BottomNav page={page} onNavigate={setPage} />
    </div>
  );
}

export default App;
