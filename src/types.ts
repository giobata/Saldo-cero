export type Page = 'dashboard' | 'ingresos' | 'gastos' | 'yo-debo' | 'me-deben';

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  date: string; // YYYY-MM-DD
  createdAt: string;
}

export interface Debt {
  id: string;
  person: string;
  description: string;
  amount: number;
  date: string; // YYYY-MM-DD
  paid: boolean;
  createdAt: string;
}

export interface AppData {
  ingresos: Transaction[];
  gastos: Transaction[];
  yoDebo: Debt[];
  meDeben: Debt[];
}
