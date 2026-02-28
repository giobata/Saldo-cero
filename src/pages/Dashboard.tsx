import { AppData } from '../types';
import { formatCOP } from '../utils';
import MonthSelector from '../components/MonthSelector';

interface Props {
  data: AppData;
  selectedMonth: string;
  onMonthChange: (m: string) => void;
}

export default function Dashboard({ data, selectedMonth, onMonthChange }: Props) {
  const totalIngresos = data.ingresos
    .filter(t => t.date.startsWith(selectedMonth))
    .reduce((s, t) => s + t.amount, 0);

  const totalGastosOcasionales = data.gastos
    .filter(t => t.date.startsWith(selectedMonth))
    .reduce((s, t) => s + t.amount, 0);

  const totalGastosFijos = data.gastosFijos
    .filter(g => g.active && data.gastosFijosPagos.some(
      p => p.gastoFijoId === g.id && p.month === selectedMonth && p.paid
    ))
    .reduce((s, g) => s + g.amount, 0);

  const totalGastos = totalGastosOcasionales + totalGastosFijos;

  const saldo = totalIngresos - totalGastos;

  const totalYoDebo = data.yoDebo
    .filter(d => !d.paid)
    .reduce((s, d) => s + d.amount, 0);

  const totalMeDeben = data.meDeben
    .filter(d => !d.paid)
    .reduce((s, d) => s + d.amount, 0);

  const saldoClass = saldo > 0 ? 'positive' : saldo < 0 ? 'negative' : '';

  return (
    <div>
      <MonthSelector value={selectedMonth} onChange={onMonthChange} />

      <div className="summary-grid">
        <div className="summary-card">
          <div className="summary-card-label">Ingresos</div>
          <div className="summary-card-amount green">{formatCOP(totalIngresos)}</div>
        </div>

        <div className="summary-card">
          <div className="summary-card-label">Gastos</div>
          <div className="summary-card-amount red">{formatCOP(totalGastos)}</div>
        </div>

        <div className="summary-card full">
          <div className="summary-card-label">Saldo del mes</div>
          <div className={`summary-card-amount ${saldoClass}`} style={{ fontSize: 26 }}>
            {saldo >= 0 ? '' : '−'}{formatCOP(Math.abs(saldo))}
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-card-label">Falta pagar</div>
          <div className="summary-card-amount orange">{formatCOP(totalYoDebo)}</div>
        </div>

        <div className="summary-card">
          <div className="summary-card-label">Me deben</div>
          <div className="summary-card-amount blue">{formatCOP(totalMeDeben)}</div>
        </div>
      </div>

      {totalIngresos === 0 && totalGastos === 0 && totalYoDebo === 0 && totalMeDeben === 0 && (
        <div className="empty" style={{ marginTop: 20 }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
            <path d="M12 8v4M12 16h.01" strokeLinecap="round" />
          </svg>
          <p>Aún no hay registros.<br />Empieza agregando un ingreso o gasto.</p>
        </div>
      )}
    </div>
  );
}
