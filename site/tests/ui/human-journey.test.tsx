import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { BearingApp } from '@/src/ui/BearingApp';

describe('Bearing working surface', () => {
  it('renders the 60-seat grid and completes a human select and undo flow', async () => {
    render(<BearingApp />);
    expect(screen.getAllByRole('gridcell')).toHaveLength(60);
    expect(screen.getByText('47 available')).toBeInTheDocument();

    const seat = screen.getByRole('gridcell', { name: /Seat 12A.*available/i });
    fireEvent.click(seat);
    fireEvent.click(screen.getByRole('button', { name: 'Select seat 12A' }));
    expect(within(screen.getByLabelText('Current selection')).getByText('6-12A')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Undo last selection' }));
    expect(within(screen.getByLabelText('Current selection')).getByText('No seats selected')).toBeInTheDocument();
  });
});
