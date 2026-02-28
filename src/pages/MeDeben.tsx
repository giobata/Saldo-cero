import { useState } from 'react';
import { Debt, Abono } from '../types';
import { formatCOP, formatDate, today } from '../utils';
import Modal from '../components/Modal';

interface Props {
  debts: Debt[];
  onAdd: (d: Omit<Debt, 'id' | 'createdAt' | 'paid'>) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onAddAbono: (debtId: string, abono: Omit<Abono, 'id' | 'createdAt'>) => void;
}

function saldo(d: Debt) {
  const abonado = (d.abonos ?? []).reduce((s, a) => s + a.amount, 0);
  return Math.max(0, d.amount - abonado);
}

export default function MeDeben({ debts, onAdd, onToggle, onDelete, onAddAbono }: Props) {
  const [open, setOpen] = useState(false);
  const [person, setPerson] = useState('');
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(today);

  const [abonoDebtId, setAbonoDebtId] = useState<string | null>(null);
  const [abonoAmount, setAbonoAmount] = useState('');
  const [abonoDate, setAbonoDate] = useState(today);

  const pending = debts.filter(d => !d.paid).sort((a, b) => b.date.localeCompare(a.date));
  const received = debts.filter(d => d.paid).sort((a, b) => b.date.localeCompare(a.date));

  const totalPending = pending.reduce((s, d) => s + saldo(d), 0);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const num = parseFloat(amount.replace(/[.,]/g, ''));
    if (!person.trim() || isNaN(num) || num <= 0) return;
    onAdd({ person: person.trim(), description: desc.trim(), amount: num, date });
    setPerson(''); setDesc(''); setAmount(''); setDate(today());
    setOpen(false);
  }

  function handleAbonoSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!abonoDebtId) return;
    const num = parseFloat(abonoAmount.replace(/[.,]/g, ''));
    if (isNaN(num) || num <= 0) return;
    onAddAbono(abonoDebtId, { amount: num, date: abonoDate });
    setAbonoAmount(''); setAbonoDate(today()); setAbonoDebtId(null);
  }

  function CreditCard({ d }: { d: Debt }) {
    const abonos = d.abonos ?? [];
    const totalAbonado = abonos.reduce((s, a) => s + a.amount, 0);
    const remaining = Math.max(0, d.amount - totalAbonado);
    const hasAbonos = abonos.length > 0;

    return (
      <div className={`entry-card ${d.paid ? 'paid' : ''}`} style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="entry-icon blue">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="2">
              <path d="M20 12V22H4V12" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M22 7H2v5h20V7z" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M12 22V7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="entry-body">
            <div className="entry-desc">{d.person}</div>
            {d.description && <div className="entry-person">{d.description}</div>}
            <div className="entry-date">{formatDate(d.date)}</div>
          </div>
          <div className="entry-right">
            <div className="entry-amount blue">
              {hasAbonos ? formatCOP(remaining) : formatCOP(d.amount)}
            </div>
            {hasAbonos && (
              <div style={{ fontSize: 11, color: 'var(--text-dim)', textAlign: 'right' }}>
                de {formatCOP(d.amount)}
              </div>
            )}
            <div className="entry-actions">
              {!d.paid && (
                <button
                  className="icon-btn"
                  onClick={() => { setAbonoDebtId(d.id); setAbonoDate(today()); setAbonoAmount(''); }}
                  title="Registrar abono"
                  style={{ color: 'var(--blue)' }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                  </svg>
                </button>
              )}
              <button
                className={`icon-btn ${d.paid ? 'paid-btn' : ''}`}
                onClick={() => onToggle(d.id)}
                title={d.paid ? 'Marcar como pendiente' : 'Marcar como recibido'}
              >
                {d.paid ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
              <button className="icon-btn" onClick={() => onDelete(d.id)} aria-label="Eliminar">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {hasAbonos && (
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 3 }}>
            {abonos.map(a => (
              <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)' }}>
                <span>Abono {formatDate(a.date)}</span>
                <span style={{ color: 'var(--green)' }}>+{formatCOP(a.amount)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      {pending.length > 0 && (
        <div style={{ padding: '16px 16px 0' }}>
          <div className="summary-card">
            <div className="summary-card-label">Total por recibir</div>
            <div className="summary-card-amount blue">{formatCOP(totalPending)}</div>
          </div>
        </div>
      )}

      {debts.length === 0 ? (
        <div className="empty" style={{ marginTop: 24 }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M20 12V22H4V12M22 7H2v5h20V7zM12 22V7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <p>Nadie te debe nada registrado.</p>
        </div>
      ) : (
        <>
          {pending.length > 0 && (
            <>
              <div className="section-title">Pendientes ({pending.length})</div>
              <div className="list">
                {pending.map(d => <CreditCard key={d.id} d={d} />)}
              </div>
            </>
          )}
          {received.length > 0 && (
            <>
              <div className="section-title">Recibidos ({received.length})</div>
              <div className="list">
                {received.map(d => <CreditCard key={d.id} d={d} />)}
              </div>
            </>
          )}
        </>
      )}

      <button className="fab" onClick={() => setOpen(true)} aria-label="Agregar">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M12 5v14M5 12h14" strokeLinecap="round" />
        </svg>
      </button>

      <Modal isOpen={open} onClose={() => setOpen(false)} title="¿Quién te debe?">
        <form className="form" onSubmit={handleSubmit}>
          <div className="field">
            <label>¿Quién te debe?</label>
            <input type="text" placeholder="Nombre de la persona" value={person} onChange={e => setPerson(e.target.value)} autoFocus />
          </div>
          <div className="field">
            <label>Descripción (opcional)</label>
            <input type="text" placeholder="Ej: Préstamo para viaje..." value={desc} onChange={e => setDesc(e.target.value)} />
          </div>
          <div className="field">
            <label>Monto total (COP)</label>
            <input type="number" placeholder="0" value={amount} onChange={e => setAmount(e.target.value)} min="0" step="1000" inputMode="numeric" />
          </div>
          <div className="field">
            <label>Fecha</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>Cancelar</button>
            <button type="submit" className="btn btn-primary">Guardar</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!abonoDebtId} onClose={() => setAbonoDebtId(null)} title="Registrar abono">
        <form className="form" onSubmit={handleAbonoSubmit}>
          <div className="field">
            <label>Monto del abono (COP)</label>
            <input type="number" placeholder="0" value={abonoAmount} onChange={e => setAbonoAmount(e.target.value)} min="0" step="1000" inputMode="numeric" autoFocus />
          </div>
          <div className="field">
            <label>Fecha</label>
            <input type="date" value={abonoDate} onChange={e => setAbonoDate(e.target.value)} />
          </div>
          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setAbonoDebtId(null)}>Cancelar</button>
            <button type="submit" className="btn btn-primary">Guardar</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
