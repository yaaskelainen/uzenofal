import { SupabaseMessageRepository } from '@/features/messages/adapters/supabase/supabaseMessageRepository';
import { getSupabaseClient } from '@/features/messages/adapters/supabase/supabaseClient';
import { RepositoryError, NotFoundError } from '@/features/messages/messageTypes';

// Mock the client wrapper
jest.mock('@/features/messages/adapters/supabase/supabaseClient');

const mockSupabaseClient = {
  from: jest.fn(),
};

describe('SupabaseMessageRepository', () => {
  let repository: SupabaseMessageRepository;
  let mockSelect: jest.Mock;
  let mockInsert: jest.Mock;
  let mockDelete: jest.Mock;
  let mockEq: jest.Mock;
  let mockOrder: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    (getSupabaseClient as jest.Mock).mockReturnValue(mockSupabaseClient);

    mockOrder = jest.fn();
    mockSelect = jest.fn().mockReturnValue({ order: mockOrder });
    mockInsert = jest.fn().mockReturnValue({ select: jest.fn().mockReturnValue({ single: jest.fn() }) });
    mockEq = jest.fn();
    mockDelete = jest.fn().mockReturnValue({ eq: mockEq });

    mockSupabaseClient.from.mockImplementation(() => ({
      select: mockSelect,
      insert: mockInsert,
      delete: mockDelete,
    }));

    repository = new SupabaseMessageRepository();
  });

  describe('findAll', () => {
    it('calls Supabase with correct table, column order, and direction', async () => {
      mockOrder.mockResolvedValue({ data: [], error: null });
      await repository.findAll();
      
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('messages');
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false });
    });

    it('maps Supabase rows to domain Message objects', async () => {
      const mockData = [
        { id: '1', content: 'test', created_at: '2023-01-01' },
      ];
      mockOrder.mockResolvedValue({ data: mockData, error: null });
      
      const result = await repository.findAll();
      expect(result).toEqual(mockData);
    });

    it('returns empty array when Supabase returns no rows', async () => {
      mockOrder.mockResolvedValue({ data: null, error: null });
      const result = await repository.findAll();
      expect(result).toEqual([]);
    });

    it('throws RepositoryError when Supabase returns an error', async () => {
      const dbError = new Error('DB timeout');
      mockOrder.mockResolvedValue({ data: null, error: dbError });
      
      await expect(repository.findAll()).rejects.toBeInstanceOf(RepositoryError);
    });

    it('RepositoryError wraps the original Supabase error as .cause', async () => {
      const dbError = new Error('fail');
      mockOrder.mockResolvedValue({ data: null, error: dbError });
      
      try {
        await repository.findAll();
      } catch (err: any) {
        expect(err.cause).toBe(dbError);
      }
    });
  });

  describe('save', () => {
    let mockSingle: jest.Mock;
    let mockSelectAfterInsert: jest.Mock;

    beforeEach(() => {
      mockSingle = jest.fn();
      mockSelectAfterInsert = jest.fn().mockReturnValue({ single: mockSingle });
      mockInsert.mockReturnValue({ select: mockSelectAfterInsert });
    });

    it('calls Supabase insert with the correct payload', async () => {
      mockSingle.mockResolvedValue({ data: { id: '1', content: 'hello', created_at: 'now' }, error: null });
      await repository.save('hello');
      
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('messages');
      expect(mockInsert).toHaveBeenCalledWith({ content: 'hello' });
    });

    it('returns the created Message row mapped to the domain type', async () => {
      const mockSaved = { id: 'uuid', content: 'hello', created_at: 'iso' };
      mockSingle.mockResolvedValue({ data: mockSaved, error: null });
      
      const result = await repository.save('hello');
      expect(result).toEqual(mockSaved);
    });

    it('throws RepositoryError on Supabase insert error', async () => {
      mockSingle.mockResolvedValue({ data: null, error: new Error('insert fail') });
      await expect(repository.save('test')).rejects.toBeInstanceOf(RepositoryError);
    });

    it('throws RepositoryError when Supabase returns null data on save', async () => {
      mockSingle.mockResolvedValue({ data: null, error: null });
      await expect(repository.save('test')).rejects.toBeInstanceOf(RepositoryError);
    });
  });

  describe('deleteById', () => {
    beforeEach(() => {
      mockDelete.mockReturnValue({ eq: mockEq });
    });

    it('calls Supabase delete with correct eq filter', async () => {
      mockEq.mockResolvedValue({ status: 204, error: null }); 

      await repository.deleteById('123');
      
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('messages');
      expect(mockDelete).toHaveBeenCalled();
      expect(mockEq).toHaveBeenCalledWith('id', '123');
    });

    it('throws RepositoryError on Supabase delete error', async () => {
      mockEq.mockResolvedValue({ error: new Error('delete failed') });
      await expect(repository.deleteById('abc')).rejects.toBeInstanceOf(RepositoryError);
    });
  });
});
