import { useEffect, useRef, type MouseEvent } from 'react';
import { Button } from '../../atoms/Button';
import { CopyableCode } from '../../molecules/CopyableCode';
import type { CalendarDay } from '../../../data/calendar';
import styles from './DayDialog.module.css';

export interface DayDialogProps {
  day: CalendarDay | null;
  onClose: () => void;
}

export function DayDialog({ day, onClose }: DayDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (day && !dialog.open) dialog.showModal();
    if (!day && dialog.open) dialog.close();
  }, [day]);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const handleCancel = (event: Event) => {
      event.preventDefault();
      onClose();
    };
    const handleClose = () => onClose();
    dialog.addEventListener('cancel', handleCancel);
    dialog.addEventListener('close', handleClose);
    return () => {
      dialog.removeEventListener('cancel', handleCancel);
      dialog.removeEventListener('close', handleClose);
    };
  }, [onClose]);

  const handleBackdrop = (event: MouseEvent<HTMLDialogElement>) => {
    if (event.target === ref.current) onClose();
  };

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      onClick={handleBackdrop}
      aria-labelledby="day-dialog-title"
    >
      {day && (
        <div className={`${styles.body} ${styles[`size-${day.size}`]}`}>
          <p className={styles.day}>{day.day}</p>
          <h2 id="day-dialog-title" className={styles.title}>
            {day.title}
          </h2>
          <p className={styles.message}>{day.message}</p>
          {day.code && <CopyableCode code={day.code} />}
          <Button variant="ghost" className={styles.close} onClick={onClose}>
            Fechar
          </Button>
        </div>
      )}
    </dialog>
  );
}
