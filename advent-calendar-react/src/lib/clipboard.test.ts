import { copyText } from './clipboard';

const originalClipboard = navigator.clipboard;
const originalExec = document.execCommand;

afterEach(() => {
  Object.defineProperty(navigator, 'clipboard', {
    value: originalClipboard,
    configurable: true,
  });
  document.execCommand = originalExec;
});

function setClipboard(value: unknown) {
  Object.defineProperty(navigator, 'clipboard', { value, configurable: true });
}

test('uses navigator.clipboard.writeText when it resolves', async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  setClipboard({ writeText });
  await expect(copyText('ABC')).resolves.toBe(true);
  expect(writeText).toHaveBeenCalledWith('ABC');
});

test('falls back to execCommand when writeText rejects', async () => {
  setClipboard({ writeText: vi.fn().mockRejectedValue(new Error('denied')) });
  document.execCommand = vi.fn().mockReturnValue(true);
  await expect(copyText('ABC')).resolves.toBe(true);
  expect(document.execCommand).toHaveBeenCalledWith('copy');
});

test('returns false when no path works', async () => {
  setClipboard(undefined);
  document.execCommand = vi.fn().mockReturnValue(false);
  await expect(copyText('ABC')).resolves.toBe(false);
});

test('never throws even if execCommand throws', async () => {
  setClipboard(undefined);
  document.execCommand = vi.fn(() => {
    throw new Error('boom');
  });
  await expect(copyText('ABC')).resolves.toBe(false);
});
