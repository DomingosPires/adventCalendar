import { render, screen, fireEvent, within } from '@testing-library/react';
import { CalendarPage } from './CalendarPage';

const originalSearch = window.location.search;

function setSearch(search: string) {
  window.history.replaceState({}, '', `${window.location.pathname}${search}`);
}

beforeEach(() => {
  window.localStorage.clear();
  vi.spyOn(window, 'matchMedia').mockImplementation((q: string) => ({
    matches: true, media: q, onchange: null,
    addListener: () => {}, removeListener: () => {},
    addEventListener: () => {}, removeEventListener: () => {},
    dispatchEvent: () => false,
  }) as MediaQueryList);
});

afterEach(() => {
  setSearch(originalSearch);
  vi.restoreAllMocks();
});

test('renders the 25 doors with the header', () => {
  setSearch('?day=5');
  render(<CalendarPage />);
  expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  expect(screen.getAllByRole('button')).toHaveLength(25);
});

test('opening today\'s door shows its content and marks it opened', () => {
  setSearch('?day=5');
  render(<CalendarPage />);
  fireEvent.click(screen.getByRole('button', { name: 'Dia 5, hoje — abrir' }));
  const dialog = screen.getByRole('dialog');
  expect(within(dialog).getByRole('heading', { level: 2 })).toHaveTextContent(
    'Receita rápida',
  );
  expect(screen.getByRole('button', { name: 'Dia 5, aberto' })).toBeInTheDocument();
});

test('a locked door does not open the dialog', () => {
  setSearch('?day=5');
  render(<CalendarPage />);
  fireEvent.click(screen.getByRole('button', { name: 'Dia 20, ainda fechado' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

test('closing the dialog clears the selected day', () => {
  setSearch('?day=5');
  render(<CalendarPage />);
  fireEvent.click(screen.getByRole('button', { name: 'Dia 5, hoje — abrir' }));
  const dialog = screen.getByRole('dialog');
  fireEvent.click(within(dialog).getByRole('button', { name: 'Fechar' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
