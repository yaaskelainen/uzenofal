import { GET } from '@/app/api/messages/route';
import { NextRequest } from 'next/server';
import { InMemoryMessageRepository } from '@/features/messages/adapters/inMemory/inMemoryMessageRepository';
import { createMessageRepository } from '@/features/messages/messageRepositoryFactory';
import { RepositoryError } from '@/features/messages/messageTypes';

// Mock the factory to return our in-memory repository
jest.mock('@/features/messages/messageRepositoryFactory');

describe('GET /api/messages', () => {
  let inMemoryRepo: InMemoryMessageRepository;
  
  beforeEach(() => {
    inMemoryRepo = new InMemoryMessageRepository();
    (createMessageRepository as jest.Mock).mockReturnValue(inMemoryRepo);
  });

  it('Returns 200 OK with an empty array when no messages exist', async () => {
    const req = new NextRequest('http://localhost:3000/api/messages');
    const res = await GET(req);
    
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual([]);
  });

  it('Returns 200 OK with all messages, newest first', async () => {
    await inMemoryRepo.save('old');
    await new Promise(r => setTimeout(r, 10)); // Force different timestamp
    await inMemoryRepo.save('new');
    
    const req = new NextRequest('http://localhost:3000/api/messages');
    const res = await GET(req);
    
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.length).toBe(2);
    expect(body[0].content).toBe('new');
    expect(body[1].content).toBe('old');
  });

  it('Each message object has id, content, created_at fields', async () => {
    await inMemoryRepo.save('test');
    
    const req = new NextRequest('http://localhost:3000/api/messages');
    const res = await GET(req);
    
    const body = await res.json();
    expect(body[0]).toHaveProperty('id');
    expect(body[0]).toHaveProperty('content');
    expect(body[0]).toHaveProperty('created_at');
  });

  it('Returns 500 when repository throws RepositoryError', async () => {
    jest.spyOn(inMemoryRepo, 'findAll').mockRejectedValueOnce(new RepositoryError('DB error'));
    
    const req = new NextRequest('http://localhost:3000/api/messages');
    const res = await GET(req);
    
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toHaveProperty('error');
  });

  it('Performance check: Response time with 500 messages < 200 ms', async () => {
    const promises = [];
    for (let i = 0; i < 500; i++) {
      promises.push(inMemoryRepo.save(`msg ${i}`));
    }
    await Promise.all(promises);
    
    const start = Date.now();
    const req = new NextRequest('http://localhost:3000/api/messages');
    await GET(req);
    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(200);
  });
});
