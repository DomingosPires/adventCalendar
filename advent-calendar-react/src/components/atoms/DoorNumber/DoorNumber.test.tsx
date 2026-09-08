import { render, screen } from '@testing-library/react';
import { DoorNumber } from './DoorNumber';

test('renders the day number', () => {
  render(<DoorNumber value={7} size="1x1" />);
  expect(screen.getByText('7')).toHaveClass('number');
});

test('adds a size-specific class', () => {
  render(<DoorNumber value={16} size="2x2" />);
  expect(screen.getByText('16')).toHaveClass('size-2x2');
});
