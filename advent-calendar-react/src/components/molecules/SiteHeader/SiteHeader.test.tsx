import { render, screen } from '@testing-library/react';
import { SiteHeader } from './SiteHeader';

test('renders the title as a level-1 heading and the subtitle', () => {
  render(<SiteHeader title="Calendário do Advento" subtitle="Abre uma porta por dia" />);
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
    'Calendário do Advento',
  );
  expect(screen.getByText('Abre uma porta por dia')).toBeInTheDocument();
});
