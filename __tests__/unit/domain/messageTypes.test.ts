import { ValidationError, NotFoundError, RepositoryError } from '@/features/messages/messageTypes';

describe('Message Domain Error Types', () => {
  describe('ValidationError', () => {
    it('is an instance of Error', () => {
      const error = new ValidationError('test');
      expect(error).toBeInstanceOf(Error);
    });

    it('carries the provided message', () => {
      const error = new ValidationError('Invalid length');
      expect(error.message).toBe('Invalid length');
    });

    it('has name "ValidationError"', () => {
      const error = new ValidationError('test');
      expect(error.name).toBe('ValidationError');
    });

    it('is distinguishable from NotFoundError', () => {
      const error = new ValidationError('test');
      expect(error).not.toBeInstanceOf(NotFoundError);
    });
  });

  describe('NotFoundError', () => {
    it('is an instance of Error', () => {
      const error = new NotFoundError('test');
      expect(error).toBeInstanceOf(Error);
    });

    it('carries the provided message', () => {
      const error = new NotFoundError('Not found');
      expect(error.message).toBe('Not found');
    });

    it('has name "NotFoundError"', () => {
      const error = new NotFoundError('test');
      expect(error.name).toBe('NotFoundError');
    });

    it('is distinguishable from ValidationError', () => {
      const error = new NotFoundError('test');
      expect(error).not.toBeInstanceOf(ValidationError);
    });
  });

  describe('RepositoryError', () => {
    it('is an instance of Error', () => {
      const error = new RepositoryError('test');
      expect(error).toBeInstanceOf(Error);
    });

    it('carries the provided message', () => {
      const error = new RepositoryError('DB failure');
      expect(error.message).toBe('DB failure');
    });

    it('wraps an optional cause', () => {
      const originalError = new Error('original DB driver panic');
      const error = new RepositoryError('DB failure', { cause: originalError });
      expect(error.cause).toBe(originalError);
    });

    it('has name "RepositoryError"', () => {
      const error = new RepositoryError('test');
      expect(error.name).toBe('RepositoryError');
    });
  });
});
