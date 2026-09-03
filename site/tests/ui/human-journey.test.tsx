import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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

  it('exposes the complete human query and route controls', () => {
    const { container } = render(<BearingApp />);
    expect(screen.getByLabelText('Near')).toBeInTheDocument();
    expect(screen.getByLabelText('Maximum walking distance')).toBeDisabled();
    expect(screen.getByLabelText('Maximum price')).toBeInTheDocument();
    expect(screen.getByLabelText('Wheelchair space')).toBeInTheDocument();
    expect(screen.getByLabelText('Transfer seat')).toBeInTheDocument();
    expect(screen.getByLabelText('Movable armrest')).toBeInTheDocument();
    expect(screen.getByLabelText('Exclude exit rows')).toBeInTheDocument();
    expect(screen.getByLabelText('Route from')).toBeInTheDocument();
    expect(screen.getByLabelText('Route to')).toBeInTheDocument();
    const stepLength = container.querySelector<HTMLInputElement>('input[aria-describedby="step-length-unit"]');
    expect(stepLength).toHaveAccessibleName(/^Step length/);
  });

  it('uses a modal confirmation that cancels with Escape and restores focus', async () => {
    render(<BearingApp />);
    fireEvent.click(screen.getByRole('gridcell', { name: /Seat 12A.*available/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Select seat 12A' }));
    const trigger = screen.getByRole('button', { name: 'Review and confirm' });
    fireEvent.click(trigger);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('open');
    fireEvent(dialog, new Event('cancel', { bubbles: true, cancelable: true }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await waitFor(() => expect(trigger).toHaveFocus());
  });
});
