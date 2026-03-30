import { randomUUID } from 'crypto';
import { IMessageRepository } from '../../IMessageRepository';
import { Message, NotFoundError } from '../../messageTypes';

export class InMemoryMessageRepository implements IMessageRepository {
  private messages: Message[] = [];

  async findAll(): Promise<Message[]> {
    // Return a shallow copy to prevent mutation, sorted newest first
    return [...this.messages].sort((a, b) => {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }

  async save(content: string): Promise<Message> {
    const message: Message = {
      id: randomUUID(),
      content,
      created_at: new Date().toISOString(),
    };
    
    this.messages.push(message);
    return { ...message }; // Return copy to prevent mutation
  }

  async deleteById(id: string): Promise<void> {
    const index = this.messages.findIndex(m => m.id === id);
    if (index === -1) {
      throw new NotFoundError(`Message with id ${id} not found`);
    }
    this.messages.splice(index, 1);
  }
}
