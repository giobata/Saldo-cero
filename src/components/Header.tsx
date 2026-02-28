import { Page } from '../types';

const titles: Record<Page, string> = {
  dashboard: 'Saldo Cero',
  ingresos: 'Ingresos',
  gastos: 'Gastos',
  'yo-debo': 'Yo Debo',
  'me-deben': 'Me Deben',
};

interface Props {
  page: Page;
}

export default function Header({ page }: Props) {
  return (
    <header className="header">
      <h1 className="header-title">{titles[page]}</h1>
    </header>
  );
}
