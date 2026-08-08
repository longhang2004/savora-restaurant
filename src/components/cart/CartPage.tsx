'use client';

import React from 'react';
import Link from 'next/link';
import { Minus, Plus, Trash2, ShoppingBag } from 'lucide-react';
import { formatCents } from '@/lib/money';
import { useCart } from '@/components/cart/CartProvider';
import ScrollReveal from '@/components/ui/ScrollReveal';
import Ornament from '@/components/ui/Ornament';
import styles from './CartPage.module.css';

export default function CartPage() {
  const { lines, displaySubtotalCents, updateQuantity, removeLine } = useCart();

  if (lines.length === 0) {
    return (
      <div className="container">
        <div className={styles.emptyWrap}>
          <ScrollReveal direction="up">
            <div className={styles.emptyIcon}>
              <ShoppingBag size={28} />
            </div>
            <h1 className={`${styles.emptyTitle} text-gradient`}>Your cart is empty</h1>
            <p className={styles.emptyText}>
              Explore the menu and add something unforgettable to your order.
            </p>
            <Link href="/menu" className={styles.emptyCta}>
              Browse the Menu
            </Link>
          </ScrollReveal>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <header className={styles.header}>
        <ScrollReveal direction="up">
          <span className={styles.kicker}>Your Selection</span>
          <Ornament />
          <h1 className={`${styles.title} text-gradient`}>Cart</h1>
        </ScrollReveal>
      </header>

      <div className={styles.grid}>
        <ScrollReveal direction="up" className={styles.linesCol}>
          <div className={`${styles.linesCard} glassmorphism`}>
            {lines.map((line) => (
              <div key={line.key} className={styles.line}>
                <div className={styles.lineInfo}>
                  <h3 className={styles.lineName}>{line.itemName}</h3>
                  {line.modifiers.length > 0 && (
                    <ul className={styles.lineMods}>
                      {line.modifiers.map((mod) => (
                        <li key={mod.optionId}>
                          {mod.optionName}
                          {mod.priceDeltaCents > 0 && (
                            <span className={styles.modDelta}>
                              +{formatCents(mod.priceDeltaCents)}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                  {line.specialInstructions && (
                    <p className={styles.lineNotes}>“{line.specialInstructions}”</p>
                  )}
                </div>

                <div className={styles.lineControls}>
                  <div className={styles.quantity}>
                    <button
                      onClick={() => updateQuantity(line.key, line.quantity - 1)}
                      aria-label="Decrease quantity"
                    >
                      <Minus size={13} />
                    </button>
                    <span aria-live="polite">{line.quantity}</span>
                    <button
                      onClick={() => updateQuantity(line.key, line.quantity + 1)}
                      aria-label="Increase quantity"
                    >
                      <Plus size={13} />
                    </button>
                  </div>
                  <span className={styles.lineTotal}>
                    {formatCents(line.unitPriceCents * line.quantity)}
                  </span>
                  <button
                    className={styles.removeBtn}
                    onClick={() => removeLine(line.key)}
                    aria-label={`Remove ${line.itemName}`}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </ScrollReveal>

        <ScrollReveal direction="right" className={styles.summaryCol}>
          <div className={`${styles.summaryCard} glassmorphism`}>
            <h2 className={styles.summaryTitle}>Order Summary</h2>
            <div className={styles.summaryRow}>
              <span>Subtotal</span>
              <span>{formatCents(displaySubtotalCents)}</span>
            </div>
            <p className={styles.summaryNote}>
              Delivery fee, tax and the final total are confirmed by our server at checkout.
            </p>
            <Link href="/checkout" className={styles.checkoutBtn}>
              Proceed to Checkout
            </Link>
            <Link href="/menu" className={styles.keepShopping}>
              Continue Browsing
            </Link>
          </div>
        </ScrollReveal>
      </div>
    </div>
  );
}
