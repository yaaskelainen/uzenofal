import { POST } from '@/app/api/messages/route';
import { NextRequest } from 'next/server';
import { InMemoryMessageRepository } from '@/features/messages/adapters/inMemory/inMemoryMessageRepository';
import { createMessageRepository } from '@/features/messages/messageRepositoryFactory';
import { RepositoryError } from '@/features/messages/messageTypes';

// Mock the factory to return our in-memory repository
jest.mock('@/features/messages/messageRepositoryFactory');

describe('POST /api/messages', () => {
  let inMemoryRepo: InMemoryMessageRepository;

  beforeEach(() => {
    inMemoryRepo = new InMemoryMessageRepository();
    (createMessageRepository as jest.Mock).mockReturnValue(inMemoryRepo);
  });

  const makeReq = (body: any) => {
    return new NextRequest('http://localhost:3000/api/messages', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    });
  };

  it('Returns 201 Created with the new message object', async () => {
    const res = await POST(makeReq({ content: 'test message' }));
    
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.content).toBe('test message');
    expect(body).toHaveProperty('id');
    expect(body).toHaveProperty('created_at');
  });

  it('Returns 400 for empty content field', async () => {
    const res = await POST(makeReq({ content: '' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toHaveProperty('error');
  });

  it('Returns 400 for whitespace-only content', async () => {
    const res = await POST(makeReq({ content: '   ' }));
    expect(res.status).toBe(400);
  });

  it('Returns 400 for content exceeding 1000 characters', async () => {
    const res = await POST(makeReq({ content: 'A'.repeat(1001) }));
    expect(res.status).toBe(400);
  });

  it('Returns 400 when content field is missing', async () => {
    const res = await POST(makeReq({}));
    expect(res.status).toBe(400);
  });

  it('Returns 400 for non-string content', async () => {
    const res = await POST(makeReq({ content: 123 }));
    expect(res.status).toBe(400);
  });

  it('Returns 400 for completely empty request body', async () => {
    const req = new NextRequest('http://localhost:3000/api/messages', { method: 'POST' });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('Returns 500 when repository throws RepositoryError', async () => {
    jest.spyOn(inMemoryRepo, 'save').mockRejectedValueOnce(new RepositoryError('DB error'));
    const res = await POST(makeReq({ content: 'test' }));
    expect(res.status).toBe(500);
  });

  it('Security: content with XSS payload is stored as-is', async () => {
    const payload = '<script>alert(1)</script>';
    const res = await POST(makeReq({ content: payload }));
    const body = await res.json();
    expect(body.content).toBe(payload);
  });

  it('Security: request with extra fields ignores them and returns 201', async () => {
    const res = await POST(makeReq({ content: 'valid', admin: true, id: 'inject' }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).not.toBe('inject'); // id is generated safely
  });
});
