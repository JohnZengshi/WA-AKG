import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    session: {
      findUnique: vi.fn(),
    },
    message: {
      findMany: vi.fn(),
    },
    group: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('@/lib/api-auth', () => ({
  getAuthenticatedUser: vi.fn(),
  canAccessSession: vi.fn(),
}));

vi.mock('@/modules/whatsapp/chat.service', () => ({
  ChatService: {
    getMessages: vi.fn(),
  },
}));

describe('GET /api/chat/[sessionId]/[jid]', () => {
  beforeEach(async () => {
    vi.clearAllMocks();

    const { prisma } = await import('@/lib/prisma');
    const { getAuthenticatedUser, canAccessSession } = await import('@/lib/api-auth');

    vi.mocked(getAuthenticatedUser).mockResolvedValue({
      id: 'user-1',
      role: 'SUPERADMIN',
    } as never);
    vi.mocked(canAccessSession).mockResolvedValue(true);
    vi.mocked(prisma.session.findUnique).mockResolvedValue({ id: 'db-session-1' } as never);
    vi.mocked(prisma.message.findMany).mockResolvedValue([]);
  });

  it('uses the JID-aware chat service so phone JIDs include messages stored under LID', async () => {
    const messages = [
      {
        id: 'message-1',
        remoteJid: '18800000006426@lid',
        content: '你好',
      },
    ];
    const { ChatService } = await import('@/modules/whatsapp/chat.service');
    vi.mocked(ChatService.getMessages).mockResolvedValue(messages as never);

    const { GET } = await import('@/app/api/chat/[sessionId]/[jid]/route');
    const request = new NextRequest(
      'http://localhost/api/chat/session-1/8617688944562%40s.whatsapp.net',
    );
    const response = await GET(request, {
      params: Promise.resolve({
        sessionId: 'session-1',
        jid: '8617688944562%40s.whatsapp.net',
      }),
    });

    expect(ChatService.getMessages).toHaveBeenCalledWith(
      'db-session-1',
      '8617688944562@s.whatsapp.net',
      100,
    );
    await expect(response.json()).resolves.toMatchObject({
      status: true,
      data: messages,
    });
  });
});
