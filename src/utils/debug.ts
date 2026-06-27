import { useRef } from 'react';

/**
 * RAII-style scoped timer.
 * One line at function start: `using _ = new ScopedTimer('label');`
 * Logs elapsed time when scope exits.
 *
 * Requires TypeScript 5.2+ and `ESNext.Disposable` in tsconfig lib.
 */
export class ScopedTimer implements Disposable {
  #label: string;
  #start: number;

  constructor(label: string) {
    this.#label = label;
    this.#start = performance.now();
  }

  [Symbol.dispose]() {
    console.debug(`[${this.#label}] ${(performance.now() - this.#start).toFixed(2)}ms`);
  }
}

/**
 * Wraps a sync function with a timer.
 * `const result = withTimer('label', () => ...);`
 */
export function withTimer<T>(label: string, fn: () => T): T {
  using _ = new ScopedTimer(label);
  return fn();
}

/**
 * Safely serializes a value to JSON, replacing circular references and
 * non-serializable values (functions, React elements, etc.) with placeholders.
 */
function safeStringify(value: unknown): string {
  const seen = new WeakSet();
  try {
    return JSON.stringify(value, (_key, val) => {
      if (val !== null && typeof val === 'object') {
        if (seen.has(val)) {
          return '[Circular]';
        }
        seen.add(val);
      }
      if (typeof val === 'function') {
        return '[Function]';
      }
      if (typeof val === 'symbol') {
        return '[Symbol]';
      }
      return val;
    });
  } catch {
    return '[Unserializable]';
  }
}

/**
 * Logs which props changed to cause a React.memo re-render.
 * Must be called directly at the top of a component body (not inside a hook conditionally).
 *
 *   useWhyDidYouUpdate('MyComponent', props);
 */
export function useWhyDidYouUpdate(name: string, props: Record<string, unknown>) {
  const prevRef = useRef<Record<string, unknown> | null>(null);
  const logCountRef = useRef(0);

  const prev = prevRef.current;
  const changed: string[] = [];
  if (prev) {
    const allKeys = new Set([...Object.keys(prev), ...Object.keys(props)]);
    for (const key of allKeys) {
      if (prev[key] !== props[key]) {
        changed.push(`${key}: ${safeStringify(prev[key])} -> ${safeStringify(props[key])}`);
      }
    }
  }
  if (changed.length > 0 && logCountRef.current < 5) {
    logCountRef.current++;
    console.debug(`[${name}] re-render caused by:`, changed);
  }
  prevRef.current = { ...props };
}
