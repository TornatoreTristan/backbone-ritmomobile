export type SseEvent = { event: string; data: unknown };

/**
 * Découpe un flux Server-Sent Events arrivé par morceaux : un événement se
 * termine par une ligne vide, ses lignes `event:` et `data:` le décrivent.
 */
export function createSseParser(onEvent: (event: SseEvent) => void) {
  let buffer = '';

  function emit(block: string) {
    let event = 'message';
    const dataLines: string[] = [];
    for (const line of block.split('\n')) {
      if (line.startsWith('event:')) event = line.slice(6).trim();
      else if (line.startsWith('data:')) dataLines.push(line.slice(5).replace(/^ /, ''));
    }
    if (dataLines.length === 0) return;
    const raw = dataLines.join('\n');
    let data: unknown = raw;
    try {
      data = JSON.parse(raw);
    } catch {
      data = raw;
    }
    onEvent({ event, data });
  }

  return {
    push(chunk: string) {
      buffer += chunk.replace(/\r\n?/g, '\n');
      let separator = buffer.indexOf('\n\n');
      while (separator !== -1) {
        emit(buffer.slice(0, separator));
        buffer = buffer.slice(separator + 2);
        separator = buffer.indexOf('\n\n');
      }
    },
    flush() {
      if (buffer.trim()) emit(buffer);
      buffer = '';
    },
  };
}
