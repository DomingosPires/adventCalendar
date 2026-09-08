import { createRef } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';

test('renders children and defaults to type="button"', () => {
  render(<Button>Copiar</Button>);
  const btn = screen.getByRole('button', { name: 'Copiar' });
  expect(btn).toHaveAttribute('type', 'button');
  expect(btn).toHaveClass('button', 'solid');
});

test('applies the ghost variant class', () => {
  render(<Button variant="ghost">X</Button>);
  expect(screen.getByRole('button')).toHaveClass('ghost');
});

test('forwards ref and onClick', () => {
  const ref = createRef<HTMLButtonElement>();
  const onClick = vi.fn();
  render(<Button ref={ref} onClick={onClick}>Go</Button>);
  fireEvent.click(screen.getByRole('button'));
  expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  expect(onClick).toHaveBeenCalledTimes(1);
});

test('keeps a caller-supplied className and type', () => {
  render(<Button className="extra" type="submit">S</Button>);
  const btn = screen.getByRole('button');
  expect(btn).toHaveClass('extra');
  expect(btn).toHaveAttribute('type', 'submit');
});
