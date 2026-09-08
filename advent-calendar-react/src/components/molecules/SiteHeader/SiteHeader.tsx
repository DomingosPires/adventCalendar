import styles from './SiteHeader.module.css';

export interface SiteHeaderProps {
  title: string;
  subtitle: string;
}

export function SiteHeader({ title, subtitle }: SiteHeaderProps) {
  return (
    <header className={styles.header}>
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.subtitle}>{subtitle}</p>
    </header>
  );
}
