import { NextRequest, NextResponse } from 'next/server';
import { createMessageRepository } from '@/features/messages/messageRepositoryFactory';
import { MessageService } from '@/features/messages/messageService';
import { NotFoundError, RepositoryError } from '@/features/messages/messageTypes';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rawId = (await params).id;
    
    if (!rawId) {
      return NextResponse.json({ error: 'Message ID is required' }, { status: 400 });
    }

    // Basic protection against path traversal / weird IDs that shouldn't be UUIDs
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(rawId)) {
      return NextResponse.json({ error: 'Invalid Message ID format' }, { status: 400 });
    }

    const repository = createMessageRepository();
    const service = new MessageService(repository);

    await service.deleteMessage(rawId);
    return new NextResponse(null, { status: 204 });
  } catch (err: unknown) {
    if (err instanceof NotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    if (err instanceof RepositoryError) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
