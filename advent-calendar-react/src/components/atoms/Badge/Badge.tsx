import styles from './Badge.module.css';

export type BadgeVariant = 'today' | 'opened' | 'available';

const LABEL: Record<BadgeVariant, string> = {
  today: 'Hoje',
  opened: '✓ Aberto',
  available: 'Abrir',
};

export interface BadgeProps {
  variant: BadgeVariant;
}

export function Badge({ variant }: BadgeProps) {
  return (
    <span
      className={`${styles.badge} ${styles[variant]}`}
      data-variant={variant}
    >
      {LABEL[variant]}
    </span>
  );
}
