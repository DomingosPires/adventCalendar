import { render, screen } from '@testing-library/react';
import { SiteHeader } from './SiteHeader';

// framer-motion memoises the reduced-motion preference the first time any
// component reads it, process-wide, so a per-test `window.matchMedia` spy alone
// never reaches `useReducedMotion`. Route the hook through matchMedia on every
// call so `mockReducedMotion` below actually toggles it. `motion` stays real.
vi.mock('framer-motion', async (importOriginal) => {
  const actual = await importOriginal<typeof import('framer-motion')>();
  return {
    ...actual,
    useReducedMotion: () =>
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true,
  };
});

function mockReducedMotion(matches: boolean) {
  vi.spyOn(window, 'matchMedia').mockImplementation((q: string) => ({
    matches, media: q, onchange: null,
    addListener: () => {}, removeListener: () => {},
    addEventListener: () => {}, removeEventListener: () => {},
    dispatchEvent: () => false,
  }) as MediaQueryList);
}

afterEach(() => vi.restoreAllMocks());

test('renders the title as a level-1 heading and the subtitle', () => {
  render(<SiteHeader title="Calendário do Advento" subtitle="Abre uma porta por dia" />);
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
    'Calendário do Advento',
  );
  expect(screen.getByText('Abre uma porta por dia')).toBeInTheDocument();
});

test('still renders its content with the entrance gated by reduced motion', () => {
  mockReducedMotion(true);
  render(<SiteHeader title="Calendário do Advento" subtitle="Abre uma porta por dia" />);
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
    'Calendário do Advento',
  );
  expect(screen.getByText('Abre uma porta por dia')).toBeInTheDocument();
});
