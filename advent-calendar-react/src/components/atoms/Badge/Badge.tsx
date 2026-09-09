import styles from './Badge.module.css';

export function Badge() {
  return (
    <span className={styles.badge} data-variant="today">
      Hoje
    </span>
  );
}
