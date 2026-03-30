'use client';

import { useEffect, useState } from 'react';
import { MessageItem } from './MessageItem';

interface Message {
  id: string;
  content: string;
  created_at: string;
}

interface Props {
  refreshTrigger: number;
}

export function MessageList({ refreshTrigger }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function fetchMessages() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/messages');
        if (!res.ok) {
          throw new Error('Hálózat hiba történt a lekérés során.');
        }
        const data = await res.json();
        if (active) {
          setMessages(data);
        }
      } catch (err: any) {
        if (active) setError(err.message);
      } finally {
        if (active) setLoading(false);
      }
    }

    fetchMessages();
    return () => { active = false; };
  }, [refreshTrigger]);

  const handleDeleteSuccess = (id: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== id));
  };

  if (loading && messages.length === 0) {
    return <div className="loading-state">Betöltés...</div>;
  }

  if (error) {
    return <div className="error-text">{error}</div>;
  }

  if (messages.length === 0) {
    return <p className="empty-state">Még nincsenek üzenetek. Írd meg az elsőt!</p>;
  }

  return (
    <ul className="message-list">
      {messages.map((m) => (
        <MessageItem key={m.id} message={m} onDeleteSuccess={handleDeleteSuccess} />
      ))}
    </ul>
  );
}
