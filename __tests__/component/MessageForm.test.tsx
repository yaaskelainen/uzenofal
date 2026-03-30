import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MessageForm } from '@/components/MessageForm';

// We mock fetch for the component
global.fetch = jest.fn();

describe('MessageForm', () => {
  const mockOnSuccess = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const setup = () => {
    render(<MessageForm onSuccess={mockOnSuccess} />);
  };

  it('Renders a labelled textarea', () => {
    setup();
    expect(screen.getByRole('textbox', { name: /üzenet/i })).toBeInTheDocument();
  });

  it('Renders a "Mentés" button', () => {
    setup();
    expect(screen.getByRole('button', { name: /ment[eé]s/i })).toBeInTheDocument();
  });

  it('Submit button is disabled when textarea is empty', () => {
    setup();
    expect(screen.getByRole('button', { name: /ment[eé]s/i })).toBeDisabled();
  });

  it('Submit button is enabled when textarea has content', async () => {
    setup();
    const user = userEvent.setup();
    await user.type(screen.getByRole('textbox'), 'Hello');
    expect(screen.getByRole('button', { name: /ment[eé]s/i })).toBeEnabled();
  });

  it('Submit button is disabled while submission is in progress', async () => {
    setup();
    const user = userEvent.setup();
    await user.type(screen.getByRole('textbox'), 'Hello');
    
    // Make fetch hang slightly
    (global.fetch as jest.Mock).mockImplementationOnce(() => new Promise(r => setTimeout(r, 50)));
    
    await user.click(screen.getByRole('button', { name: /ment[eé]s/i }));
    
    expect(screen.getByRole('button', { name: /ment[eé]s/i })).toBeDisabled();
  });

  it('Textarea is cleared after successful submission', async () => {
    setup();
    const user = userEvent.setup();
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: '1', content: 'hello' })
    });

    const textbox = screen.getByRole('textbox');
    await user.type(textbox, 'hello');
    await user.click(screen.getByRole('button', { name: /ment[eé]s/i }));

    await waitFor(() => {
      expect(textbox).toHaveValue('');
    });
  });

  it('onSuccess callback is called after successful submission', async () => {
    setup();
    const user = userEvent.setup();
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: '1', content: 'hello' })
    });

    await user.type(screen.getByRole('textbox'), 'hello');
    await user.click(screen.getByRole('button', { name: /ment[eé]s/i }));

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalledTimes(1);
    });
  });

  it('Displays an error message when the API returns an error', async () => {
    setup();
    const user = userEvent.setup();
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Invalid message' })
    });

    await user.type(screen.getByRole('textbox'), 'hello');
    await user.click(screen.getByRole('button', { name: /ment[eé]s/i }));

    expect(await screen.findByText('Invalid message')).toBeInTheDocument();
  });

  it('Error message is cleared when the user starts typing again', async () => {
    setup();
    const user = userEvent.setup();
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'API Error' })
    });

    const textbox = screen.getByRole('textbox');
    await user.type(textbox, 'hello');
    await user.click(screen.getByRole('button', { name: /ment[eé]s/i }));

    expect(await screen.findByText('API Error')).toBeInTheDocument();

    await user.type(textbox, ' world');
    
    expect(screen.queryByText('API Error')).not.toBeInTheDocument();
  });

  it('Accessibility: Error message has role="alert"', async () => {
    setup();
    const user = userEvent.setup();
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'API Error' })
    });

    await user.type(screen.getByRole('textbox'), 'hello');
    await user.click(screen.getByRole('button', { name: /ment[eé]s/i }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('API Error');
  });

  it('Security: Submitted content is passed to fetch as JSON', async () => {
    setup();
    const user = userEvent.setup();
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({}) });

    await user.type(screen.getByRole('textbox'), 'Safe content');
    await user.click(screen.getByRole('button', { name: /ment[eé]s/i }));

    expect(global.fetch).toHaveBeenCalledWith('/api/messages', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ content: 'Safe content' }),
      headers: { 'Content-Type': 'application/json' }
    }));
  });

  it('Extreme: User pastes 2000-character content — submit is disabled', async () => {
    setup();
    const user = userEvent.setup();
    const longText = 'A'.repeat(2000);
    
    // Setup paste interaction
    const textbox = screen.getByRole('textbox');
    await user.click(textbox);
    await user.paste(longText);

    expect(screen.getByRole('button', { name: /ment[eé]s/i })).toBeDisabled();
    // HTML5 native constraint text might be standard, or we show our own error message.
    expect(screen.getByText(/túl hosszú/i)).toBeInTheDocument(); 
  });
});
