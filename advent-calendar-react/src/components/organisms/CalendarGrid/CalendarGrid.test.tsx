import { render, screen, fireEvent } from '@testing-library/react';
import { CalendarGrid, type CalendarGridItem } from './CalendarGrid';
import { CALENDAR } from '../../../data/calendar';
import { getDayState } from '../../../lib/dayState';

const items: CalendarGridItem[] = CALENDAR.map((day) => ({
  day,
  state: getDayState(day.day, 5, new Set()),
}));

test('renders one door per calendar day', () => {
  render(<CalendarGrid items={items} onOpen={vi.fn()} />);
  expect(screen.getAllByRole('button')).toHaveLength(25);
});

test('forwards onOpen with the clicked day number', () => {
  const onOpen = vi.fn();
  render(<CalendarGrid items={items} onOpen={onOpen} />);
  fireEvent.click(screen.getByRole('button', { name: 'Dia 5, hoje — abrir' }));
  expect(onOpen).toHaveBeenCalledWith(5);
});

test('applies the grid class', () => {
  const { container } = render(<CalendarGrid items={items} onOpen={vi.fn()} />);
  expect(container.firstChild).toHaveClass('grid');
});
