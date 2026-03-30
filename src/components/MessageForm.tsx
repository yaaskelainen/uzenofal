'use client';

import { useState } from 'react';

interface Props {
  onSuccess: () => void;
}

export function MessageForm({ onSuccess }: Props) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || content.length > 1000) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: content.trim() })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Hiba történt a mentés során.');
      }

      setContent('');
      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const isOverLimit = content.length > 1000;
  const isDisabled = !content.trim() || isOverLimit || loading;

  return (
    <form className="message-form" onSubmit={handleSubmit}>
      <label htmlFor="message-input" className="sr-only">Üzenet</label>
      <textarea
        id="message-input"
        value={content}
        onChange={(e) => {
          setContent(e.target.value);
          if (error) setError(null);
        }}
        placeholder="Írd ide az üzeneted..."
        disabled={loading}
        rows={3}
      />
      {isOverLimit && <div className="error-text">Túl hosszú üzenet! Kérlek rövidítsd.</div>}
      {error && <div className="error-text" role="alert">{error}</div>}
      <button type="submit" disabled={isDisabled}>
        {loading ? 'Mentés...' : 'Mentés'}
      </button>
    </form>
  );
}
