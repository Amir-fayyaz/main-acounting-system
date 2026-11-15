'use client';

import * as React from 'react';
import { Check, MoreHorizontal, Pencil, X } from 'lucide-react';

import type { RowAction } from '../data-table.types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui';
import { cx } from '../lib/text';
import { iconBtnClass } from '../lib/styles';

export interface RowActionsProps<T> {
  row: T;
  actions: RowAction<T>[];
  onRun: (action: RowAction<T>, row: T) => void;
  /** Row is in inline-edit mode: show save / cancel instead. */
  editing?: { saving: boolean; onSave: () => void; onCancel: () => void };
  /** Another row is being edited: other rows' actions are inert. */
  locked?: boolean;
}

function disabledState<T>(a: RowAction<T>, row: T): { disabled: boolean; reason?: string } {
  const d = a.disabled?.(row);
  return typeof d === 'string' ? { disabled: true, reason: d } : { disabled: Boolean(d) };
}

export function RowActions<T>({ row, actions, onRun, editing, locked }: RowActionsProps<T>) {
  if (editing) {
    return (
      <div className="flex items-center justify-end gap-1">
        <button
          type="button"
          onClick={editing.onSave}
          disabled={editing.saving}
          aria-label="ذخیره"
          title="ذخیره (Enter)"
          className={cx(
            iconBtnClass,
            'bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground',
          )}
        >
          <Check className="size-4" />
        </button>
        <button
          type="button"
          onClick={editing.onCancel}
          disabled={editing.saving}
          aria-label="انصراف"
          title="انصراف (Esc)"
          className={iconBtnClass}
        >
          <X className="size-4" />
        </button>
      </div>
    );
  }

  const visible = actions.filter((a) => !a.hidden?.(row));
  if (!visible.length) return null;
  const inline = visible.filter((a) => a.inline);
  const menu = visible.filter((a) => !a.inline);
  const firstDestructive = menu.findIndex((a) => a.variant === 'destructive');

  const icon = (a: RowAction<T>) =>
    a.icon ?? (a.kind === 'edit' ? <Pencil className="size-4" /> : null);

  return (
    <div className="flex items-center justify-end gap-0.5">
      {inline.map((a) => {
        const { disabled, reason } = disabledState(a, row);
        return (
          <button
            key={a.id}
            type="button"
            disabled={disabled || locked}
            title={reason ?? a.label}
            aria-label={a.label}
            onClick={(e) => {
              e.stopPropagation();
              onRun(a, row);
            }}
            className={cx(iconBtnClass, a.variant === 'destructive' && 'hover:text-destructive')}
          >
            {icon(a) ?? <span className="text-xs">{a.label}</span>}
          </button>
        );
      })}

      {menu.length ? (
        <DropdownMenu dir="rtl">
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              disabled={locked}
              aria-label="عملیات ردیف"
              onClick={(e) => e.stopPropagation()}
              className={iconBtnClass}
            >
              <MoreHorizontal className="size-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-44">
            {menu.map((a, i) => {
              const { disabled, reason } = disabledState(a, row);
              return (
                <React.Fragment key={a.id}>
                  {i === firstDestructive && i > 0 ? <DropdownMenuSeparator /> : null}
                  <DropdownMenuItem
                    disabled={disabled}
                    title={reason}
                    className={cx(
                      'gap-2',
                      a.variant === 'destructive' && 'text-destructive focus:text-destructive',
                    )}
                    // Defer so the menu finishes closing before a dialog/edit mode takes focus.
                    onSelect={() => setTimeout(() => onRun(a, row), 0)}
                  >
                    {icon(a)}
                    {a.label}
                  </DropdownMenuItem>
                </React.Fragment>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </div>
  );
}
