import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { BearingApp, capabilityMessage } from '@/src/ui/BearingApp';

const originalModelContext = document.modelContext;

afterEach(() => {
  document.modelContext = originalModelContext;
  vi.restoreAllMocks();
});

describe('Ieum working surface', () => {
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

  it('does not update WebMCP capability after unmounting during registration', async () => {
    let resolveRegistration!: () => void;
    const firstRegistration = new Promise<void>((resolve) => { resolveRegistration = resolve; });
    const signals: AbortSignal[] = [];
    const registerTool = vi.fn<(definition: Record<string, unknown>, options: { signal: AbortSignal }) => Promise<void>>((_definition, options) => {
      signals.push(options.signal);
      return firstRegistration;
    });
    document.modelContext = { registerTool };
    const { unmount } = render(<BearingApp />);
    await waitFor(() => expect(registerTool).toHaveBeenCalledTimes(1));
    unmount();
    resolveRegistration();
    await Promise.resolve();

    expect(registerTool).toHaveBeenCalledTimes(1);
    expect(signals[0].aborted).toBe(true);
  });

  it('compares two to four current-query candidates without changing the booking selection', () => {
    render(<BearingApp />);

    const compareBoxes = screen.getAllByRole('checkbox', { name: /Compare Seat/i });
    for (const box of compareBoxes.slice(0, 4)) fireEvent.click(box);
    fireEvent.click(screen.getByRole('button', { name: 'Compare 4 candidates' }));

    const comparison = screen.getByLabelText('Seat comparison');
    expect(within(within(comparison).getAllByRole('row')[0]).getAllByRole('columnheader')).toHaveLength(5);
    expect(within(screen.getByLabelText('Current selection')).getByText('No seats selected')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Select seat 12A' }));
    fireEvent.click(screen.getByRole('button', { name: 'Undo last selection' }));
    expect(screen.getByLabelText('Seat comparison')).toBeInTheDocument();

    fireEvent.click(compareBoxes[4]);
    expect(compareBoxes[4]).not.toBeChecked();
    expect(screen.getByRole('status')).toHaveTextContent('Choose up to four candidates to compare.');

    fireEvent.click(screen.getByRole('button', { name: 'Find matching seats' }));
    expect(screen.queryByLabelText('Seat comparison')).not.toBeInTheDocument();
    expect(screen.getAllByRole('checkbox', { name: /Compare Seat/i }).every((box) => !(box as HTMLInputElement).checked)).toBe(true);
  });

  it('maps the availability and quiet-car human filters to their query results', () => {
    render(<BearingApp />);

    const status = screen.getByRole('status');
    expect(screen.getByLabelText('Include unavailable seats')).not.toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: 'Find matching seats' }));
    expect(status).toHaveTextContent('47 seats matched.');

    fireEvent.click(screen.getByLabelText('Include unavailable seats'));
    fireEvent.click(screen.getByRole('button', { name: 'Find matching seats' }));
    expect(status).toHaveTextContent('60 seats matched.');

    fireEvent.change(screen.getByLabelText('Quiet car'), { target: { value: 'non-quiet' } });
    fireEvent.click(screen.getByRole('button', { name: 'Find matching seats' }));
    expect(status).toHaveTextContent('0 seats matched.');

    fireEvent.change(screen.getByLabelText('Quiet car'), { target: { value: 'quiet' } });
    fireEvent.click(screen.getByRole('button', { name: 'Find matching seats' }));
    expect(status).toHaveTextContent('60 seats matched.');
  });

  it('keeps unrelated actions usable for invalid drafts and blocks only dependent output', () => {
    render(<BearingApp />);
    document.querySelector('details')!.open = true;

    fireEvent.change(screen.getByLabelText(/^Step length/), { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: 'Find matching seats' }));
    expect(screen.getByRole('status')).toHaveTextContent('47 seats matched.');

    fireEvent.change(screen.getByLabelText('Units'), { target: { value: 'steps' } });
    fireEvent.click(screen.getByRole('button', { name: 'Find matching seats' }));
    expect(screen.getByRole('status')).toHaveTextContent('Enter a positive step length before using steps.');
    fireEvent.change(screen.getByLabelText('Units'), { target: { value: 'feet' } });

    fireEvent.change(screen.getByLabelText(/^Walking speed/), { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: 'Show route' }));
    expect(screen.getByRole('status')).toHaveTextContent('Enter a positive walking speed before showing a route.');

    fireEvent.click(screen.getByRole('button', { name: 'Find matching seats' }));
    expect(screen.getByRole('status')).toHaveTextContent('47 seats matched.');
  });

  it('lets the browser activate a focused seat once with Enter', async () => {
    const user = userEvent.setup();
    render(<BearingApp />);
    const firstSeat = screen.getByRole('gridcell', { name: /Seat 7A/i });
    firstSeat.focus();
    const describeCount = () => screen.getAllByText('a11y.describe').length;
    const before = describeCount();

    await user.keyboard('{Enter}');

    expect(describeCount()).toBe(before + 1);
  });

  it('announces every WebMCP capability state in an atomic status region', () => {
    render(<BearingApp />);
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-atomic', 'true');
    expect(capabilityMessage('available')).toContain('Agent tools are available');
    expect(capabilityMessage('insecure-context')).toContain('secure context');
    expect(capabilityMessage('unsupported')).toContain('not supported');
    expect(capabilityMessage('permission-denied')).toContain('permission was denied');
    expect(capabilityMessage('security-rejected')).toContain('browser security');
    expect(capabilityMessage('registration-failed')).toContain('could not register');
  });
});
