'use client';

/**
 * Client-side cart (localStorage-backed).
 *
 * The cart stores product ids, modifier option ids and client-known
 * prices for display only — the server reloads products and recomputes
 * every amount at checkout.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

export interface CartModifier {
  optionId: string;
  groupId: string;
  groupName: string;
  optionName: string;
  priceDeltaCents: number;
}

export interface CartLine {
  /** Stable line key: itemId + sorted option ids. */
  key: string;
  menuItemId: string;
  itemName: string;
  unitPriceCents: number; // display only — server recomputes
  quantity: number;
  modifierOptionIds: string[];
  modifiers: CartModifier[];
  specialInstructions?: string;
}

interface CartContextValue {
  lines: CartLine[];
  count: number;
  displaySubtotalCents: number;
  addItem: (line: Omit<CartLine, 'key' | 'quantity'> & { quantity?: number }) => void;
  updateQuantity: (key: string, quantity: number) => void;
  removeLine: (key: string) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = 'savora-cart-v1';

function lineKey(menuItemId: string, modifierOptionIds: string[]): string {
  return `${menuItemId}:${[...modifierOptionIds].sort().join(',')}`;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const clearRequested = useRef(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as CartLine[];
        if (Array.isArray(parsed) && !clearRequested.current) {
          // Deliberate one-time hydration from localStorage; runs exactly
          // once after mount, so no cascading renders.
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setLines(parsed);
        }
      }
    } catch {
      // corrupted storage — start empty
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      if (lines.length === 0) {
        window.localStorage.removeItem(STORAGE_KEY);
      } else {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
      }
    } catch {
      // storage full / unavailable — cart still works in memory
    }
  }, [lines, hydrated]);

  const addItem = useCallback((line: Omit<CartLine, 'key' | 'quantity'> & { quantity?: number }) => {
    const quantity = Math.min(Math.max(line.quantity ?? 1, 1), 10);
    const key = lineKey(line.menuItemId, line.modifierOptionIds);
    setLines((prev) => {
      const existing = prev.find((l) => l.key === key);
      if (existing) {
        return prev.map((l) =>
          l.key === key ? { ...l, quantity: Math.min(l.quantity + quantity, 10) } : l,
        );
      }
      return [...prev, { ...line, key, quantity }];
    });
  }, []);

  const updateQuantity = useCallback((key: string, quantity: number) => {
    setLines((prev) =>
      quantity <= 0
        ? prev.filter((l) => l.key !== key)
        : prev.map((l) => (l.key === key ? { ...l, quantity: Math.min(quantity, 10) } : l)),
    );
  }, []);

  const removeLine = useCallback((key: string) => {
    setLines((prev) => prev.filter((l) => l.key !== key));
  }, []);

  const clear = useCallback(() => {
    clearRequested.current = true;
    setLines([]);
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // storage unavailable — clearing in memory still works
    }
  }, []);

  const value = useMemo<CartContextValue>(() => {
    const count = lines.reduce((sum, l) => sum + l.quantity, 0);
    const displaySubtotalCents = lines.reduce(
      (sum, l) => sum + l.unitPriceCents * l.quantity,
      0,
    );
    return { lines, count, displaySubtotalCents, addItem, updateQuantity, removeLine, clear };
  }, [lines, addItem, updateQuantity, removeLine, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>');
  return ctx;
}
