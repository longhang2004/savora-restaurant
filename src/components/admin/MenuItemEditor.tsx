'use client';

/**
 * Menu item editor: core fields + modifier group editor (add/edit/remove
 * groups and options). All mutations are server actions with
 * server-side admin authorization.
 */
import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import {
  deleteModifierGroupAction,
  saveModifierGroupAction,
  updateMenuItemAction,
} from '@/features/admin/actions';
import { formatCents } from '@/lib/money';
import type { AdminMenuItem } from '@/features/admin/queries';
import styles from './admin.module.css';

interface EditorGroup {
  id?: string;
  name: string;
  minSelections: number;
  maxSelections: number;
  isRequired: boolean;
  options: { id?: string; name: string; priceDeltaCents: number; isAvailable: boolean }[];
}

interface MenuItemEditorProps {
  item: AdminMenuItem;
  categories: { id: string; name: string }[];
}

export default function MenuItemEditor({ item, categories }: MenuItemEditorProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [form, setForm] = useState({
    name: item.name,
    description: item.description,
    priceCents: item.priceCents,
    categoryId: item.categoryId,
    isFeatured: item.isFeatured,
    isAvailable: item.isAvailable,
  });

  const [groups, setGroups] = useState<EditorGroup[]>(
    item.modifierGroups.map((g) => ({
      id: g.id,
      name: g.name,
      minSelections: g.minSelections,
      maxSelections: g.maxSelections,
      isRequired: g.isRequired,
      options: g.options.map((o) => ({
        id: o.id,
        name: o.name,
        priceDeltaCents: o.priceDeltaCents,
        isAvailable: o.isAvailable,
      })),
    })),
  );

  const saveItem = () => {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await updateMenuItemAction({ itemId: item.id, ...form });
      if (result.ok) {
        setSaved(true);
        router.refresh();
      } else {
        setError(result.error.message);
      }
    });
  };

  const saveGroup = (index: number) => {
    const group = groups[index];
    if (!group || group.name.trim().length === 0) return;
    setError(null);
    startTransition(async () => {
      const result = await saveModifierGroupAction({
        itemId: item.id,
        groupId: group.id,
        name: group.name,
        minSelections: group.minSelections,
        maxSelections: group.maxSelections,
        isRequired: group.isRequired,
        options: group.options,
      });
      if (result.ok) {
        router.refresh();
      } else {
        setError(result.error.message);
      }
    });
  };

  const deleteGroup = (index: number) => {
    const group = groups[index];
    if (!group?.id) {
      setGroups((prev) => prev.filter((_, i) => i !== index));
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await deleteModifierGroupAction({ groupId: group.id! });
      if (result.ok) {
        router.refresh();
      } else {
        setError(result.error.message);
      }
    });
  };

  const addGroup = () =>
    setGroups((prev) => [
      ...prev,
      {
        name: 'New Group',
        minSelections: 1,
        maxSelections: 1,
        isRequired: true,
        options: [{ name: 'Option', priceDeltaCents: 0, isAvailable: true }],
      },
    ]);

  const updateGroup = (index: number, patch: Partial<EditorGroup>) =>
    setGroups((prev) => prev.map((g, i) => (i === index ? { ...g, ...patch } : g)));

  const updateOption = (groupIndex: number, optionIndex: number, patch: Partial<EditorGroup['options'][number]>) =>
    setGroups((prev) =>
      prev.map((g, gi) =>
        gi === groupIndex
          ? {
              ...g,
              options: g.options.map((o, oi) => (oi === optionIndex ? { ...o, ...patch } : o)),
            }
          : g,
      ),
    );

  return (
    <div className={styles.twoCol}>
      {/* Core fields */}
      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Details</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
          <label className={styles.field}>
            <span className={styles.label}>Name</span>
            <input
              className={styles.input}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Description</span>
            <textarea
              className={styles.input}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
            <label className={styles.field}>
              <span className={styles.label}>Price (VND)</span>
              <input
                type="number"
                min={0}
                className={styles.input}
                value={form.priceCents}
                onChange={(e) => setForm({ ...form, priceCents: Number(e.target.value) })}
              />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Category</span>
              <select
                className={styles.input}
                value={form.categoryId}
                onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            <label className={styles.field} style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="checkbox"
                checked={form.isFeatured}
                onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })}
              />
              <span className={styles.label} style={{ textTransform: 'none' }}>
                Signature (featured)
              </span>
            </label>
            <label className={styles.field} style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="checkbox"
                checked={form.isAvailable}
                onChange={(e) => setForm({ ...form, isAvailable: e.target.checked })}
              />
              <span className={styles.label} style={{ textTransform: 'none' }}>
                Available for order
              </span>
            </label>
          </div>
          <p className={styles.muted}>
            Display price: {formatCents(form.priceCents)} — plus modifier deltas at checkout
            (server-computed).
          </p>
          {error && (
            <p className={styles.errorText} role="alert">
              {error}
            </p>
          )}
          {saved && <p className={styles.muted} style={{ color: '#7cc98a' }}>Saved ✓</p>}
          <button className={styles.primaryBtn} disabled={pending} onClick={saveItem}>
            {pending ? <Loader2 size={15} className={styles.spinner} /> : 'Save Item'}
          </button>
        </div>
      </div>

      {/* Modifier groups */}
      <div className={styles.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className={styles.cardTitle} style={{ margin: 0 }}>
            Modifier Groups
          </h2>
          <button className={styles.actionBtn} onClick={addGroup}>
            <Plus size={13} /> Add Group
          </button>
        </div>

        {groups.length === 0 && <p className={styles.muted}>No modifiers — item is sold as-is.</p>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '1rem' }}>
          {groups.map((group, gi) => (
            <div key={group.id ?? `new-${gi}`} style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '1rem' }}>
              <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                  className={styles.input}
                  style={{ flex: 1, minWidth: '140px' }}
                  value={group.name}
                  onChange={(e) => updateGroup(gi, { name: e.target.value })}
                />
                <label className={styles.field} style={{ flexDirection: 'row', alignItems: 'center', gap: '0.3rem' }}>
                  <input
                    type="checkbox"
                    checked={group.isRequired}
                    onChange={(e) => updateGroup(gi, { isRequired: e.target.checked })}
                  />
                  <span className={styles.muted}>required</span>
                </label>
                <label className={styles.field} style={{ flexDirection: 'row', alignItems: 'center', gap: '0.3rem' }}>
                  <span className={styles.muted}>min</span>
                  <input
                    type="number"
                    min={0}
                    max={10}
                    className={styles.input}
                    style={{ width: '64px', padding: '0.35rem 0.5rem' }}
                    value={group.minSelections}
                    onChange={(e) => updateGroup(gi, { minSelections: Number(e.target.value) })}
                  />
                </label>
                <label className={styles.field} style={{ flexDirection: 'row', alignItems: 'center', gap: '0.3rem' }}>
                  <span className={styles.muted}>max</span>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    className={styles.input}
                    style={{ width: '64px', padding: '0.35rem 0.5rem' }}
                    value={group.maxSelections}
                    onChange={(e) => updateGroup(gi, { maxSelections: Number(e.target.value) })}
                  />
                </label>
                <button className={`${styles.actionBtn} ${styles.actionDanger}`} onClick={() => deleteGroup(gi)}>
                  <Trash2 size={13} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.75rem' }}>
                {group.options.map((option, oi) => (
                  <div key={option.id ?? `new-opt-${oi}`} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input
                      className={styles.input}
                      style={{ flex: 1 }}
                      value={option.name}
                      onChange={(e) => updateOption(gi, oi, { name: e.target.value })}
                    />
                    <input
                      type="number"
                      className={styles.input}
                      style={{ width: '110px' }}
                      value={option.priceDeltaCents}
                      onChange={(e) => updateOption(gi, oi, { priceDeltaCents: Number(e.target.value) })}
                      title="Price delta in VND"
                    />
                    <label className={styles.field} style={{ flexDirection: 'row', alignItems: 'center', gap: '0.3rem' }}>
                      <input
                        type="checkbox"
                        checked={option.isAvailable}
                        onChange={(e) => updateOption(gi, oi, { isAvailable: e.target.checked })}
                      />
                      <span className={styles.muted}>on</span>
                    </label>
                    <button
                      className={`${styles.actionBtn} ${styles.actionDanger}`}
                      onClick={() =>
                        setGroups((prev) =>
                          prev.map((g, i) =>
                            i === gi ? { ...g, options: g.options.filter((_, oi2) => oi2 !== oi) } : g,
                          ),
                        )
                      }
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
                <button
                  className={styles.actionBtn}
                  onClick={() =>
                    updateGroup(gi, {
                      options: [...group.options, { name: 'New Option', priceDeltaCents: 0, isAvailable: true }],
                    })
                  }
                >
                  <Plus size={13} /> Option
                </button>
              </div>

              <button
                className={styles.actionBtn}
                style={{ marginTop: '0.75rem' }}
                disabled={pending}
                onClick={() => saveGroup(gi)}
              >
                Save Group
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
