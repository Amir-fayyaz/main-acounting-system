import * as React from 'react';
import { MoneyCell } from '../cells/cells';

/** Footer helper: sum of a numeric field over the rows shown, formatted as money. */
export const sumFooter =
  <T,>(key: keyof T & string) =>
  (rows: T[]): React.ReactNode => (
    <MoneyCell value={rows.reduce((s, r) => s + (Number(r[key]) || 0), 0)} />
  );
