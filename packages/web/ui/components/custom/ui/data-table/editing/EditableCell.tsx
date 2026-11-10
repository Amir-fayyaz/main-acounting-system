'use client';

import * as React from 'react';

import type { EditorType } from '../columns/resolve-columns';
import { JalaliDateInput } from '../date/JalaliDateInput';
import type { FilterOption } from '../filters/filter-types';
import { maskMoneyTyping, parseNumberInput } from '../lib/format';
import { toFaDigits } from '../date/jalali';
import { fieldClass } from '../lib/styles';

export interface EditableCellProps {
  type: EditorType;
  value: unknown;
  onChange: (value: unknown) => void;
  options?: FilterOption[];
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  ariaLabel: string;
  onEnter?: () => void;
}

/**
 * Cell editor used by inline row editing.
 *   text   → string
 *   number → number | null     (Persian/Arabic digits accepted)
 *   money  → number | null     (live thousands separators)
 *   date   → Gregorian ISO | null (typed/picked in Jalali)
 *   select → option value
 */
export function EditableCell({
  type,
  value,
  onChange,
  options,
  placeholder,
  error,
  disabled,
  autoFocus,
  ariaLabel,
  onEnter,
}: EditableCellProps) {
  const enter = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && onEnter && !e.nativeEvent.isComposing) {
      e.preventDefault();
      onEnter();
    }
  };

  let control: React.ReactNode;
  switch (type) {
    case 'date':
      control = (
        <JalaliDateInput
          aria-label={ariaLabel}
          value={(value as string | null) ?? null}
          onChange={onChange}
          invalid={Boolean(error)}
          disabled={disabled}
          autoFocus={autoFocus}
          onEnter={onEnter}
        />
      );
      break;
    case 'number':
    case 'money':
      control = (
        <NumericInput
          money={type === 'money'}
          value={value as number | null | undefined}
          onChange={onChange}
          ariaLabel={ariaLabel}
          error={error}
          disabled={disabled}
          autoFocus={autoFocus}
          placeholder={placeholder}
          onKeyDown={enter}
        />
      );
      break;
    case 'select':
      control = (
        <select
          aria-label={ariaLabel}
          aria-invalid={Boolean(error) || undefined}
          value={String(value ?? '')}
          disabled={disabled}
          autoFocus={autoFocus}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={enter}
          className={fieldClass}
        >
          {placeholder || value === undefined || value === null || value === '' ? (
            <option value="">{placeholder ?? 'انتخاب…'}</option>
          ) : null}
          {(options ?? []).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      );
      break;
    default:
      control = (
        <input
          aria-label={ariaLabel}
          aria-invalid={Boolean(error) || undefined}
          value={String(value ?? '')}
          disabled={disabled}
          autoFocus={autoFocus}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={enter}
          className={fieldClass}
        />
      );
  }

  return (
    <div className="min-w-28">
      {control}
      {error ? (
        <p role="alert" className="mt-1 text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function NumericInput({
  money,
  value,
  onChange,
  ariaLabel,
  error,
  disabled,
  autoFocus,
  placeholder,
  onKeyDown,
}: {
  money: boolean;
  value: number | null | undefined;
  onChange: (v: unknown) => void;
  ariaLabel: string;
  error?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  placeholder?: string;
  onKeyDown: (e: React.KeyboardEvent) => void;
}) {
  const fmt = (n: number | null | undefined) =>
    n === null || n === undefined ? '' : money ? maskMoneyTyping(String(n)) : toFaDigits(n);
  const [text, setText] = React.useState(() => fmt(value));
  const last = React.useRef(value);

  React.useEffect(() => {
    if (value !== last.current) {
      last.current = value;
      setText(fmt(value));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <input
      dir="ltr"
      inputMode="decimal"
      aria-label={ariaLabel}
      aria-invalid={Boolean(error) || undefined}
      disabled={disabled}
      autoFocus={autoFocus}
      placeholder={placeholder}
      value={text}
      onKeyDown={onKeyDown}
      onChange={(e) => {
        const shown = money ? maskMoneyTyping(e.target.value) : e.target.value;
        setText(shown);
        const n = parseNumberInput(shown);
        last.current = n;
        onChange(n);
      }}
      className={`${fieldClass} text-start tabular-nums`}
    />
  );
}
