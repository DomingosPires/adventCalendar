import { render, screen } from '@testing-library/react';
import { Badge } from './Badge';

test('renders the "Hoje" badge', () => {
  render(<Badge />);
  const el = screen.getByText('Hoje');
  expect(el).toHaveClass('badge');
  expect(el).toHaveAttribute('data-variant', 'today');
});
