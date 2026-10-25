const MONTH_LABELS = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
];

export type MonthBucket = {
  year: number;
  month: number;
  label: string;
  start: Date;
  end: Date;
};

/** Últimos `count` meses (mais antigo primeiro), incluindo o mês atual. */
export function lastNMonths(count: number): MonthBucket[] {
  const now = new Date();
  const buckets: MonthBucket[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = d.getMonth();
    const start = new Date(year, month, 1, 0, 0, 0, 0);
    const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
    const shortYear = String(year).slice(2);
    buckets.push({ year, month, label: `${MONTH_LABELS[month]}/${shortYear}`, start, end });
  }
  return buckets;
}

/** Soma `getValue(item)` de `items` em cada bucket mensal, por `getDate(item)`. */
export function sumByMonth<T>(
  items: T[],
  buckets: MonthBucket[],
  getDate: (item: T) => Date,
  getValue: (item: T) => number,
): number[] {
  const totals = buckets.map(() => 0);
  for (const item of items) {
    const date = getDate(item);
    const index = buckets.findIndex((b) => date >= b.start && date <= b.end);
    if (index >= 0) totals[index] += getValue(item);
  }
  return totals;
}

/** Conta quantos `items` caem em cada bucket mensal, por `getDate(item)`. */
export function countByMonth<T>(
  items: T[],
  buckets: MonthBucket[],
  getDate: (item: T) => Date,
): number[] {
  return sumByMonth(items, buckets, getDate, () => 1);
}
