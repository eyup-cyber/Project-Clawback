/**
 * useDebounce Hook
 * Debounces a value with configurable delay
 */

import { useEffect, useState } from 'react';

/**
 * Debounces a value by delaying updates until after wait milliseconds
 * have elapsed since the last time the value changed.
 *
 * @param value - The value to debounce
 * @param delay - The delay in milliseconds
 * @returns The debounced value
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Set up a timer to update the debounced value after the delay
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Clean up the timer if the value changes before the delay has passed
    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Creates a debounced function that delays invoking func until after
 * wait milliseconds have elapsed since the last time the function was invoked.
 *
 * @param func - The function to debounce
 * @param delay - The delay in milliseconds
 * @returns The debounced function
 */
export function useDebouncedCallback<T extends (...args: unknown[]) => unknown>(
  func: T,
  delay: number
): T {
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [timeoutId]);

  const debouncedFunc = ((...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    const newTimeoutId = setTimeout(() => {
      func(...args);
    }, delay);

    setTimeoutId(newTimeoutId);
  }) as T;

  return debouncedFunc;
}

export default useDebounce;
