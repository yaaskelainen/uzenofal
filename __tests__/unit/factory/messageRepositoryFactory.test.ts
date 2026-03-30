import { createMessageRepository } from '@/features/messages/messageRepositoryFactory';
import { SupabaseMessageRepository } from '@/features/messages/adapters/supabase/supabaseMessageRepository';
import { InMemoryMessageRepository } from '@/features/messages/adapters/inMemory/inMemoryMessageRepository';

jest.mock('@/config/env');
import { getConfig } from '@/config/env';

describe('messageRepositoryFactory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Returns SupabaseMessageRepository when dbAdapter="supabase"', () => {
    (getConfig as jest.Mock).mockReturnValue({ dbAdapter: 'supabase' });
    const repo = createMessageRepository();
    expect(repo).toBeInstanceOf(SupabaseMessageRepository);
  });

  it('Returns InMemoryMessageRepository when dbAdapter="inMemory"', () => {
    (getConfig as jest.Mock).mockReturnValue({ dbAdapter: 'inMemory' });
    const repo = createMessageRepository();
    expect(repo).toBeInstanceOf(InMemoryMessageRepository);
  });

  it('Returned object satisfies the IMessageRepository interface', () => {
    (getConfig as jest.Mock).mockReturnValue({ dbAdapter: 'inMemory' });
    const repo = createMessageRepository();
    expect(typeof repo.findAll).toBe('function');
    expect(typeof repo.save).toBe('function');
    expect(typeof repo.deleteById).toBe('function');
  });
});
