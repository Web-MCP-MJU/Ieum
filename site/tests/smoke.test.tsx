import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import Home from '@/app/page';

describe('Bearing page shell', () => {
  it('exposes the rail workspace as the primary named region', () => {
    render(<Home />);

    expect(
      screen.getByRole('main', { name: 'Bearing rail workspace' }),
    ).toBeInTheDocument();
  });
});
