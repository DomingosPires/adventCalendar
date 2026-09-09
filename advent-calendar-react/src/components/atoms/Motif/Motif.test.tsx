import { render } from '@testing-library/react';
import { Motif, MOTIF_NAMES } from './index';

test('renders an svg for every motif name', () => {
  for (const name of MOTIF_NAMES) {
    const { container, unmount } = render(<Motif name={name} />);
    const svg = container.querySelector('svg');
    expect(svg, name).not.toBeNull();
    expect(svg).toHaveAttribute('viewBox', '0 0 100 100');
    expect(svg?.querySelectorAll('*').length ?? 0).toBeGreaterThan(0);
    unmount();
  }
});

test('there are exactly ten distinct motifs', () => {
  expect(new Set(MOTIF_NAMES).size).toBe(10);
});

test('an unknown name renders nothing', () => {
  // @ts-expect-error deliberately invalid
  const { container } = render(<Motif name="reindeer" />);
  expect(container.querySelector('svg')).toBeNull();
});

test('a title makes it a labelled image', () => {
  const { container } = render(<Motif name="star" title="estrela" />);
  const svg = container.querySelector('svg');
  expect(svg).toHaveAttribute('role', 'img');
  expect(container.querySelector('title')).toHaveTextContent('estrela');
});

test('applies the className it is given so a consumer can size it', () => {
  const { container } = render(<Motif name="star" className="x-test" />);
  expect(container.querySelector('svg')).toHaveClass('x-test');
});

test('carries no class attribute when no className is passed', () => {
  const { container } = render(<Motif name="star" />);
  expect(container.querySelector('svg')?.hasAttribute('class')).toBe(false);
});
