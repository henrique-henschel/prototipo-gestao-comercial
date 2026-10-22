import { render, screen } from '@testing-library/react';
import App from './App.jsx';

describe('App', () => {
  it('exibe o catálogo do design system', () => {
    render(<App />);
    expect(screen.getByRole('heading', { level: 1, name: 'Design system' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Seções do design system' })).toBeInTheDocument();
  });
});
