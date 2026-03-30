import { InMemoryMessageRepository } from '@/features/messages/adapters/inMemory/inMemoryMessageRepository';
import { MessageService } from '@/features/messages/messageService';
import { ValidationError, NotFoundError, RepositoryError } from '@/features/messages/messageTypes';

describe('MessageService', () => {
  let repository: InMemoryMessageRepository;
  let service: MessageService;

  beforeEach(() => {
    repository = new InMemoryMessageRepository();
    service = new MessageService(repository);
  });

  describe('getMessages', () => {
    it('returns empty array when no messages exist', async () => {
      const messages = await service.getMessages();
      expect(messages).toEqual([]);
    });

    it('returns all messages ordered newest first', async () => {
      await repository.save('old');
      await new Promise(r => setTimeout(r, 10)); // Ensure different timestamp
      await repository.save('new');

      const messages = await service.getMessages();
      expect(messages.length).toBe(2);
      expect(messages[0].content).toBe('new');
      expect(messages[1].content).toBe('old');
    });

    it('propagates RepositoryError from the repository', async () => {
      jest.spyOn(repository, 'findAll').mockRejectedValueOnce(new RepositoryError('DB down'));
      await expect(service.getMessages()).rejects.toBeInstanceOf(RepositoryError);
    });
  });

  describe('createMessage', () => {
    it('returns a Message with id, content, created_at', async () => {
      const msg = await service.createMessage('hello');
      expect(msg).toHaveProperty('id');
      expect(msg).toHaveProperty('content', 'hello');
      expect(msg).toHaveProperty('created_at');
    });

    it('persisted message appears in subsequent getMessages()', async () => {
      const msg = await service.createMessage('hello');
      const all = await service.getMessages();
      expect(all.find((m: { id: any; }) => m.id === msg.id)).toBeDefined();
    });

    it('throws ValidationError for empty string ""', async () => {
      await expect(service.createMessage('')).rejects.toBeInstanceOf(ValidationError);
    });

    it('throws ValidationError for whitespace-only string "   "', async () => {
      await expect(service.createMessage('   ')).rejects.toBeInstanceOf(ValidationError);
    });

    it('throws ValidationError for content of 1001 characters', async () => {
      const content = 'A'.repeat(1001);
      await expect(service.createMessage(content)).rejects.toBeInstanceOf(ValidationError);
    });

    it('accepts content of exactly 1000 characters (boundary, valid)', async () => {
      const content = 'A'.repeat(1000);
      const msg = await service.createMessage(content);
      expect(msg.content.length).toBe(1000);
    });

    it('accepts content of exactly 1 character (boundary, valid)', async () => {
      const msg = await service.createMessage('A');
      expect(msg.content).toBe('A');
    });

    it('throws ValidationError for null input', async () => {
      await expect(service.createMessage(null as unknown as string)).rejects.toBeInstanceOf(ValidationError);
    });

    it('throws ValidationError for undefined input', async () => {
      await expect(service.createMessage(undefined as unknown as string)).rejects.toBeInstanceOf(ValidationError);
    });

    it('accepts content with HTML/script tags (no sanitisation at this layer)', async () => {
      const payload = '<script>alert(1)</script>';
      const msg = await service.createMessage(payload);
      expect(msg.content).toBe(payload);
    });

    it('accepts SQL-injection-like strings without modification', async () => {
      const payload = "DROP TABLE messages; --";
      const msg = await service.createMessage(payload);
      expect(msg.content).toBe(payload);
    });

    it('creating 1000 messages concurrently all succeed', async () => {
      const promises = [];
      for (let i = 0; i < 1000; i++) {
        promises.push(service.createMessage(`msg ${i}`));
      }
      await Promise.all(promises);
      const all = await service.getMessages();
      expect(all.length).toBe(1000);
    });

    it('propagates RepositoryError from the repository', async () => {
      jest.spyOn(repository, 'save').mockRejectedValueOnce(new RepositoryError('DB down'));
      await expect(service.createMessage('test')).rejects.toBeInstanceOf(RepositoryError);
    });
  });

  describe('deleteMessage', () => {
    it('resolves for an existing message id', async () => {
      const msg = await service.createMessage('to delete');
      await expect(service.deleteMessage(msg.id)).resolves.toBeUndefined();
    });

    it('message is absent from getMessages() after deletion', async () => {
      const msg = await service.createMessage('to delete');
      await service.deleteMessage(msg.id);
      const all = await service.getMessages();
      expect(all.length).toBe(0);
    });

    it('propagates NotFoundError for a non-existent id', async () => {
      await expect(service.deleteMessage('123e4567-e89b-12d3-a456-426614174000')).rejects.toBeInstanceOf(NotFoundError);
    });

    it('propagates NotFoundError for an empty-string id', async () => {
      jest.spyOn(repository, 'deleteById').mockRejectedValueOnce(new NotFoundError('Not found'));
      await expect(service.deleteMessage('')).rejects.toBeInstanceOf(NotFoundError);
    });

    it('propagates RepositoryError from the repository', async () => {
      const msg = await service.createMessage('test');
      jest.spyOn(repository, 'deleteById').mockRejectedValueOnce(new RepositoryError('DB down'));
      await expect(service.deleteMessage(msg.id)).rejects.toBeInstanceOf(RepositoryError);
    });

    it('deleting all messages one by one leaves empty list', async () => {
      const m1 = await service.createMessage('1');
      const m2 = await service.createMessage('2');

      await service.deleteMessage(m1.id);
      await service.deleteMessage(m2.id);

      const all = await service.getMessages();
      expect(all).toEqual([]);
    });
  });
});
