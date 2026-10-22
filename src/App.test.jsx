import { render, screen } from '@testing-library/react';
import { APP_NAME } from '@/app/config.js';
import App from './App.jsx';

describe('App', () => {
  it('exibe o nome do produto como título principal', () => {
    render(<App />);
    expect(screen.getByRole('heading', { level: 1, name: APP_NAME })).toBeInTheDocument();
  });
});
