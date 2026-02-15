/**
 * PDF 解析器
 * 从荷兰语学习 PDF 中提取单词数据
 */

import type { Word } from '../types';

/**
 * 解析后的单词数据
 */
export interface ParsedWord {
  dutch: string;
  chinese: string;
  pronunciation?: string;
  partOfSpeech?: string;
  example?: string;
  confidence: number; // 解析置信度 0-1
}

/**
 * 解析结果
 */
export interface ParseResult {
  words: ParsedWord[];
  totalLines: number;
  parsedLines: number;
  errors: string[];
}

/**
 * 导入结果
 */
export interface ImportResult {
  success: boolean;
  imported: number;
  skipped: number;
  errors: string[];
}

/**
 * 词性映射
 */
const PART_OF_SPEECH_MAP: Record<string, string> = {
  'n.': 'noun',
  'v.': 'verb',
  'adj.': 'adjective',
  'adv.': 'adverb',
  'prep.': 'preposition',
  'conj.': 'conjunction',
  'pron.': 'pronoun',
  'art.': 'article',
  'num.': 'numeral',
  'interj.': 'interjection',
  // Dutch abbreviations
  'zn.': 'noun', // zelfstandig naamwoord
  'ww.': 'verb', // werkwoord
  'bn.': 'adjective', // bijvoeglijk naamwoord
  'bw.': 'adverb', // bijwoord
  'vz.': 'preposition', // voorzetsel
};

/**
 * 解析单行文本
 * 支持多种格式：
 * - "dutch - chinese"
 * - "dutch (n.) - chinese"
 * - "dutch /pronunciation/ - chinese"
 */
function parseLine(line: string): ParsedWord | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length < 3) return null;

  // 跳过页码、标题等
  if (/^(page|pagina|chapter|hoofdstuk|\d+$)/i.test(trimmed)) return null;
  if (trimmed.startsWith('#') || trimmed.startsWith('//')) return null;

  let dutch = '';
  let chinese = '';
  let pronunciation = '';
  let partOfSpeech = '';
  let confidence = 1.0;

  // 尝试不同的分隔符
  const separators = [' - ', ' – ', ' — ', '\t', '  ', '=', ':'];
  let parts: string[] = [];

  for (const sep of separators) {
    if (trimmed.includes(sep)) {
      parts = trimmed.split(sep).map(p => p.trim()).filter(Boolean);
      if (parts.length >= 2) break;
    }
  }

  if (parts.length < 2) {
    // 尝试按中文字符分割
    const chineseMatch = trimmed.match(/([a-zA-Zäëïöüàèìòùáéíóú\s\-']+)(.+)/);
    if (chineseMatch) {
      parts = [chineseMatch[1].trim(), chineseMatch[2].trim()];
      confidence = 0.7;
    } else {
      return null;
    }
  }

  dutch = parts[0];
  chinese = parts[parts.length - 1];

  // 提取发音 (在斜杠或方括号中)
  const pronMatch = dutch.match(/[\/\[](.*?)[\/\]]/);
  if (pronMatch) {
    pronunciation = pronMatch[1];
    dutch = dutch.replace(/[\/\[].*?[\/\]]/, '').trim();
  }

  // 提取词性 (在括号中)
  const posMatch = dutch.match(/\(([a-z.]+)\)/i);
  if (posMatch) {
    const pos = posMatch[1].toLowerCase();
    partOfSpeech = PART_OF_SPEECH_MAP[pos] || pos;
    dutch = dutch.replace(/\([a-z.]+\)/i, '').trim();
  }

  // 清理荷兰语单词
  dutch = dutch.replace(/^[\d.)\-]+/, '').trim();
  dutch = dutch.replace(/[,;.!?]$/, '').trim();

  // 验证结果
  if (!dutch || !chinese) return null;
  if (dutch.length < 1 || chinese.length < 1) return null;
  
  // 检测可能的解析错误
  if (/[0-9]{3,}/.test(dutch)) {
    confidence *= 0.5;
  }
  if (dutch.length > 50 || chinese.length > 100) {
    confidence *= 0.6;
  }

  return {
    dutch,
    chinese,
    pronunciation: pronunciation || undefined,
    partOfSpeech: partOfSpeech || undefined,
    confidence,
  };
}

/**
 * 解析文本内容
 */
export function parseTextContent(content: string): ParseResult {
  const lines = content.split('\n');
  const words: ParsedWord[] = [];
  const errors: string[] = [];
  let parsedLines = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    try {
      const parsed = parseLine(line);
      if (parsed) {
        // 检查重复
        const exists = words.some(w => 
          w.dutch.toLowerCase() === parsed.dutch.toLowerCase()
        );
        if (!exists) {
          words.push(parsed);
          parsedLines++;
        }
      }
    } catch (error) {
      errors.push(`Line ${i + 1}: ${error}`);
    }
  }

  return {
    words,
    totalLines: lines.length,
    parsedLines,
    errors,
  };
}

/**
 * 将解析的单词转换为 Word 类型
 */
export function toWord(parsed: ParsedWord, index: number): Word {
  const id = `imported_${Date.now()}_${index}`;
  
  return {
    id,
    dutch: parsed.dutch,
    chinese: parsed.chinese,
    pronunciation: parsed.pronunciation || '',
    partOfSpeech: parsed.partOfSpeech,
    example: parsed.example || '',
    exampleTranslation: '',
    category: detectCategory(parsed.dutch, parsed.chinese),
    level: 'A1', // 默认级别，可后续调整
  };
}

/**
 * 根据单词内容推测分类
 */
function detectCategory(dutch: string, chinese: string): string {
  const combined = (dutch + ' ' + chinese).toLowerCase();
  
  const categoryPatterns: [string, RegExp][] = [
    ['numbers', /\b(een|twee|drie|vier|vijf|zes|zeven|acht|negen|tien|一|二|三|四|五|六|七|八|九|十|百|千|数字|nummer)\b/i],
    ['colors', /\b(rood|blauw|groen|geel|wit|zwart|oranje|paars|roze|红|蓝|绿|黄|白|黑|橙|紫|粉|颜色|kleur)\b/i],
    ['food', /\b(eten|drinken|water|brood|koffie|thee|vlees|vis|fruit|groente|吃|喝|水|面包|咖啡|茶|肉|鱼|水果|蔬菜|食物)\b/i],
    ['family', /\b(moeder|vader|kind|zoon|dochter|broer|zus|opa|oma|妈|爸|父|母|儿|女|兄|弟|姐|妹|爷|奶|家庭|familie)\b/i],
    ['time', /\b(dag|week|maand|jaar|uur|minuut|morgen|avond|nacht|天|周|月|年|小时|分钟|早|晚|夜|时间|tijd)\b/i],
    ['basics', /\b(hallo|dag|ja|nee|dank|alstublieft|sorry|你好|再见|是|不|谢|请|抱歉|基础|basis)\b/i],
  ];

  for (const [category, pattern] of categoryPatterns) {
    if (pattern.test(combined)) {
      return category;
    }
  }

  return 'other';
}

/**
 * 验证解析结果
 */
export function validateWords(words: ParsedWord[]): {
  valid: ParsedWord[];
  invalid: ParsedWord[];
} {
  const valid: ParsedWord[] = [];
  const invalid: ParsedWord[] = [];

  for (const word of words) {
    if (
      word.dutch.length >= 1 &&
      word.chinese.length >= 1 &&
      word.confidence >= 0.5 &&
      !/^\d+$/.test(word.dutch) // 不是纯数字
    ) {
      valid.push(word);
    } else {
      invalid.push(word);
    }
  }

  return { valid, invalid };
}

/**
 * 批量转换为 Word 数组
 */
export function convertToWords(parsed: ParsedWord[]): Word[] {
  return parsed.map((p, i) => toWord(p, i));
}

/**
 * 解析示例（用于测试）
 */
export const SAMPLE_INPUT = `
hallo - 你好
dank je (interj.) - 谢谢
goedemorgen /ˌɣudəˈmɔrɣə/ - 早上好
water (n.) - 水
een - 一
twee - 二
rood (adj.) - 红色
`;

/**
 * 测试解析器
 */
export function testParser(): ParseResult {
  return parseTextContent(SAMPLE_INPUT);
}
