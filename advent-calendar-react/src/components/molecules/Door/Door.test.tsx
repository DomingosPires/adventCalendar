import { render, screen, fireEvent } from '@testing-library/react';
import { Door } from './Door';
import type { CalendarDay } from '../../../data/calendar';

const day: CalendarDay = {
  day: 5,
  title: 'Receita rápida',
  message: 'Chocolate quente.',
  code: 'COZINHA-05',
  motif: 'candle',
  size: '2x1',
  gridArea: '2 / 3 / span 2 / span 1',
  gridAreaMobile: '2 / 3 / span 2 / span 1',
};

function mockReducedMotion(matches: boolean) {
  vi.spyOn(window, 'matchMedia').mockImplementation((q: string) => ({
    matches, media: q, onchange: null,
    addListener: () => {}, removeListener: () => {},
    addEventListener: () => {}, removeEventListener: () => {},
    dispatchEvent: () => false,
  }) as MediaQueryList);
}

afterEach(() => vi.restoreAllMocks());

test.each([
  ['locked', 'Dia 5, por abrir mais tarde'],
  ['today', 'Dia 5, hoje'],
  ['past', 'Dia 5, por abrir'],
  ['opened', 'Dia 5, aberto — ver de novo'],
] as const)('state %s has data-state and aria-label', (state, label) => {
  render(<Door day={day} state={state} onOpen={vi.fn()} />);
  const btn = screen.getByRole('button');
  expect(btn).toHaveAttribute('data-state', state);
  expect(btn).toHaveAccessibleName(label);
});

test('only the today state renders a badge', () => {
  const { rerender } = render(<Door day={day} state="locked" onOpen={vi.fn()} />);
  expect(screen.queryByText('Hoje')).not.toBeInTheDocument();
  rerender(<Door day={day} state="today" onOpen={vi.fn()} />);
  expect(screen.getByText('Hoje')).toBeInTheDocument();
  rerender(<Door day={day} state="past" onOpen={vi.fn()} />);
  expect(screen.queryByText('Hoje')).not.toBeInTheDocument();
  rerender(<Door day={day} state="opened" onOpen={vi.fn()} />);
  expect(screen.queryByText('Hoje')).not.toBeInTheDocument();
});

test('an opened door carries the opened class; others do not', () => {
  const { rerender } = render(<Door day={day} state="opened" onOpen={vi.fn()} />);
  expect(screen.getByRole('button')).toHaveClass('opened');
  rerender(<Door day={day} state="past" onOpen={vi.fn()} />);
  expect(screen.getByRole('button')).not.toHaveClass('opened');
});

test('clicking a locked door shakes and does not call onOpen', () => {
  mockReducedMotion(false);
  const onOpen = vi.fn();
  render(<Door day={day} state="locked" onOpen={onOpen} />);
  const btn = screen.getByRole('button');
  fireEvent.click(btn);
  expect(btn).toHaveClass('shake');
  expect(onOpen).not.toHaveBeenCalled();
  fireEvent.animationEnd(btn);
  expect(btn).not.toHaveClass('shake');
});

test('locked door under reduced motion does not add the shake class', () => {
  mockReducedMotion(true);
  render(<Door day={day} state="locked" onOpen={vi.fn()} />);
  const btn = screen.getByRole('button');
  fireEvent.click(btn);
  expect(btn).not.toHaveClass('shake');
});

test.each(['today', 'past', 'opened'] as const)(
  'clicking a %s door calls onOpen with the day number and its rect',
  (state) => {
    const onOpen = vi.fn();
    render(<Door day={day} state={state} onOpen={onOpen} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onOpen).toHaveBeenCalledWith(
      5,
      expect.objectContaining({
        top: expect.any(Number),
        left: expect.any(Number),
        width: expect.any(Number),
        height: expect.any(Number),
      }),
    );
  },
);

test.each(['locked', 'today', 'past', 'opened'] as const)(
  'the day number is shown on the %s door',
  (state) => {
    render(<Door day={day} state={state} onOpen={vi.fn()} />);
    expect(screen.getByText('5')).toBeInTheDocument();
  },
);

test('exposes the grid-area custom properties', () => {
  render(<Door day={day} state="today" onOpen={vi.fn()} />);
  const btn = screen.getByRole('button');
  expect(btn.style.getPropertyValue('--grid-area')).toBe('2 / 3 / span 2 / span 1');
  expect(btn.style.getPropertyValue('--grid-area-mobile')).toBe('2 / 3 / span 2 / span 1');
});
