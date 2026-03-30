'use client';

import { useState } from 'react';
import { MessageForm } from '@/components/MessageForm';
import { MessageList } from '@/components/MessageList';

export default function Home() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleMessageAdded = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <main className="container">
      <header className="header">
        <h1>Üzenőfal</h1>
        <p>Hagyj egy üzenetet a látogatóknak!</p>
      </header>
      
      <section className="form-section">
        <MessageForm onSuccess={handleMessageAdded} />
      </section>

      <section className="list-section">
        <MessageList refreshTrigger={refreshTrigger} />
      </section>
    </main>
  );
}
