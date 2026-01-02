/**
 * Tests for useDebounce hook
 * @jest-environment jsdom
 */

import { renderHook, act } from '@testing-library/react';
import { useDebounce, useDebouncedCallback } from '@/lib/hooks/useDebounce';

// Mock timers
jest.useFakeTimers();

describe('useDebounce', () => {
  afterEach(() => {
    jest.clearAllTimers();
  });

  it('should return initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('initial', 500));
    expect(result.current).toBe('initial');
  });

  it('should debounce value updates', () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 500), {
      initialProps: { value: 'initial' },
    });

    expect(result.current).toBe('initial');

    // Update value
    rerender({ value: 'updated' });

    // Value should still be initial
    expect(result.current).toBe('initial');

    // Fast forward time
    act(() => {
      jest.advanceTimersByTime(500);
    });

    // Now value should be updated
    expect(result.current).toBe('updated');
  });

  it('should cancel pending updates when value changes rapidly', () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 500), {
      initialProps: { value: 'initial' },
    });

    // Rapid updates
    rerender({ value: 'update1' });
    act(() => {
      jest.advanceTimersByTime(200);
    });

    rerender({ value: 'update2' });
    act(() => {
      jest.advanceTimersByTime(200);
    });

    rerender({ value: 'final' });

    // Still initial because delay hasn't passed
    expect(result.current).toBe('initial');

    // Complete the delay
    act(() => {
      jest.advanceTimersByTime(500);
    });

    // Should have the final value
    expect(result.current).toBe('final');
  });

  it('should handle number values', () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 300), {
      initialProps: { value: 0 },
    });

    expect(result.current).toBe(0);

    rerender({ value: 42 });

    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(result.current).toBe(42);
  });

  it('should handle object values', () => {
    const initialObj = { foo: 'bar' };
    const updatedObj = { foo: 'baz' };

    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 500), {
      initialProps: { value: initialObj },
    });

    expect(result.current).toBe(initialObj);

    rerender({ value: updatedObj });

    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(result.current).toBe(updatedObj);
  });
});

describe('useDebouncedCallback', () => {
  afterEach(() => {
    jest.clearAllTimers();
  });

  it('should debounce callback calls', () => {
    const callback = jest.fn();

    const { result } = renderHook(() => useDebouncedCallback(callback, 500));

    // Call multiple times
    result.current('a');
    result.current('b');
    result.current('c');

    // Callback should not have been called yet
    expect(callback).not.toHaveBeenCalled();

    // Fast forward time
    act(() => {
      jest.advanceTimersByTime(500);
    });

    // Callback should have been called once with last args
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith('c');
  });

  it('should handle multiple arguments', () => {
    const callback = jest.fn();

    const { result } = renderHook(() => useDebouncedCallback(callback, 300));

    result.current('arg1', 'arg2', { key: 'value' });

    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(callback).toHaveBeenCalledWith('arg1', 'arg2', { key: 'value' });
  });

  it('should reset timer on each call', () => {
    const callback = jest.fn();

    const { result } = renderHook(() => useDebouncedCallback(callback, 500));

    result.current('first');

    // Advance partially
    act(() => {
      jest.advanceTimersByTime(300);
    });

    // Call again - should reset timer
    result.current('second');

    // Advance to what would have been the first timeout
    act(() => {
      jest.advanceTimersByTime(200);
    });

    // Should not have been called yet
    expect(callback).not.toHaveBeenCalled();

    // Complete the new delay
    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith('second');
  });
});
