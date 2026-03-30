import { DELETE } from '@/app/api/messages/[id]/route';
import { NextRequest } from 'next/server';
import { InMemoryMessageRepository } from '@/features/messages/adapters/inMemory/inMemoryMessageRepository';
import { createMessageRepository } from '@/features/messages/messageRepositoryFactory';
import { RepositoryError } from '@/features/messages/messageTypes';

// Mock the factory to return our in-memory repository
jest.mock('@/features/messages/messageRepositoryFactory');

describe('DELETE /api/messages/[id]', () => {
  let inMemoryRepo: InMemoryMessageRepository;
  
  beforeEach(() => {
    inMemoryRepo = new InMemoryMessageRepository();
    (createMessageRepository as jest.Mock).mockReturnValue(inMemoryRepo);
  });

  const makeReq = (url: string) => {
    return new NextRequest(url, { method: 'DELETE' });
  };

  it('Returns 204 No Content for an existing message id', async () => {
    const msg = await inMemoryRepo.save('to delete');
    const res = await DELETE(makeReq(`http://localhost:3000/api/messages/${msg.id}`), { params: Promise.resolve({ id: msg.id }) });
    expect(res.status).toBe(204);
  });

  it('Returns 404 for a valid UUID that does not exist', async () => {
    const id = '123e4567-e89b-42d3-a456-426614174000';
    const res = await DELETE(makeReq(`http://localhost:3000/api/messages/${id}`), { params: Promise.resolve({ id }) });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body).toHaveProperty('error');
  });

  it('Returns 400 for a non-UUID id parameter', async () => {
    // Some basic validation in the route handler before calling service
    const res = await DELETE(makeReq(`http://localhost:3000/api/messages/abc`), { params: Promise.resolve({ id: 'abc' }) });
    expect(res.status).toBe(400);
  });

  it('Returns 400 for an empty id parameter', async () => {
    const res = await DELETE(makeReq(`http://localhost:3000/api/messages/`), { params: Promise.resolve({ id: '' }) });
    expect(res.status).toBe(400);
  });

  it('Returns 500 when repository throws RepositoryError', async () => {
    const msg = await inMemoryRepo.save('to delete');
    jest.spyOn(inMemoryRepo, 'deleteById').mockRejectedValueOnce(new RepositoryError('DB error'));
    
    const res = await DELETE(makeReq(`http://localhost:3000/api/messages/${msg.id}`), { params: Promise.resolve({ id: msg.id }) });
    expect(res.status).toBe(500);
  });

  it('Message is not retrievable after successful deletion', async () => {
    const msg = await inMemoryRepo.save('to delete');
    await DELETE(makeReq(`http://localhost:3000/api/messages/${msg.id}`), { params: Promise.resolve({ id: msg.id }) });
    
    const all = await inMemoryRepo.findAll();
    expect(all).toEqual([]);
  });

  it('Security: ID path traversal attempt returns 400', async () => {
    const res = await DELETE(makeReq(`http://localhost:3000/api/messages/..%2F..%2Fsecret`), { params: Promise.resolve({ id: '../../secret' }) });
    expect(res.status).toBe(400);
  });
});
