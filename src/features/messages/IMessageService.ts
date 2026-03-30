import { Message } from './messageTypes';

export interface IMessageService {
  /**
   * Retrieves all messages, newest first.
   */
  getMessages(): Promise<Message[]>;

  /**
   * Creates a new message.
   * @throws ValidationError if the content is empty or exceeds 1000 characters.
   */
  createMessage(content: string): Promise<Message>;

  /**
   * Deletes a message by its ID.
   * @throws NotFoundError if the message does not exist.
   */
  deleteMessage(id: string): Promise<void>;
}
