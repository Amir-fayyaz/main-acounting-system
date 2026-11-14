import * as React from 'react';

/** Stable debounced function; flushes nothing on unmount (pending call is dropped). */
export function useDebouncedCallback<A extends unknown[]>(fn: (...args: A) => void, delay: number) {
  const fnRef = React.useRef(fn);
  fnRef.current = fn;
  const timer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  React.useEffect(() => () => clearTimeout(timer.current), []);

  return React.useMemo(() => {
    const debounced = (...args: A) => {
      clearTimeout(timer.current);
      timer.current = setTimeout(() => fnRef.current(...args), delay);
    };
    debounced.cancel = () => clearTimeout(timer.current);
    return debounced;
  }, [delay]);
}
