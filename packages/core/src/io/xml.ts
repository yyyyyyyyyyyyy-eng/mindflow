// ============================================================================
// 轻量 XML 解析器（零 DOM 依赖，供 OPML 导入使用）。
// 支持范围（按 OPML 交换场景裁剪，防御式）：
// - 元素 / 自闭合标签 / 单双引号属性；
// - 五个预定义实体 + 十进制/十六进制数字字符引用（未知实体保持原样）；
// - CDATA、注释、处理指令（<?xml ...?> 等）、DOCTYPE（含内部子集 [] 与引号）。
// 不支持：外部实体、命名空间语义（仅按字面解析标签名）。
// 解析失败抛出带位置的中文错误。
// 本文件不在契约固定清单内，属 opml.ts 的内部实现，随 opml 一并集成。
// ============================================================================

export interface XmlElement {
  name: string;
  attrs: Record<string, string>;
  children: XmlElement[];
  text: string; // 直接字符数据（含 CDATA，实体已解码）
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'",
};

/** 数字字符引用 → 字符（非法码点返回空串，不抛错） */
function codePointToChar(code: number): string {
  if (!Number.isInteger(code) || code < 0 || code > 0x10ffff) return '';
  try {
    return String.fromCodePoint(code);
  } catch {
    return '';
  }
}

/** 实体解码：已知/数字实体替换，未知实体保持原样 */
function decodeEntities(str: string): string {
  return str.replace(/&(#x?[0-9a-fA-F]+|[A-Za-z][A-Za-z0-9]*);/g, (whole, body: string) => {
    if (body.startsWith('#x') || body.startsWith('#X')) return codePointToChar(parseInt(body.slice(2), 16));
    if (body.startsWith('#')) return codePointToChar(parseInt(body.slice(1), 10));
    return NAMED_ENTITIES[body] ?? whole;
  });
}

export function parseXml(input: string): XmlElement {
  const s = input.replace(/^\uFEFF/, '');
  let pos = 0;

  const fail = (msg: string): never => {
    throw new Error(`XML 解析错误（位置 ${pos}）：${msg}`);
  };
  const skipWs = (): void => {
    while (pos < s.length && /\s/.test(s[pos] ?? '')) pos++;
  };
  const skipUntil = (marker: string, what: string): void => {
    const end = s.indexOf(marker, pos);
    if (end < 0) fail(`${what}未闭合`);
    pos = end + marker.length;
  };
  /** DOCTYPE 跳过：处理引号串与内部子集 [] 嵌套 */
  const skipDoctype = (): void => {
    pos += 9; // '<!DOCTYPE'
    let depth = 0;
    let quote = '';
    while (pos < s.length) {
      const c = s[pos]!;
      if (quote !== '') {
        if (c === quote) quote = '';
        pos++;
      } else if (c === '"' || c === "'") {
        quote = c;
        pos++;
      } else if (c === '[') {
        depth++;
        pos++;
      } else if (c === ']') {
        depth--;
        pos++;
      } else if (c === '>' && depth <= 0) {
        pos++;
        return;
      } else {
        pos++;
      }
    }
    fail('DOCTYPE 未闭合');
  };
  /** 跳过文档级杂项（空白/PI/注释/DOCTYPE） */
  const skipMisc = (): void => {
    for (;;) {
      skipWs();
      if (s.startsWith('<?', pos)) { skipUntil('?>', '处理指令'); continue; }
      if (s.startsWith('<!--', pos)) { skipUntil('-->', '注释'); continue; }
      if (s.startsWith('<!DOCTYPE', pos)) { skipDoctype(); continue; }
      return;
    }
  };
  const parseName = (): string => {
    const start = pos;
    while (pos < s.length && /[A-Za-z0-9_:.\-]/.test(s[pos] ?? '')) pos++;
    if (pos === start) fail('期望元素名');
    return s.slice(start, pos);
  };
  const parseElement = (): XmlElement => {
    if (s[pos] !== '<') fail('期望 <');
    pos++;
    const name = parseName();
    const attrs: Record<string, string> = {};
    let selfClose = false;
    for (;;) {
      skipWs();
      const c = s[pos];
      if (c === '>') { pos++; break; }
      if (c === '/' && s[pos + 1] === '>') { pos += 2; selfClose = true; break; }
      if (c === undefined) fail(`</${name}> 未闭合`);
      const attrName = parseName();
      skipWs();
      if (s[pos] !== '=') fail(`属性 ${attrName} 缺少 =`);
      pos++;
      skipWs();
      const quote = s[pos];
      if (quote === undefined || (quote !== '"' && quote !== "'")) fail('属性值必须加引号');
      pos++;
      // tsgo 对经 never 调用的字面量收窄在此处未生效，显式断言为引号字符
      const quoteChar: '"' | "'" = quote as '"' | "'";
      const end = s.indexOf(quoteChar, pos);
      if (end < 0) fail('属性值未闭合');
      attrs[attrName] = decodeEntities(s.slice(pos, end));
      pos = end + 1;
    }
    const el: XmlElement = { name, attrs, children: [], text: '' };
    if (selfClose) return el;
    let text = '';
    for (;;) {
      if (pos >= s.length) fail(`</${name}> 未闭合`);
      if (s.startsWith('</', pos)) {
        pos += 2;
        const closeName = parseName();
        skipWs();
        if (s[pos] !== '>') fail('闭合标签格式错误');
        pos++;
        if (closeName !== name) fail(`闭合标签不匹配：期望 </${name}> 实际 </${closeName}>`);
        el.text = text;
        return el;
      }
      if (s.startsWith('<![CDATA[', pos)) {
        const end = s.indexOf(']]>', pos);
        if (end < 0) fail('CDATA 未闭合');
        text += s.slice(pos + 9, end);
        pos = end + 3;
        continue;
      }
      if (s.startsWith('<!--', pos)) { skipUntil('-->', '注释'); continue; }
      if (s.startsWith('<?', pos)) { skipUntil('?>', '处理指令'); continue; }
      if (s[pos] === '<') { el.children.push(parseElement()); continue; }
      const next = s.indexOf('<', pos);
      text += decodeEntities(next < 0 ? s.slice(pos) : s.slice(pos, next));
      pos = next < 0 ? s.length : next;
    }
  };

  skipMisc();
  const root = parseElement();
  return root;
}

// —— 导出用转义 ——

/** 元素文本转义 */
export function escapeXmlText(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** 属性值转义：XML 特殊字符 + 控制字符数字引用（保证换行无损往返） */
export function escapeXmlAttr(str: string): string {
  return escapeXmlText(str)
    .replace(/"/g, '&quot;')
    .replace(/\r/g, '&#13;')
    .replace(/\n/g, '&#10;')
    .replace(/\t/g, '&#9;');
}
