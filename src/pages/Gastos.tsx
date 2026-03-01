import { useState } from 'react';
import { Transaction, GastoFijo, GastoFijoPago } from '../types';
import { formatCOP, formatDate, today } from '../utils';
import MonthSelector from '../components/MonthSelector';
import Modal from '../components/Modal';

interface Props {
  gastos: Transaction[];
  gastosFijos: GastoFijo[];
  gastosFijosPagos: GastoFijoPago[];
  selectedMonth: string;
  onMonthChange: (m: string) => void;
  onAdd: (t: Omit<Transaction, 'id' | 'createdAt'>) => void;
  onDelete: (id: string) => void;
  onAddGastoFijo: (g: Omit<GastoFijo, 'id' | 'createdAt' | 'active'>) => void;
  onDeleteGastoFijo: (id: string) => void;
  onUpdateGastoFijo: (id: string, updates: Partial<Pick<GastoFijo, 'description' | 'amount'>>) => void;
  onToggleGastoFijoPago: (gastoFijoId: string, month: string) => void;
}

export default function Gastos({
  gastos, gastosFijos, gastosFijosPagos,
  selectedMonth, onMonthChange,
  onAdd, onDelete,
  onAddGastoFijo, onDeleteGastoFijo, onUpdateGastoFijo, onToggleGastoFijoPago,
}: Props) {
  // Ocasional modal
  const [openOcasional, setOpenOcasional] = useState(false);
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(today);

  // Fijo modal
  const [openFijo, setOpenFijo] = useState(false);
  const [editingFijo, setEditingFijo] = useState<GastoFijo | null>(null);
  const [fijoDesc, setFijoDesc] = useState('');
  const [fijoAmount, setFijoAmount] = useState('');

  const activeFijos = gastosFijos.filter(g => g.active).sort((a, b) => b.amount - a.amount);

  const isPaid = (id: string) =>
    gastosFijosPagos.some(p => p.gastoFijoId === id && p.month === selectedMonth && p.paid);

  const ocasionales = gastos
    .filter(t => t.date.startsWith(selectedMonth))
    .sort((a, b) => b.amount - a.amount);

  const totalFijosPagados = activeFijos
    .filter(g => isPaid(g.id))
    .reduce((s, g) => s + g.amount, 0);

  const totalOcasionales = ocasionales.reduce((s, t) => s + t.amount, 0);
  const total = totalFijosPagados + totalOcasionales;

  function handleSubmitOcasional(e: React.FormEvent) {
    e.preventDefault();
    const num = parseFloat(amount.replace(/[.,]/g, ''));
    if (!desc.trim() || isNaN(num) || num <= 0) return;
    onAdd({ description: desc.trim(), amount: num, date });
    setDesc('');
    setAmount('');
    setDate(today());
    setOpenOcasional(false);
  }

  function handleOpenAddFijo() {
    setEditingFijo(null);
    setFijoDesc('');
    setFijoAmount('');
    setOpenFijo(true);
  }

  function handleOpenEditFijo(g: GastoFijo) {
    setEditingFijo(g);
    setFijoDesc(g.description);
    setFijoAmount(String(g.amount));
    setOpenFijo(true);
  }

  function handleSubmitFijo(e: React.FormEvent) {
    e.preventDefault();
    const num = parseFloat(fijoAmount.replace(/[.,]/g, ''));
    if (!fijoDesc.trim() || isNaN(num) || num <= 0) return;
    if (editingFijo) {
      onUpdateGastoFijo(editingFijo.id, { description: fijoDesc.trim(), amount: num });
    } else {
      onAddGastoFijo({ description: fijoDesc.trim(), amount: num });
    }
    setFijoDesc('');
    setFijoAmount('');
    setEditingFijo(null);
    setOpenFijo(false);
  }

  const paidCount = activeFijos.filter(g => isPaid(g.id)).length;

  return (
    <div>
      <MonthSelector value={selectedMonth} onChange={onMonthChange} />

      {total > 0 && (
        <div style={{ padding: '8px 16px 0' }}>
          <div className="summary-card">
            <div className="summary-card-label">Total del mes</div>
            <div className="summary-card-amount red">{formatCOP(total)}</div>
          </div>
        </div>
      )}

      {/* ── Mensuales ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 16px 8px' }}>
        <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-muted)' }}>
          Mensuales{activeFijos.length > 0 && ` · ${paidCount}/${activeFijos.length} pagados`}
        </div>
        <button
          onClick={handleOpenAddFijo}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red)', fontSize: 13, fontWeight: 600, padding: '4px 0' }}
        >
          + Agregar
        </button>
      </div>

      {activeFijos.length === 0 ? (
        <div style={{ padding: '4px 16px 8px', color: 'var(--text-dim)', fontSize: 13 }}>
          Agrega los gastos que se repiten cada mes.
        </div>
      ) : (
        <div className="list">
          {activeFijos.map(g => {
            const paid = isPaid(g.id);
            return (
              <div
                key={g.id}
                className="entry-card"
                style={{ opacity: paid ? 0.55 : 1 }}
              >
                <button
                  onClick={() => onToggleGastoFijoPago(g.id, selectedMonth)}
                  aria-label={paid ? 'Marcar como pendiente' : 'Marcar como pagado'}
                  style={{
                    background: 'none',
                    border: `2px solid ${paid ? 'var(--green)' : 'var(--border)'}`,
                    borderRadius: '50%',
                    width: 28,
                    height: 28,
                    flexShrink: 0,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: paid ? 'var(--green)' : 'transparent',
                    transition: 'border-color 0.15s, color 0.15s',
                  }}
                >
                  {paid && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
                <div className="entry-body">
                  <div
                    className="entry-desc"
                    style={{ textDecoration: paid ? 'line-through' : 'none' }}
                  >
                    {g.description}
                  </div>
                </div>
                <div className="entry-right">
                  <div
                    className="entry-amount"
                    style={{ color: paid ? 'var(--text-dim)' : 'var(--red)' }}
                  >
                    {formatCOP(g.amount)}
                  </div>
                  <div className="entry-actions">
                    <button className="icon-btn" onClick={() => handleOpenEditFijo(g)} aria-label="Editar">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                    <button className="icon-btn" onClick={() => onDeleteGastoFijo(g.id)} aria-label="Eliminar">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Ocasionales ── */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '16px 16px 8px', gap: 8 }}>
        <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-muted)' }}>
          Ocasionales{ocasionales.length > 0 && ` · ${ocasionales.length}`}
        </div>
      </div>

      {ocasionales.length === 0 ? (
        <div style={{ padding: '4px 16px 8px', color: 'var(--text-dim)', fontSize: 13 }}>
          Sin gastos ocasionales este mes.
        </div>
      ) : (
        <div className="list">
          {ocasionales.map(t => (
            <div className="entry-card" key={t.id}>
              <div className="entry-icon red">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--red)" strokeWidth="2.5">
                  <path d="M12 5v14M19 12l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className="entry-body">
                <div className="entry-desc">{t.description}</div>
                <div className="entry-date">{formatDate(t.date)}</div>
              </div>
              <div className="entry-right">
                <div className="entry-amount red">{formatCOP(t.amount)}</div>
                <div className="entry-actions">
                  <button className="icon-btn" onClick={() => onDelete(t.id)} aria-label="Eliminar">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* FAB: nuevo ocasional */}
      <button className="fab" onClick={() => setOpenOcasional(true)} aria-label="Agregar gasto ocasional">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M12 5v14M5 12h14" strokeLinecap="round" />
        </svg>
      </button>

      {/* Modal ocasional */}
      <Modal isOpen={openOcasional} onClose={() => setOpenOcasional(false)} title="Gasto Ocasional">
        <form className="form" onSubmit={handleSubmitOcasional}>
          <div className="field">
            <label>Descripción</label>
            <input
              type="text"
              placeholder="Ej: Taxi, almuerzo, farmacia..."
              value={desc}
              onChange={e => setDesc(e.target.value)}
              autoFocus
            />
          </div>
          <div className="field">
            <label>Monto (COP)</label>
            <input
              type="number"
              placeholder="0"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              min="0"
              step="1000"
              inputMode="numeric"
            />
          </div>
          <div className="field">
            <label>Fecha</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
            />
          </div>
          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setOpenOcasional(false)}>Cancelar</button>
            <button type="submit" className="btn btn-primary">Guardar</button>
          </div>
        </form>
      </Modal>

      {/* Modal fijo */}
      <Modal
        isOpen={openFijo}
        onClose={() => { setOpenFijo(false); setEditingFijo(null); }}
        title={editingFijo ? 'Editar mensual' : 'Nuevo gasto mensual'}
      >
        <form className="form" onSubmit={handleSubmitFijo}>
          <div className="field">
            <label>Descripción</label>
            <input
              type="text"
              placeholder="Ej: Arriendo, internet, gym..."
              value={fijoDesc}
              onChange={e => setFijoDesc(e.target.value)}
              autoFocus
            />
          </div>
          <div className="field">
            <label>Monto (COP)</label>
            <input
              type="number"
              placeholder="0"
              value={fijoAmount}
              onChange={e => setFijoAmount(e.target.value)}
              min="0"
              step="1000"
              inputMode="numeric"
            />
          </div>
          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={() => { setOpenFijo(false); setEditingFijo(null); }}>Cancelar</button>
            <button type="submit" className="btn btn-primary">{editingFijo ? 'Actualizar' : 'Guardar'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
