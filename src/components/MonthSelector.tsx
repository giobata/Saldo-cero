import { formatMonth, prevMonth, nextMonth, currentMonth } from '../utils';

interface Props {
  value: string;
  onChange: (month: string) => void;
}

export default function MonthSelector({ value, onChange }: Props) {
  const isCurrentMonth = value === currentMonth();

  return (
    <div className="month-selector">
      <button className="month-btn" onClick={() => onChange(prevMonth(value))} aria-label="Mes anterior">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <span className="month-label">{formatMonth(value)}</span>

      <button
        className="month-btn"
        onClick={() => onChange(nextMonth(value))}
        disabled={isCurrentMonth}
        style={{ opacity: isCurrentMonth ? 0.3 : 1 }}
        aria-label="Mes siguiente"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}
