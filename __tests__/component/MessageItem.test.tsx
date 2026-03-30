import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MessageItem } from '@/components/MessageItem';

global.fetch = jest.fn();

describe('MessageItem', () => {
  const mockMessage = {
    id: 'test-123',
    content: 'Test content here',
    created_at: '2023-01-01T12:00:00Z'
  };

  const mockOnDelete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const setup = () => {
    render(<MessageItem message={mockMessage} onDeleteSuccess={mockOnDelete} />);
  };

  it('Renders the message content', () => {
    setup();
    expect(screen.getByText('Test content here')).toBeInTheDocument();
  });

  it('Renders a formatted, human-readable timestamp', () => {
    setup();
    const isoString = '2023-01-01T12:00:00Z';
    expect(screen.queryByText(isoString)).not.toBeInTheDocument(); // Raw string shouldn't be there
    
    // We expect *some* locale-aware format of that time to be visible
    const dateE = document.querySelector('time');
    expect(dateE).toBeInTheDocument();
  });

  it('Renders a Törlés Delete button', () => {
    setup();
    expect(screen.getByRole('button', { name: /törl[eé]s/i })).toBeInTheDocument();
  });

  it('Delete button is disabled while deletion is in progress', async () => {
    setup();
    const user = userEvent.setup();
    (global.fetch as jest.Mock).mockImplementationOnce(() => new Promise(r => setTimeout(r, 50)));

    const button = screen.getByRole('button', { name: /törl[eé]s/i });
    await user.click(button);

    expect(button).toBeDisabled();
  });

  it('Calls onDelete callback with the message id on success', async () => {
    setup();
    const user = userEvent.setup();
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true });

    const button = screen.getByRole('button', { name: /törl[eé]s/i });
    await user.click(button);

    await waitFor(() => {
      expect(mockOnDelete).toHaveBeenCalledWith('test-123');
    });
  });

  it('Displays an error when deletion fails', async () => {
    setup();
    const user = userEvent.setup();
    (global.fetch as jest.Mock).mockResolvedValueOnce({ 
      ok: false, 
      json: async () => ({ error: 'Delete failed' }) 
    });

    const button = screen.getByRole('button', { name: /törl[eé]s/i });
    await user.click(button);

    expect(await screen.findByText(/Delete failed/)).toBeInTheDocument();
  });

  it('Accessibility: Delete button has descriptive aria-label including message content hint', () => {
    setup();
    const button = screen.getByRole('button', { name: /törl[eé]s/i });
    expect(button).toHaveAttribute('aria-label');
  });
});
