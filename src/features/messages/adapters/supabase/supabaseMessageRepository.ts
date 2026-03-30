import { IMessageRepository } from '../../IMessageRepository';
import { Message, RepositoryError, NotFoundError } from '../../messageTypes';
import { getSupabaseClient } from './supabaseClient';

export class SupabaseMessageRepository implements IMessageRepository {
  private get client() {
    return getSupabaseClient();
  }

  async findAll(): Promise<Message[]> {
    try {
      const { data, error } = await this.client
        .from('messages')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw new RepositoryError('Failed to retrieve messages from Supabase', { cause: error });
      }

      return (data || []) as Message[];
    } catch (err: unknown) {
      if (err instanceof RepositoryError) throw err;
      throw new RepositoryError('Unexpected error retrieving messages', { cause: err });
    }
  }

  async save(content: string): Promise<Message> {
    try {
      const { data, error } = await this.client
        .from('messages')
        .insert({ content })
        .select()
        .single();

      if (error || !data) {
        throw new RepositoryError('Failed to insert message into Supabase', { cause: error });
      }

      return data as Message;
    } catch (err: unknown) {
      if (err instanceof RepositoryError) throw err;
      throw new RepositoryError('Unexpected error inserting message', { cause: err });
    }
  }

  async deleteById(id: string): Promise<void> {
    try {
      const { error } = await this.client
        .from('messages')
        .delete()
        .eq('id', id);

      if (error) {
        throw new RepositoryError(`Failed to delete message with id ${id}`, { cause: error });
      }
    } catch (err: unknown) {
      if (err instanceof RepositoryError || err instanceof NotFoundError) throw err;
      throw new RepositoryError('Unexpected error deleting message', { cause: err });
    }
  }
}
