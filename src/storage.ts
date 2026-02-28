import { AppData } from './types';

const KEY = 'saldo-cero-v1';

export const emptyData: AppData = {
  ingresos: [],
  gastos: [],
  gastosFijos: [],
  gastosFijosPagos: [],
  ingresosFijos: [],
  ingresosFijosPagos: [],
  yoDebo: [],
  meDeben: [],
};

export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...emptyData };
    const parsed = JSON.parse(raw) as Partial<AppData>;
    return { ...emptyData, ...parsed };
  } catch {
    return { ...emptyData };
  }
}

export function saveData(data: AppData): void {
  localStorage.setItem(KEY, JSON.stringify(data));
}

export function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}
