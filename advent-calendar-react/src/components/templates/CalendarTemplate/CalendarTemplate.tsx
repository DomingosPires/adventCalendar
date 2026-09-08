import type { ReactNode } from 'react';
import { Snow } from '../../atoms/Snow';
import styles from './CalendarTemplate.module.css';

export interface CalendarTemplateProps {
  header: ReactNode;
  grid: ReactNode;
  dialog: ReactNode;
}

export function CalendarTemplate({ header, grid, dialog }: CalendarTemplateProps) {
  return (
    <div className={styles.page}>
      <div className={styles.background} aria-hidden="true" />
      <Snow />
      <main className={styles.content}>
        {header}
        {grid}
      </main>
      {dialog}
    </div>
  );
}
