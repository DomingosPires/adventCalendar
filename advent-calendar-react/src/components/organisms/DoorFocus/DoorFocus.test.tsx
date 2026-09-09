import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { DoorFocus } from './DoorFocus';
import type { CalendarDay } from '../../../data/calendar';

// framer-motion memoises the reduced-motion preference the first time any
// component reads it, process-wide, so a per-test `window.matchMedia` spy alone
// never reaches `useReducedMotion`. Route the hook through matchMedia on every
// call so `mockReducedMotion` below actually toggles it. `motion` /
// `AnimatePresence` stay real.
vi.mock('framer-motion', async (importOriginal) => {
  const actual = await importOriginal<typeof import('framer-motion')>();
  return {
    ...actual,
    useReducedMotion: () =>
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true,
  };
});

const withCode: CalendarDay = {
  day: 8,
  title: 'Código secreto',
  message: 'Guarda o código.',
  code: 'ADVENTO-08',
  motif: 'gift',
  size: '1x1',
  gridArea: '1 / 1 / span 1 / span 1',
  gridAreaMobile: '1 / 1 / span 1 / span 1',
};
const noCode: CalendarDay = { ...withCode, day: 9, title: 'Luz das velas', message: 'Acende uma vela.', code: undefined };

function mockReducedMotion(matches: boolean) {
  vi.spyOn(window, 'matchMedia').mockImplementation((q: string) => ({
    matches: q.includes('reduce') ? matches : false,
    media: q, onchange: null,
    addListener: () => {}, removeListener: () => {},
    addEventListener: () => {}, removeEventListener: () => {},
    dispatchEvent: () => false,
  }) as MediaQueryList);
}

afterEach(() => vi.restoreAllMocks());

test('renders nothing when day is null', () => {
  render(<DoorFocus day={null} originRect={null} onClose={vi.fn()} />);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

test('shows the day content and links the title', () => {
  render(<DoorFocus day={withCode} originRect={null} onClose={vi.fn()} />);
  const dialog = screen.getByRole('dialog');
  const heading = screen.getByRole('heading', { level: 2 });
  expect(heading).toHaveTextContent('Código secreto');
  expect(dialog).toHaveAttribute('aria-labelledby', heading.id);
  expect(screen.getByText('Guarda o código.')).toBeInTheDocument();
  // The medallion renders the day numeral directly (self-contained, hashed-build safe).
  expect(within(dialog).getByText('8')).toBeInTheDocument();
});

test('renders the promo code only when the day has one', () => {
  const { rerender } = render(<DoorFocus day={withCode} originRect={null} onClose={vi.fn()} />);
  expect(screen.getByText('ADVENTO-08')).toBeInTheDocument();
  rerender(<DoorFocus day={noCode} originRect={null} onClose={vi.fn()} />);
  expect(screen.queryByText('ADVENTO-08')).not.toBeInTheDocument();
});

test('accepts an origin rect without crashing', () => {
  const rect = { top: 10, left: 10, width: 40, height: 40, right: 50, bottom: 50, x: 10, y: 10, toJSON() {} } as DOMRect;
  render(<DoorFocus day={withCode} originRect={rect} onClose={vi.fn()} />);
  expect(screen.getByRole('dialog')).toBeInTheDocument();
});

test('a rect origin still renders the code and content', () => {
  const rect = { top: 0, left: 0, width: 30, height: 30, right: 30, bottom: 30, x: 0, y: 0, toJSON() {} } as DOMRect;
  const { rerender } = render(<DoorFocus day={withCode} originRect={rect} onClose={vi.fn()} />);
  expect(screen.getByText('ADVENTO-08')).toBeInTheDocument();
  rerender(<DoorFocus day={noCode} originRect={rect} onClose={vi.fn()} />);
  expect(screen.queryByText('ADVENTO-08')).not.toBeInTheDocument();
  expect(screen.getByRole('dialog')).toHaveAttribute('data-reduced-motion', 'false');
});

test('close button, scrim press-and-release and Escape all call onClose; card click does not', () => {
  const onClose = vi.fn();
  render(<DoorFocus day={withCode} originRect={null} onClose={onClose} />);
  const scrim = screen.getByRole('dialog').parentElement as HTMLElement;
  fireEvent.click(screen.getByRole('button', { name: 'Fechar' }));
  fireEvent.mouseDown(scrim);
  fireEvent.click(scrim);
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(onClose).toHaveBeenCalledTimes(3);
  onClose.mockClear();
  fireEvent.click(screen.getByRole('dialog'));
  expect(onClose).not.toHaveBeenCalled();
});

test('a press that starts inside the card and releases on the scrim does not close', () => {
  const onClose = vi.fn();
  render(<DoorFocus day={withCode} originRect={null} onClose={onClose} />);
  const dialog = screen.getByRole('dialog');
  const scrim = dialog.parentElement as HTMLElement;
  // Drag: mousedown bubbles from the card, click lands on the scrim.
  fireEvent.mouseDown(dialog);
  fireEvent.click(scrim);
  expect(onClose).not.toHaveBeenCalled();
});

test('Tab and Shift+Tab wrap focus inside the dialog', () => {
  render(<DoorFocus day={withCode} originRect={null} onClose={vi.fn()} />);
  const dialog = screen.getByRole('dialog');
  const focusables = dialog.querySelectorAll<HTMLElement>(
    'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])',
  );
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  expect(first).not.toBe(last);

  last.focus();
  fireEvent.keyDown(dialog, { key: 'Tab' });
  expect(first).toHaveFocus();

  first.focus();
  fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true });
  expect(last).toHaveFocus();

  // Focus drifted outside the card: Tab pulls it back to the first control,
  // Shift+Tab to the last.
  last.focus();
  (document.activeElement as HTMLElement).blur();
  fireEvent.keyDown(dialog, { key: 'Tab' });
  expect(first).toHaveFocus();
  (document.activeElement as HTMLElement).blur();
  fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true });
  expect(last).toHaveFocus();

  // A Tab on the first control (not an edge for forward Tab) is left alone.
  first.focus();
  fireEvent.keyDown(dialog, { key: 'Tab' });
  expect(first).toHaveFocus();

  // A non-Tab key is ignored by the trap.
  fireEvent.keyDown(dialog, { key: 'a' });
  expect(first).toHaveFocus();
});

test('moves focus to the close button and restores it on close', async () => {
  const trigger = document.createElement('button');
  document.body.appendChild(trigger);
  trigger.focus();
  expect(trigger).toHaveFocus();

  const { rerender } = render(<DoorFocus day={withCode} originRect={null} onClose={vi.fn()} />);
  expect(screen.getByRole('button', { name: 'Fechar' })).toHaveFocus();

  rerender(<DoorFocus day={null} originRect={null} onClose={vi.fn()} />);
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  expect(trigger).toHaveFocus();
  trigger.remove();
});

test('locks body scroll while open and restores it after', async () => {
  const { rerender } = render(<DoorFocus day={withCode} originRect={null} onClose={vi.fn()} />);
  expect(document.body.style.overflow).toBe('hidden');
  rerender(<DoorFocus day={null} originRect={null} onClose={vi.fn()} />);
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  expect(document.body.style.overflow).toBe('');
});

test('under reduced motion it still renders a working dialog on the reduced branch', () => {
  mockReducedMotion(true);
  const onClose = vi.fn();
  render(<DoorFocus day={noCode} originRect={null} onClose={onClose} />);
  const dialog = screen.getByRole('dialog');
  expect(dialog).toBeInTheDocument();
  // Reduced branch: the card crossfades in centred, content already visible, and
  // is flagged for the reduced branch.
  expect(dialog).toHaveAttribute('data-reduced-motion', 'true');
  fireEvent.click(screen.getByRole('button', { name: 'Fechar' }));
  expect(onClose).toHaveBeenCalledTimes(1);
});

const rectAt = (left: number, top: number, width: number, height: number): DOMRect =>
  ({
    left, top, width, height,
    right: left + width, bottom: top + height, x: left, y: top,
    toJSON() {},
  }) as DOMRect;

test('with motion allowed and an origin rect the card takes the FLIP branch', () => {
  mockReducedMotion(false);
  render(<DoorFocus day={noCode} originRect={rectAt(20, 30, 40, 40)} onClose={vi.fn()} />);
  const dialog = screen.getByRole('dialog');
  expect(dialog).toHaveAttribute('data-reduced-motion', 'false');
  expect(dialog).toHaveAttribute('data-open-anim', 'flip');
});

test('with a null origin rect the card fades in centred, not from a rect', () => {
  mockReducedMotion(false);
  render(<DoorFocus day={noCode} originRect={null} onClose={vi.fn()} />);
  expect(screen.getByRole('dialog')).toHaveAttribute('data-open-anim', 'fade');
});

test('reduced motion fades even when an origin rect is given', () => {
  mockReducedMotion(true);
  render(<DoorFocus day={noCode} originRect={rectAt(0, 0, 30, 30)} onClose={vi.fn()} />);
  expect(screen.getByRole('dialog')).toHaveAttribute('data-open-anim', 'fade');
});

test('the leaf shine sweep renders only when motion is allowed', () => {
  mockReducedMotion(false);
  const { unmount } = render(
    <DoorFocus day={noCode} originRect={null} onClose={vi.fn()} />,
  );
  expect(document.body.querySelector('[data-shine]')).not.toBeNull();
  unmount();

  mockReducedMotion(true);
  render(<DoorFocus day={noCode} originRect={null} onClose={vi.fn()} />);
  expect(document.body.querySelector('[data-shine]')).toBeNull();
});

test('the glow halo is present and aria-hidden', () => {
  mockReducedMotion(false);
  render(<DoorFocus day={noCode} originRect={null} onClose={vi.fn()} />);
  const halo = document.body.querySelector('[data-halo]');
  expect(halo).not.toBeNull();
  expect(halo).toHaveAttribute('aria-hidden', 'true');
});

test('measures the card and runs the FLIP without crashing when it has a layout', () => {
  mockReducedMotion(false);
  const spy = vi
    .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
    .mockReturnValue(rectAt(120, 80, 420, 520));
  render(<DoorFocus day={noCode} originRect={rectAt(10, 10, 42, 52)} onClose={vi.fn()} />);
  expect(screen.getByRole('dialog')).toBeInTheDocument();
  spy.mockRestore();
});
