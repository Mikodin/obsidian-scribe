import { debounce } from 'mini-debounce';
import { useEffect, useMemo, useRef } from 'react';

export const useDebounce = (
  callback: () => void,
  timeMs: number,
): (() => void) => {
  const ref = useRef<() => void>();

  useEffect(() => {
    ref.current = callback;
  }, [callback]);

  const debouncedCallback = useMemo(() => {
    const func = () => {
      ref.current?.();
    };

    return debounce(func, timeMs);
  }, [timeMs]);

  return debouncedCallback;
};
