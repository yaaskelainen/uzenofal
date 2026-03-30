import { NextRequest, NextResponse } from 'next/server';
import { createMessageRepository } from '@/features/messages/messageRepositoryFactory';
import { MessageService } from '@/features/messages/messageService';
import { RepositoryError, ValidationError } from '@/features/messages/messageTypes';

export async function GET(req: NextRequest) {
  try {
    const repository = createMessageRepository();
    const service = new MessageService(repository);
    
    const messages = await service.getMessages();
    return NextResponse.json(messages, { status: 200 });
  } catch (err: unknown) {
    if (err instanceof RepositoryError) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const text = await req.text();
    if (!text) {
      return NextResponse.json({ error: 'Request body is empty' }, { status: 400 });
    }

    let body;
    try {
      body = JSON.parse(text);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    if (!('content' in body) || typeof body.content !== 'string') {
      return NextResponse.json({ error: 'Valid content string is required' }, { status: 400 });
    }

    const repository = createMessageRepository();
    const service = new MessageService(repository);

    const message = await service.createMessage(body.content);
    return NextResponse.json(message, { status: 201 });
  } catch (err: unknown) {
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err instanceof RepositoryError) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
