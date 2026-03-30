import { Message } from './messageTypes';

export interface IMessageRepository {
  /**
   * Retrieves all messages, ordered by created_at descending (newest first).
   */
  findAll(): Promise<Message[]>;

  /**
   * Persists a new message and returns the created record.
   */
  save(content: string): Promise<Message>;

  /**
   * Deletes a message by its ID.
   * @throws NotFoundError if the message does not exist.
   * @throws RepositoryError if the underlying database operation fails.
   */
  deleteById(id: string): Promise<void>;
}
