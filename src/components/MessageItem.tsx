'use client';

import { useState } from 'react';

interface Props {
  message: { id: string; content: string; created_at: string };
  onDeleteSuccess: (id: string) => void;
}

export function MessageItem({ message, onDeleteSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/messages/${message.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        if (res.status === 204 || res.status === 200) {
           // handled via fallthrough
        } else {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'Delete failed');
        }
      }

      onDeleteSuccess(message.id);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const formattedDate = new Date(message.created_at).toLocaleString();

  return (
    <li className="message-item">
      <div className="message-content">{message.content}</div>
      <div className="message-meta">
        <time dateTime={message.created_at}>{formattedDate}</time>
        <button
          onClick={handleDelete}
          disabled={loading}
          aria-label={`Törlés id ${message.id}`}
        >
          {loading ? '...' : 'Törlés'}
        </button>
      </div>
      {error && <div className="error-text">{error}</div>}
    </li>
  );
}
