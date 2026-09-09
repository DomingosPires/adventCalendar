import { render, screen } from '@testing-library/react';
import { CalendarTemplate } from './CalendarTemplate';

beforeEach(() => {
  vi.spyOn(window, 'matchMedia').mockImplementation((q: string) => ({
    matches: true, media: q, onchange: null,
    addListener: () => {}, removeListener: () => {},
    addEventListener: () => {}, removeEventListener: () => {},
    dispatchEvent: () => false,
  }) as MediaQueryList);
});
afterEach(() => vi.restoreAllMocks());

test('renders the header and grid slots plus the snow canvas', () => {
  const { container } = render(
    <CalendarTemplate
      header={<div data-testid="header" />}
      grid={<div data-testid="grid" />}
    />,
  );
  expect(screen.getByTestId('header')).toBeInTheDocument();
  expect(screen.getByTestId('grid')).toBeInTheDocument();
  expect(container.querySelector('canvas')).toBeInTheDocument();
});
