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

export interface GastoFijo {
  id: string;
  description: string;
  amount: number;
  active: boolean;
  createdAt: string;
}

export interface GastoFijoPago {
  id: string;
  gastoFijoId: string;
  month: string; // YYYY-MM
  paid: boolean;
  createdAt: string;
}

export interface AppData {
  ingresos: Transaction[];
  gastos: Transaction[];
  gastosFijos: GastoFijo[];
  gastosFijosPagos: GastoFijoPago[];
  yoDebo: Debt[];
  meDeben: Debt[];
}
