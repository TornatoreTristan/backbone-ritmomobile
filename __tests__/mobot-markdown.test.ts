import { isTrustedMobotLink, parseInline, parseMarkdownBlocks } from '@/services/mobot-markdown';

describe('isTrustedMobotLink', () => {
  it('accepte Backbone et Google Drive en https', () => {
    expect(isTrustedMobotLink('https://backbone.ritmodiag.com/folders/1')).toBe(true);
    expect(isTrustedMobotLink('https://drive.google.com/file/d/abc')).toBe(true);
  });

  it('refuse les autres domaines et le http', () => {
    expect(isTrustedMobotLink('https://evil.example/?d=secret')).toBe(false);
    expect(isTrustedMobotLink('http://drive.google.com/file')).toBe(false);
    expect(isTrustedMobotLink('pas une url')).toBe(false);
  });
});

describe('parseInline', () => {
  it('découpe le gras et les liens de confiance', () => {
    expect(parseInline('CA **12 400 € HT** voir [le dossier](https://backbone.ritmodiag.com/folders/1)')).toEqual([
      { kind: 'text', text: 'CA ', bold: false },
      { kind: 'text', text: '12 400 € HT', bold: true },
      { kind: 'text', text: ' voir ', bold: false },
      { kind: 'link', text: 'le dossier', url: 'https://backbone.ritmodiag.com/folders/1' },
    ]);
  });

  it('garde le texte d’un lien externe sans le rendre cliquable', () => {
    expect(parseInline('[cliquez](https://evil.example)')).toEqual([
      { kind: 'text', text: 'cliquez', bold: false },
    ]);
  });
});

describe('parseMarkdownBlocks', () => {
  it('reconnaît titres, listes et paragraphes et ignore les images', () => {
    const blocks = parseMarkdownBlocks(
      '## Résumé\nLe dossier est\nsigné.\n\n- Point A\n2. Point B\n![x](https://evil.example/x.png)',
    );

    expect(blocks.map((block) => block.kind)).toEqual(['heading', 'paragraph', 'bullet', 'numbered']);
    expect(blocks[1]).toEqual({
      kind: 'paragraph',
      segments: [{ kind: 'text', text: 'Le dossier est signé.', bold: false }],
    });
    expect(JSON.stringify(blocks)).not.toContain('evil.example');
  });
});
