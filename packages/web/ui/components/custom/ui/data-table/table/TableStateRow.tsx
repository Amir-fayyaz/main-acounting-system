'use client';

import * as React from 'react';

import { TableCell, TableRow } from '../ui';

export interface TableStateRowProps {
  state: 'error' | 'loading' | 'empty' | 'empty-search';
  colSpan: number;
  role?: string;
  children: React.ReactNode;
}

export function TableStateRow({ state, colSpan, role, children }: TableStateRowProps) {
  return (
    <TableRow data-state={state}>
      <TableCell
        colSpan={colSpan}
        className="whitespace-normal py-10 text-center text-muted-foreground"
      >
        {role ? <div role={role}>{children}</div> : children}
      </TableCell>
    </TableRow>
  );
}
