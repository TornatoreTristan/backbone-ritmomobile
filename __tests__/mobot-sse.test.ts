import { createSseParser, type SseEvent } from '@/services/mobot-sse';

function collect(chunks: string[]): SseEvent[] {
  const events: SseEvent[] = [];
  const parser = createSseParser((event) => events.push(event));
  chunks.forEach((chunk) => parser.push(chunk));
  parser.flush();
  return events;
}

describe('createSseParser', () => {
  it('lit les événements token puis done', () => {
    const events = collect([
      'event: token\ndata: "Bon"\n\n',
      'event: token\ndata: "jour"\n\nevent: done\ndata: {"messageId":"m1"}\n\n',
    ]);

    expect(events).toEqual([
      { event: 'token', data: 'Bon' },
      { event: 'token', data: 'jour' },
      { event: 'done', data: { messageId: 'm1' } },
    ]);
  });

  it('recolle un événement coupé entre deux morceaux', () => {
    const events = collect(['event: tool_st', 'art\ndata: {"id":"t1","na', 'me":"get_folder"}\n', '\n']);

    expect(events).toEqual([{ event: 'tool_start', data: { id: 't1', name: 'get_folder' } }]);
  });

  it('accepte les fins de ligne CRLF', () => {
    const events = collect(['event: error\r\ndata: {"error":"quota_exceeded"}\r\n\r\n']);

    expect(events).toEqual([{ event: 'error', data: { error: 'quota_exceeded' } }]);
  });
});
