import { InMemoryMessageRepository } from '@/features/messages/adapters/inMemory/inMemoryMessageRepository';
import { NotFoundError } from '@/features/messages/messageTypes';
import { sharedRepositoryTests } from './sharedRepositoryTests';

describe('InMemoryMessageRepository', () => {
  let repository: InMemoryMessageRepository;

  beforeEach(() => {
    repository = new InMemoryMessageRepository();
  });

  describe('Contract Tests', () => {
    sharedRepositoryTests(
      () => repository,
      () => {
        repository = new InMemoryMessageRepository();
      }
    );
  });

  describe('findAll', () => {
    it('returns empty array when store is empty', async () => {
      const result = await repository.findAll();
      expect(result).toEqual([]);
    });

    it('returns all saved messages', async () => {
      await repository.save('msg1');
      await repository.save('msg2');
      const result = await repository.findAll();
      expect(result.length).toBe(2);
    });

    it('returns messages in descending created_at order (newest first)', async () => {
      await repository.save('first');
      // Adding a small delay to ensure different timestamps if it uses Date.now()
      await new Promise((resolve) => setTimeout(resolve, 10));
      await repository.save('second');
      
      const result = await repository.findAll();
      expect(result[0].content).toBe('second');
      expect(result[1].content).toBe('first');
    });

    it('returns a copy — mutating result does not affect the store', async () => {
      await repository.save('test');
      const result = await repository.findAll();
      result.pop();
      const result2 = await repository.findAll();
      expect(result2.length).toBe(1);
    });

    it('completes findAll with 10,000 items in < 100ms', async () => {
      // populate
      const bulk = [];
      for (let i = 0; i < 10000; i++) {
        bulk.push(repository.save(`msg ${i}`));
      }
      await Promise.all(bulk);

      const start = Date.now();
      const all = await repository.findAll();
      const end = Date.now();
      
      expect(all.length).toBe(10000);
      expect(end - start).toBeLessThan(100);
    });
  });

  describe('save', () => {
    it('returns a Message object with id, content, created_at', async () => {
      const msg = await repository.save('test message');
      expect(msg).toHaveProperty('id');
      expect(msg).toHaveProperty('content');
      expect(msg).toHaveProperty('created_at');
    });

    it('generated id is a valid UUID v4', async () => {
      const msg = await repository.save('test');
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(msg.id).toMatch(uuidRegex);
    });

    it('created_at is a valid ISO 8601 timestamp', async () => {
      const msg = await repository.save('test');
      const date = new Date(msg.created_at);
      expect(date.getTime()).not.toBeNaN();
    });

    it('each saved message receives a unique id', async () => {
      const ids = new Set();
      for (let i = 0; i < 100; i++) {
        const msg = await repository.save(`test ${i}`);
        ids.add(msg.id);
      }
      expect(ids.size).toBe(100);
    });

    it('saves exact content without modification', async () => {
      const content = '   hello \n world  ';
      const msg = await repository.save(content);
      expect(msg.content).toBe(content);
    });

    it('saves content of exactly 1000 characters', async () => {
      const content = 'A'.repeat(1000);
      const msg = await repository.save(content);
      expect(msg.content.length).toBe(1000);
    });

    it('saves an empty string (adapter has no validation concern)', async () => {
      const msg = await repository.save('');
      expect(msg.content).toBe('');
    });

    it('content containing HTML/script tags is stored as-is', async () => {
      const payload = '<script>alert(1)</script>';
      const msg = await repository.save(payload);
      expect(msg.content).toBe(payload);
    });
  });

  describe('deleteById', () => {
    it('message is no longer returned by findAll after deletion', async () => {
      const msg1 = await repository.save('keep');
      const msg2 = await repository.save('delete');
      
      await repository.deleteById(msg2.id);
      const all = await repository.findAll();
      
      expect(all.length).toBe(1);
      expect(all[0].id).toBe(msg1.id);
    });

    it('throws NotFoundError for an empty-string id', async () => {
      await expect(repository.deleteById('')).rejects.toBeInstanceOf(NotFoundError);
    });

    it('throws NotFoundError for syntactically valid UUID that was never saved', async () => {
      const fakeUuid = '123e4567-e89b-12d3-a456-426614174000';
      await expect(repository.deleteById(fakeUuid)).rejects.toBeInstanceOf(NotFoundError);
    });

    it('deleting does not affect other messages in the store', async () => {
      const m1 = await repository.save('1');
      const m2 = await repository.save('2');
      const m3 = await repository.save('3');
      
      await repository.deleteById(m2.id);
      
      const all = await repository.findAll();
      expect(all.length).toBe(2);
      expect(all.find(m => m.id === m1.id)).toBeDefined();
      expect(all.find(m => m.id === m3.id)).toBeDefined();
    });

    it('deleting same id twice throws NotFoundError on second call', async () => {
      const msg = await repository.save('test');
      await repository.deleteById(msg.id);
      await expect(repository.deleteById(msg.id)).rejects.toBeInstanceOf(NotFoundError);
    });
  });
});
