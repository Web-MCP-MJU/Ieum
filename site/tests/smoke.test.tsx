import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import Home from '@/app/page';
import { metadata } from '@/app/layout';

describe('Ieum page shell', () => {
  it('exposes the rail workspace as the primary named region', () => {
    render(<Home />);

    expect(
      screen.getByRole('main', { name: 'Ieum rail workspace' }),
    ).toBeInTheDocument();
  });

  it('uses Ieum in document metadata', () => {
    expect(metadata.title).toContain('Ieum');
  });
});
