'use client';

/**
 * Modifier selection modal — product configuration before adding to cart.
 * Prices shown are display hints; the server recomputes at checkout.
 */
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Minus, Plus, X } from 'lucide-react';
import { formatCents } from '@/lib/money';
import type { PublicMenuItem, PublicModifierGroup } from '@/features/menu/queries';
import { useCart } from '@/components/cart/CartProvider';
import styles from './ModifierModal.module.css';

interface ModifierModalProps {
  item: PublicMenuItem;
  onClose: () => void;
}

export default function ModifierModal({ item, onClose }: ModifierModalProps) {
  const { addItem } = useCart();
  const [selection, setSelection] = useState<Record<string, string[]>>({});
  const [quantity, setQuantity] = useState(1);
  const [instructions, setInstructions] = useState('');
  const [triedSubmit, setTriedSubmit] = useState(false);

  // Lock body scroll while open + close on Escape.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const toggle = (group: PublicModifierGroup, optionId: string) => {
    setSelection((prev) => {
      const current = prev[group.id] ?? [];
      if (group.maxSelections === 1) {
        return { ...prev, [group.id]: current.includes(optionId) ? [] : [optionId] };
      }
      if (current.includes(optionId)) {
        return { ...prev, [group.id]: current.filter((id) => id !== optionId) };
      }
      if (current.length >= group.maxSelections) return prev;
      return { ...prev, [group.id]: [...current, optionId] };
    });
  };

  const missingRequired = item.modifierGroups.some((group) => {
    const selected = selection[group.id] ?? [];
    return selected.length < group.minSelections;
  });

  const selectedModifierPrice = item.modifierGroups.reduce((sum, group) => {
    const ids = selection[group.id] ?? [];
    return (
      sum +
      ids.reduce((acc, id) => {
        const option = group.options.find((o) => o.id === id);
        return acc + (option?.priceDeltaCents ?? 0);
      }, 0)
    );
  }, 0);

  const unitTotal = item.priceCents + selectedModifierPrice;

  const handleAdd = () => {
    setTriedSubmit(true);
    if (missingRequired) return;
    const modifierOptionIds = item.modifierGroups.flatMap((g) => selection[g.id] ?? []);
    const modifiers = item.modifierGroups.flatMap((group) =>
      (selection[group.id] ?? []).map((optionId) => {
        const option = group.options.find((o) => o.id === optionId)!;
        return {
          optionId,
          groupId: group.id,
          groupName: group.name,
          optionName: option.name,
          priceDeltaCents: option.priceDeltaCents,
        };
      }),
    );
    addItem({
      menuItemId: item.id,
      itemName: item.name,
      unitPriceCents: unitTotal,
      modifierOptionIds,
      modifiers,
      specialInstructions: instructions.trim() || undefined,
      quantity,
    });
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        className={styles.overlay}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-label={`Configure ${item.name}`}
      >
        <motion.div
          className={`${styles.modal} glassmorphism`}
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.97 }}
          transition={{ duration: 0.25 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className={styles.header}>
            <div>
              <h2 className={styles.title}>{item.name}</h2>
              <p className={styles.basePrice}>{formatCents(item.priceCents)}</p>
            </div>
            <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
              <X size={20} />
            </button>
          </div>

          <div className={styles.body}>
            {item.modifierGroups.length === 0 && (
              <p className={styles.noMods}>No options — just the classic.</p>
            )}

            {item.modifierGroups.map((group) => {
              const selected = selection[group.id] ?? [];
              const invalid = triedSubmit && selected.length < group.minSelections;
              return (
                <fieldset key={group.id} className={styles.group}>
                  <legend className={styles.groupTitle}>
                    {group.name}
                    <span className={styles.groupHint}>
                      {group.isRequired ? 'required' : 'optional'} · choose{' '}
                      {group.minSelections === group.maxSelections
                        ? group.minSelections
                        : `${group.minSelections}–${group.maxSelections}`}
                    </span>
                  </legend>
                  {group.options.map((option) => {
                    const checked = selected.includes(option.id);
                    const disabled = !option.isAvailable;
                    return (
                      <label
                        key={option.id}
                        className={`${styles.option} ${checked ? styles.optionChecked : ''} ${disabled ? styles.optionDisabled : ''}`}
                      >
                        <input
                          type={group.maxSelections === 1 ? 'radio' : 'checkbox'}
                          name={group.id}
                          checked={checked}
                          disabled={disabled}
                          onChange={() => toggle(group, option.id)}
                        />
                        <span className={styles.optionName}>{option.name}</span>
                        {option.priceDeltaCents > 0 && (
                          <span className={styles.optionPrice}>
                            +{formatCents(option.priceDeltaCents)}
                          </span>
                        )}
                      </label>
                    );
                  })}
                  {invalid && (
                    <p className={styles.groupError}>
                      Please choose at least {group.minSelections} option
                      {group.minSelections > 1 ? 's' : ''}.
                    </p>
                  )}
                </fieldset>
              );
            })}

            <label className={styles.instructionsLabel}>
              Special instructions
              <span className={styles.instructionsHint}>optional · 200 characters max</span>
              <textarea
                className={styles.instructions}
                value={instructions}
                maxLength={200}
                rows={2}
                placeholder="e.g. no coriander, extra broth…"
                onChange={(e) => setInstructions(e.target.value)}
              />
            </label>
          </div>

          <div className={styles.footer}>
            <div className={styles.quantity}>
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                aria-label="Decrease quantity"
                className={styles.qtyBtn}
              >
                <Minus size={14} />
              </button>
              <span className={styles.qtyValue} aria-live="polite">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.min(10, q + 1))}
                aria-label="Increase quantity"
                className={styles.qtyBtn}
              >
                <Plus size={14} />
              </button>
            </div>
            <button type="button" className={styles.addBtn} onClick={handleAdd}>
              Add · {formatCents(unitTotal * quantity)}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
