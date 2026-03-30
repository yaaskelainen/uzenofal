import { IMessageRepository } from './IMessageRepository';
import { IMessageService } from './IMessageService';
import { Message, ValidationError } from './messageTypes';

export class MessageService implements IMessageService {
  private repository: IMessageRepository;

  constructor(repository: IMessageRepository) {
    this.repository = repository;
  }

  async getMessages(): Promise<Message[]> {
    return this.repository.findAll();
  }

  async createMessage(content: string): Promise<Message> {
    if (content === null || content === undefined) {
      throw new ValidationError('Message content is required');
    }
    
    // We only trim for the valid-character check, but we save the original content as requested
    const trimmed = content.trim();
    if (trimmed.length === 0) {
      throw new ValidationError('Message content cannot be empty');
    }

    if (content.length > 1000) {
      throw new ValidationError('Message content exceeds 1000 characters limit');
    }

    return this.repository.save(content);
  }

  async deleteMessage(id: string): Promise<void> {
    if (!id) {
      // Defer to repository to throw NotFoundError for empty id
      return this.repository.deleteById(id);
    }
    return this.repository.deleteById(id);
  }
}
