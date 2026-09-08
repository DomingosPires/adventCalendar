import type { DoorSize } from '../../../data/calendar';
import styles from './DoorNumber.module.css';

export interface DoorNumberProps {
  value: number;
  size: DoorSize;
}

export function DoorNumber({ value, size }: DoorNumberProps) {
  return (
    <span className={`${styles.number} ${styles[`size-${size}`]}`}>{value}</span>
  );
}
