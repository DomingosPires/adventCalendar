import {
  render,
  screen,
  fireEvent,
  waitFor,
  waitForElementToBeRemoved,
} from '@testing-library/react';
import { CopyableCode } from './CopyableCode';
import { copyText } from '../../../lib/clipboard';

vi.mock('../../../lib/clipboard', () => ({ copyText: vi.fn() }));
const mockCopyText = vi.mocked(copyText);

beforeEach(() => {
  mockCopyText.mockReset();
});

test('renders the code', () => {
  render(<CopyableCode code="ADVENTO-03" />);
  expect(screen.getByText('ADVENTO-03')).toBeInTheDocument();
});

test('shows "Copiado" on success, then clears it', async () => {
  mockCopyText.mockResolvedValue(true);
  render(<CopyableCode code="ADVENTO-03" />);
  const button = screen.getByRole('button', { name: 'Copiar' });
  fireEvent.click(button);
  await waitFor(() => expect(mockCopyText).toHaveBeenCalledWith('ADVENTO-03'));
  expect(await screen.findByRole('status')).toHaveTextContent('Copiado');
  // A second click while "Copiado" is still visible clears the pending timeout
  // and restarts the 2 s window.
  fireEvent.click(button);
  await waitFor(() => expect(mockCopyText).toHaveBeenCalledTimes(2));
  expect(screen.getByRole('status')).toHaveTextContent('Copiado');
  await waitForElementToBeRemoved(() => screen.queryByRole('status'), {
    timeout: 3000,
  });
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});

test('shows an error message and selects the code on failure', async () => {
  mockCopyText.mockResolvedValue(false);
  const createRange = vi.spyOn(document, 'createRange');
  render(<CopyableCode code="ADVENTO-03" />);
  fireEvent.click(screen.getByRole('button', { name: 'Copiar' }));
  await waitFor(() =>
    expect(screen.getByRole('status')).toHaveTextContent('Não foi possível copiar'),
  );
  expect(createRange).toHaveBeenCalled();
});
