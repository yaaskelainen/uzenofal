import { IMessageRepository } from './IMessageRepository';
import { SupabaseMessageRepository } from './adapters/supabase/supabaseMessageRepository';
import { InMemoryMessageRepository } from './adapters/inMemory/inMemoryMessageRepository';
import { getConfig } from '@/config/env';

export function createMessageRepository(): IMessageRepository {
  const { dbAdapter } = getConfig();

  switch (dbAdapter) {
    case 'inMemory':
      return new InMemoryMessageRepository();
    case 'supabase':
    default:
      return new SupabaseMessageRepository();
  }
}
