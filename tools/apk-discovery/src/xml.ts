interface XmlNode {
  name: string;
  attrs: Record<string, string>;
  children: XmlNode[];
}

interface XmlToken {
  kind: 'start' | 'end';
  name: string;
  attrs: Record<string, string>;
  selfClosing: boolean;
}

export function parseXmlDocument(xml: string): XmlNode {
  const tokens = tokenizeXml(xml);
  const root: XmlNode = { name: '__root__', attrs: {}, children: [] };
  const stack: XmlNode[] = [root];

  for (const token of tokens) {
    if (token.kind === 'start') {
      const node: XmlNode = { name: token.name, attrs: token.attrs, children: [] };
      stack[stack.length - 1]?.children.push(node);
      if (!token.selfClosing) {
        stack.push(node);
      }
      continue;
    }

    const current = stack.pop();
    if (!current || current.name !== token.name) {
      throw new Error(`Malformed AndroidManifest XML: unexpected closing tag ${token.name}.`);
    }
  }

  if (stack.length !== 1) {
    throw new Error('Malformed AndroidManifest XML: unclosed tags remain.');
  }

  const documentElement = root.children.find((child) => child.name !== '?xml');
  if (!documentElement) {
    throw new Error('Malformed AndroidManifest XML: missing document element.');
  }
  return documentElement;
}

export function attr(node: XmlNode, name: string): string | undefined {
  return node.attrs[name] ?? node.attrs[`android:${name}`];
}

export function directChildren(node: XmlNode, name: string): XmlNode[] {
  return node.children.filter((child) => child.name === name);
}

function tokenizeXml(xml: string): XmlToken[] {
  const cleaned = xml.replace(/<!--[\s\S]*?-->/g, '').replace(/<!\[CDATA\[[\s\S]*?]]>/g, '');
  const tokens: XmlToken[] = [];
  const tagPattern = /<([^>]+)>/g;
  let match: RegExpExecArray | null;

  while ((match = tagPattern.exec(cleaned)) !== null) {
    const rawTag = match[1]?.trim();
    if (!rawTag || rawTag.startsWith('!')) {
      continue;
    }
    if (rawTag.startsWith('?')) {
      continue;
    }
    if (rawTag.startsWith('/')) {
      tokens.push({
        kind: 'end',
        name: rawTag.slice(1).trim(),
        attrs: {},
        selfClosing: false
      });
      continue;
    }

    const selfClosing = rawTag.endsWith('/');
    const body = selfClosing ? rawTag.slice(0, -1).trim() : rawTag;
    const nameMatch = /^([^\s/>]+)/.exec(body);
    const name = nameMatch?.[1];
    if (!name) {
      throw new Error('Malformed AndroidManifest XML: invalid tag.');
    }

    tokens.push({
      kind: 'start',
      name,
      attrs: parseAttributes(body.slice(name.length)),
      selfClosing
    });
  }

  return tokens;
}

function parseAttributes(input: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const attrPattern = /([A-Za-z0-9_.:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
  let match: RegExpExecArray | null;
  while ((match = attrPattern.exec(input)) !== null) {
    const key = match[1];
    const value = match[2] ?? match[3] ?? '';
    if (key) {
      attrs[key] = decodeXmlEntities(value);
    }
  }
  return attrs;
}

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}
