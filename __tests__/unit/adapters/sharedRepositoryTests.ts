import { IMessageRepository } from '@/features/messages/IMessageRepository';
import { NotFoundError } from '@/features/messages/messageTypes';

export function sharedRepositoryTests(
  getRepository: () => IMessageRepository,
  beforeEachHook: () => Promise<void> | void
) {
  let repository: IMessageRepository;

  beforeEach(async () => {
    await beforeEachHook();
    repository = getRepository();
  });

  it('findAll returns an array matching Message shape', async () => {
    const messages = await repository.findAll();
    expect(Array.isArray(messages)).toBe(true);
    if (messages.length > 0) {
      const msg = messages[0];
      expect(typeof msg.id).toBe('string');
      expect(typeof msg.content).toBe('string');
      expect(typeof msg.created_at).toBe('string');
    }
  });

  it('save returns a Message with a non-empty UUID id', async () => {
    const content = 'Hello world';
    const message = await repository.save(content);
    expect(message.content).toBe(content);
    expect(typeof message.id).toBe('string');
    expect(message.id.length).toBeGreaterThan(0);
    expect(typeof message.created_at).toBe('string');
  });

  it('save persists — findAll after save includes new record', async () => {
    const msg = await repository.save('Persistent message');
    const all = await repository.findAll();
    const found = all.find((m) => m.id === msg.id);
    expect(found).toBeDefined();
    expect(found?.content).toBe('Persistent message');
  });

  it('deleteById with existing id resolves', async () => {
    const msg = await repository.save('To delete');
    await expect(repository.deleteById(msg.id)).resolves.toBeUndefined();
  });

  it('deleteById with missing id rejects with NotFoundError', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    await expect(repository.deleteById(fakeId)).rejects.toBeInstanceOf(NotFoundError);
  });
}
