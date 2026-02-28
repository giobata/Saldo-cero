import { useState } from 'react';
import { Transaction } from '../types';
import { formatCOP, formatDate, today } from '../utils';
import MonthSelector from '../components/MonthSelector';
import Modal from '../components/Modal';

interface Props {
  gastos: Transaction[];
  selectedMonth: string;
  onMonthChange: (m: string) => void;
  onAdd: (t: Omit<Transaction, 'id' | 'createdAt'>) => void;
  onDelete: (id: string) => void;
}

export default function Gastos({ gastos, selectedMonth, onMonthChange, onAdd, onDelete }: Props) {
  const [open, setOpen] = useState(false);
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(today);

  const filtered = gastos
    .filter(t => t.date.startsWith(selectedMonth))
    .sort((a, b) => b.date.localeCompare(a.date));

  const total = filtered.reduce((s, t) => s + t.amount, 0);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const num = parseFloat(amount.replace(/[.,]/g, ''));
    if (!desc.trim() || isNaN(num) || num <= 0) return;
    onAdd({ description: desc.trim(), amount: num, date });
    setDesc('');
    setAmount('');
    setDate(today());
    setOpen(false);
  }

  return (
    <div>
      <MonthSelector value={selectedMonth} onChange={onMonthChange} />

      {filtered.length > 0 && (
        <div style={{ padding: '8px 16px 0' }}>
          <div className="summary-card">
            <div className="summary-card-label">Total del mes</div>
            <div className="summary-card-amount red">{formatCOP(total)}</div>
          </div>
        </div>
      )}

      <div className="section-title">
        {filtered.length > 0 ? `${filtered.length} registro${filtered.length !== 1 ? 's' : ''}` : 'Sin registros'}
      </div>

      {filtered.length === 0 ? (
        <div className="empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M12 5v14M19 12l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <p>No hay gastos este mes.</p>
        </div>
      ) : (
        <div className="list">
          {filtered.map(t => (
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

      <button className="fab" onClick={() => setOpen(true)} aria-label="Agregar gasto">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M12 5v14M5 12h14" strokeLinecap="round" />
        </svg>
      </button>

      <Modal isOpen={open} onClose={() => setOpen(false)} title="Nuevo Gasto">
        <form className="form" onSubmit={handleSubmit}>
          <div className="field">
            <label>Descripción</label>
            <input
              type="text"
              placeholder="Ej: Mercado, transporte, arriendo..."
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
            <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>Cancelar</button>
            <button type="submit" className="btn btn-primary">Guardar</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
