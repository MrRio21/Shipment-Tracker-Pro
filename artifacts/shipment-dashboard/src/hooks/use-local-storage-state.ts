import { useCallback, useSyncExternalStore } from "react";

type Listener = () => void;

const listeners = new Map<string, Set<Listener>>();
const cache = new Map<string, unknown>();

function read<T>(key: string, fallback: T): T {
  if (cache.has(key)) return cache.get(key) as T;
  try {
    const raw = window.localStorage.getItem(key);
    const value = raw ? (JSON.parse(raw) as T) : fallback;
    cache.set(key, value);
    return value;
  } catch (err) {
    console.error(err);
    cache.set(key, fallback);
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(err);
  }
  cache.set(key, value);
  listeners.get(key)?.forEach((l) => l());
}

function subscribe(key: string, listener: Listener): () => void {
  if (!listeners.has(key)) listeners.set(key, new Set());
  listeners.get(key)!.add(listener);

  const onStorage = (e: StorageEvent) => {
    if (e.key === key) {
      cache.delete(key);
      listener();
    }
  };
  window.addEventListener("storage", onStorage);

  return () => {
    listeners.get(key)?.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function useLocalStorageState<T>(key: string, fallback: T) {
  const sub = useCallback((cb: Listener) => subscribe(key, cb), [key]);
  const getSnapshot = useCallback(() => read<T>(key, fallback), [key, fallback]);
  const value = useSyncExternalStore(sub, getSnapshot, getSnapshot);
  const setValue = useCallback(
    (next: T | ((prev: T) => T)) => {
      const current = read<T>(key, fallback);
      const nextVal =
        typeof next === "function" ? (next as (p: T) => T)(current) : next;
      write(key, nextVal);
    },
    [key, fallback],
  );
  return [value, setValue] as const;
}
