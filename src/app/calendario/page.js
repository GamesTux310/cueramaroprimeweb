'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ActivityCalendar from '@/components/ActivityCalendar';
import styles from './page.module.css';

export default function CalendarioPage() {
  const router = useRouter();

  return (
    <main className="main-content">
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <Link href="/" className={styles.backButton}>
            ← Regresar
          </Link>
          <div className={styles.titleContainer}>
            <span className={styles.icon}>📅</span>
            <div>
              <h1>Calendario Global</h1>
              <p>Vista unificada de todas las operaciones</p>
            </div>
          </div>
        </div>
      </header>

      <section className={styles.calendarContainer}>
        <ActivityCalendar 
          type="general" 
          onClose={() => router.push('/')}
        />
      </section>
    </main>
  );
}
