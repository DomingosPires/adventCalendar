import { render, screen, fireEvent } from '@testing-library/react';
import { DayDialog } from './DayDialog';
import type { CalendarDay } from '../../../data/calendar';

const withCode: CalendarDay = {
  day: 5, title: 'Receita rápida', message: 'Chocolate quente.',
  code: 'COZINHA-05', image: 'gift5', size: '2x1',
  gridArea: 'a', gridAreaMobile: 'a',
};
const noCode: CalendarDay = { ...withCode, day: 6, title: 'Pausa', code: undefined };

test('opens the dialog and shows title + message when day is set', () => {
  const showModal = vi.spyOn(HTMLDialogElement.prototype, 'showModal');
  render(<DayDialog day={withCode} onClose={vi.fn()} />);
  expect(showModal).toHaveBeenCalled();
  expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Receita rápida');
  expect(screen.getByText('Chocolate quente.')).toBeInTheDocument();
});

test('renders CopyableCode only when the day has a code', () => {
  const { rerender } = render(<DayDialog day={withCode} onClose={vi.fn()} />);
  expect(screen.getByRole('button', { name: 'Copiar' })).toBeInTheDocument();
  rerender(<DayDialog day={noCode} onClose={vi.fn()} />);
  expect(screen.queryByRole('button', { name: 'Copiar' })).not.toBeInTheDocument();
});

test('calls close() when day goes back to null', () => {
  const close = vi.spyOn(HTMLDialogElement.prototype, 'close');
  const { rerender } = render(<DayDialog day={withCode} onClose={vi.fn()} />);
  rerender(<DayDialog day={null} onClose={vi.fn()} />);
  expect(close).toHaveBeenCalled();
});

test('"Fechar" button calls onClose', () => {
  const onClose = vi.fn();
  render(<DayDialog day={withCode} onClose={onClose} />);
  fireEvent.click(screen.getByRole('button', { name: 'Fechar' }));
  expect(onClose).toHaveBeenCalledTimes(1);
});

test('the cancel (Esc) event calls onClose', () => {
  const onClose = vi.fn();
  const { container } = render(<DayDialog day={withCode} onClose={onClose} />);
  fireEvent(container.querySelector('dialog') as HTMLDialogElement, new Event('cancel'));
  expect(onClose).toHaveBeenCalledTimes(1);
});

test('a backdrop click (on the dialog element itself) calls onClose', () => {
  const onClose = vi.fn();
  const { container } = render(<DayDialog day={withCode} onClose={onClose} />);
  fireEvent.click(container.querySelector('dialog') as HTMLDialogElement);
  expect(onClose).toHaveBeenCalledTimes(1);
});
