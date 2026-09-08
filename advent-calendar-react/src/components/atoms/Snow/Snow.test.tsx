import { render } from '@testing-library/react';
import { Snow } from './Snow';

beforeEach(() => {
  vi.restoreAllMocks();
  vi.stubGlobal('requestAnimationFrame', vi.fn().mockReturnValue(1));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function mockReducedMotion(matches: boolean) {
  vi.spyOn(window, 'matchMedia').mockImplementation((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }) as MediaQueryList);
}

test('renders an aria-hidden canvas', () => {
  mockReducedMotion(false);
  const { container } = render(<Snow />);
  const canvas = container.querySelector('canvas');
  expect(canvas).toBeInTheDocument();
  expect(canvas).toHaveAttribute('aria-hidden', 'true');
});

test('starts an animation frame when motion is allowed', () => {
  mockReducedMotion(false);
  render(<Snow />);
  expect(requestAnimationFrame).toHaveBeenCalled();
});

test('does not start a loop when prefers-reduced-motion is set', () => {
  mockReducedMotion(true);
  render(<Snow />);
  expect(requestAnimationFrame).not.toHaveBeenCalled();
});

test('cancels the frame on unmount', () => {
  mockReducedMotion(false);
  const { unmount } = render(<Snow />);
  unmount();
  expect(cancelAnimationFrame).toHaveBeenCalled();
});

test('pauses on visibilitychange when the tab is hidden', () => {
  mockReducedMotion(false);
  render(<Snow />);
  Object.defineProperty(document, 'hidden', { value: true, configurable: true });
  document.dispatchEvent(new Event('visibilitychange'));
  expect(cancelAnimationFrame).toHaveBeenCalled();
  Object.defineProperty(document, 'hidden', { value: false, configurable: true });
});

test('runs the animation loop and resumes when the tab is shown again', () => {
  mockReducedMotion(false);
  render(<Snow />);

  const tick = vi.mocked(requestAnimationFrame).mock
    .calls[0][0] as FrameRequestCallback;

  // Drive enough frames that flakes fall past the bottom edge and wrap.
  for (let i = 0; i < 60; i += 1) tick(0);

  // Hide the tab: the loop stops and a further tick is a no-op.
  Object.defineProperty(document, 'hidden', { value: true, configurable: true });
  document.dispatchEvent(new Event('visibilitychange'));
  tick(0);

  // Show the tab again: the loop re-arms.
  Object.defineProperty(document, 'hidden', { value: false, configurable: true });
  document.dispatchEvent(new Event('visibilitychange'));

  // 1 from render + 60 from the driven frames (each tick schedules the next)
  // + 1 from re-arming on show. The no-op tick while hidden schedules nothing.
  expect(requestAnimationFrame).toHaveBeenCalledTimes(62);
});
