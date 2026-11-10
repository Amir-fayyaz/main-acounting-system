'use client';

import * as React from 'react';

import type { PaginationMeta } from '../data-table.types';
import { resolvePaginationMeta } from '../lib/pagination';
import { TablePagination } from './TablePagination';

export interface TablePaginationSlotProps {
  isServer: boolean;
  meta?: PaginationMeta;
  paginate: boolean;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  pageSizes?: number[];
  serverPage?: number;
  serverLimit?: number;
  onServerPageChange?: (page: number) => void;
  onServerLimitChange?: (limit: number) => void;
  onClientPageChange: (page: number) => void;
  onClientLimitChange: (limit: number) => void;
}

/** Chooses server- vs client-mode pagination and renders nothing when it should be hidden. */
export function TablePaginationSlot({
  isServer,
  meta,
  paginate,
  total,
  page,
  limit,
  totalPages,
  pageSizes,
  serverPage,
  serverLimit,
  onServerPageChange,
  onServerLimitChange,
  onClientPageChange,
  onClientLimitChange,
}: TablePaginationSlotProps) {
  const paginationMeta: PaginationMeta | null = resolvePaginationMeta({
    isServer,
    meta,
    paginate,
    total,
    page,
    limit,
    totalPages,
    serverPage,
    serverLimit,
    onServerPageChange,
    onServerLimitChange,
  });

  if (!paginationMeta) return null;

  return (
    <div className="pb-3">
      <TablePagination
        meta={paginationMeta}
        page={isServer ? serverPage : page}
        limit={isServer ? serverLimit : limit}
        onPageChange={isServer ? onServerPageChange : onClientPageChange}
        onLimitChange={isServer ? onServerLimitChange : onClientLimitChange}
        pageSizes={pageSizes}
        resetPageOnLimitChange={!isServer}
      />
    </div>
  );
}
