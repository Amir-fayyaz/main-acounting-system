import * as React from 'react';

/**
 * Controlled/uncontrolled state in one hook.
 * - `value !== undefined` → controlled (the parent owns the state, `onChange` is called)
 * - otherwise internal state is used, and `onChange` is still notified.
 * The setter accepts a value or an updater, and always reads the latest value.
 */
export function useControllableState<T>(
  value: T | undefined,
  defaultValue: T,
  onChange?: (next: T) => void,
): readonly [T, (next: T | ((prev: T) => T)) => void] {
  const [inner, setInner] = React.useState<T>(defaultValue);
  const isControlled = value !== undefined;
  const current = isControlled ? (value as T) : inner;

  const latest = React.useRef(current);
  latest.current = current;
  const onChangeRef = React.useRef(onChange);
  onChangeRef.current = onChange;

  const set = React.useCallback(
    (next: T | ((prev: T) => T)) => {
      const resolved = typeof next === 'function' ? (next as (prev: T) => T)(latest.current) : next;
      if (Object.is(resolved, latest.current)) return;
      latest.current = resolved;
      if (!isControlled) setInner(resolved);
      onChangeRef.current?.(resolved);
    },
    [isControlled],
  );

  return [current, set] as const;
}
