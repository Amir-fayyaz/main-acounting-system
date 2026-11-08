'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@repo/web/ui';

/** Radix Select rejects an empty `SelectItem` value, so "all" uses a sentinel. */
const ALL_VALUE = '__all__';

export type StatusOption = {
  /** Raw status value written to the URL. */
  value: string;
  /** Persian label rendered in the dropdown. */
  label: string;
};

export type StatusFilterProps = {
  /** Current URL status; an empty string selects the "all" option. */
  value: string;
  options: readonly StatusOption[];
  /** Receives the selected status, or `''` when the filter is cleared. */
  onChange: (value: string) => void;
  /** Field name used in the "all" option label. Defaults to `وضعیت`. */
  fieldLabel?: string;
  /** Label for the unfiltered option. Defaults to `همه`. */
  allLabel?: string;
  'aria-label'?: string;
};

/** Prototype status `<select>`: first option clears the filter, values map to URLs. */
export function StatusFilter({
  value,
  options,
  onChange,
  fieldLabel = 'وضعیت',
  allLabel = 'همه',
  'aria-label': ariaLabel,
}: StatusFilterProps) {
  return (
    <Select
      value={value || ALL_VALUE}
      onValueChange={(next) => onChange(next === ALL_VALUE ? '' : next)}
    >
      <SelectTrigger aria-label={ariaLabel ?? fieldLabel}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL_VALUE}>{`${fieldLabel}: ${allLabel}`}</SelectItem>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
