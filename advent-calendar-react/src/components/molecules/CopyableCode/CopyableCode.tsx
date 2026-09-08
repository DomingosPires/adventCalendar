import { useRef, useState } from 'react';
import { Button } from '../../atoms/Button';
import { copyText } from '../../../lib/clipboard';
import styles from './CopyableCode.module.css';

type Status = 'idle' | 'copied' | 'error';

export interface CopyableCodeProps {
  code: string;
}

export function CopyableCode({ code }: CopyableCodeProps) {
  const [status, setStatus] = useState<Status>('idle');
  const codeRef = useRef<HTMLSpanElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const handleCopy = async () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    const ok = await copyText(code);
    if (ok) {
      setStatus('copied');
      timeoutRef.current = setTimeout(() => setStatus('idle'), 2000);
      return;
    }
    setStatus('error');
    const node = codeRef.current;
    if (node) {
      const range = document.createRange();
      range.selectNodeContents(node);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
  };

  return (
    <div className={styles.wrap}>
      <span ref={codeRef} className={styles.code}>
        {code}
      </span>
      <Button variant="ghost" onClick={handleCopy}>
        Copiar
      </Button>
      {status === 'copied' && (
        <span role="status" className={styles.copied}>
          Copiado
        </span>
      )}
      {status === 'error' && (
        <span role="status" className={styles.error}>
          Não foi possível copiar
        </span>
      )}
    </div>
  );
}
