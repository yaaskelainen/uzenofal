import { render, screen, waitFor } from '@testing-library/react';
import { MessageList } from '@/components/MessageList';

global.fetch = jest.fn();

describe('MessageList', () => {
  const mockMessages = [
    { id: '1', content: 'First message', created_at: '2023-01-01T10:00:00Z' },
    { id: '2', content: 'Second message', created_at: '2023-01-01T11:00:00Z' }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const setup = () => render(<MessageList refreshTrigger={0} />);

  it('Shows a loading indicator while fetching', () => {
    (global.fetch as jest.Mock).mockImplementationOnce(() => new Promise(() => {})); // Hang forever
    setup();
    expect(screen.getByText(/betöltés/i)).toBeInTheDocument();
  });

  it('Renders a list of messages after successful fetch', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockMessages
    });

    setup();
    
    expect(await screen.findByText('First message')).toBeInTheDocument();
    expect(await screen.findByText('Second message')).toBeInTheDocument();
  });

  it('Shows an empty-state message when the list is empty', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => []
    });

    setup();
    
    expect(await screen.findByText(/még nincsenek üzenetek/i)).toBeInTheDocument();
  });

  it('Shows an error message when fetch fails', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Not found' })
    });

    setup();
    
    expect(await screen.findByText(/hiba/i)).toBeInTheDocument();
  });

  it('Refresh is triggered when refreshTrigger prop changes', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => [] })
      .mockResolvedValueOnce({ ok: true, json: async () => mockMessages });

    const { rerender } = render(<MessageList refreshTrigger={0} />);
    
    // Initial fetch completed
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));

    // Prop change triggers strict refetch
    rerender(<MessageList refreshTrigger={1} />);
    
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));
    expect(await screen.findByText('First message')).toBeInTheDocument();
  });

  it('Security: HTML in message is rendered as text', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => [{ id: '3', content: '<h1>Injection</h1>', created_at: '2024-01-01' }]
    });

    setup();
    
    // We search for the literal string, meaning it was escaped, not parsed as an H1 element
    expect(await screen.findByText('<h1>Injection</h1>')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
  });
});
