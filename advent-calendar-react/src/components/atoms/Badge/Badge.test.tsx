import { render, screen } from '@testing-library/react';
import { Badge } from './Badge';

test('today badge shows "Hoje"', () => {
  render(<Badge variant="today" />);
  const el = screen.getByText('Hoje');
  expect(el).toHaveAttribute('data-variant', 'today');
  expect(el).toHaveClass('badge', 'today');
});

test('opened badge shows a check and "Aberto"', () => {
  render(<Badge variant="opened" />);
  expect(screen.getByText(/Aberto/)).toHaveAttribute('data-variant', 'opened');
  expect(screen.getByText(/^✓/)).toBeInTheDocument();
});

test('available badge shows "Abrir"', () => {
  render(<Badge variant="available" />);
  expect(screen.getByText('Abrir')).toHaveAttribute('data-variant', 'available');
});
