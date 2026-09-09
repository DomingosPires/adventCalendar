import { motion } from 'framer-motion';
import styles from './SiteHeader.module.css';

export interface SiteHeaderProps {
  title: string;
  subtitle: string;
}

export function SiteHeader({ title, subtitle }: SiteHeaderProps) {
  return (
    <motion.header
      className={styles.header}
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className={styles.titleRow}>
        <span className={styles.rule} aria-hidden="true" />
        <h1 className={styles.title}>{title}</h1>
        <span className={styles.rule} aria-hidden="true" />
      </div>
      <p className={styles.subtitle}>{subtitle}</p>
    </motion.header>
  );
}
