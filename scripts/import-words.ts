/**
 * PDF 单词导入脚本
 *
 * 解析 5 个荷兰语频率词表 PDF，生成 src/data/words.json
 *
 * PDF 来源：Hazenberg & Hulstijn 频率词表
 * - Lijst-300-words.pdf:    最常用 300 词 (Woorden 1-300)
 * - Lijst-600-words.pdf:    第 301-600 词
 * - Lijst-1200-words.pdf:   第 601-1200 词
 * - Lijst-2000-words.pdf:   第 1201-2100 词
 * - Frequente_woorden-2000–5000.pdf: 第 2001-5000 词
 *
 * 用法：npx tsx scripts/import-words.ts
 */

import { execSync } from 'child_process';
import { writeFileSync } from 'fs';
import { join } from 'path';

interface RawWord {
  dutch: string;
  article?: string; // de / het
  frequencyRank: number; // 按出现顺序编号
  frequencyBand: string; // '1-300', '301-600', etc.
  level: string; // A1, A2, B1, B2
}

// PDF 文件配置
const PDF_CONFIGS = [
  {
    path: join(process.env.HOME!, 'Downloads', '366098417-Lijst-300-words.pdf'),
    band: '1-300',
    startRank: 1,
    level: 'A1',
    format: 'lijst', // 格式：单词 + 冠词，后面是数字列
  },
  {
    path: join(process.env.HOME!, 'Downloads', '366098506-Lijst-600-words.pdf'),
    band: '301-600',
    startRank: 301,
    level: 'A1',
    format: 'lijst',
  },
  {
    path: join(process.env.HOME!, 'Downloads', '366098609-Lijst-1200-words.pdf'),
    band: '601-1200',
    startRank: 601,
    level: 'A2',
    format: 'lijst',
  },
  {
    path: join(process.env.HOME!, 'Downloads', '366098760-Lijst-2000-words.pdf'),
    band: '1201-2100',
    startRank: 1201,
    level: 'B1',
    format: 'lijst',
  },
  {
    path: join(process.env.HOME!, 'Downloads', 'Frequente_woorden-2000–5000.pdf'),
    band: '2001-5000',
    startRank: 2001,
    level: 'B2',
    format: 'frequente', // 格式不同：冠词在括号中，有字母标题
  },
];

/**
 * 用 pdftotext 提取 PDF 文本
 */
function extractText(pdfPath: string): string {
  try {
    return execSync(`pdftotext "${pdfPath}" -`, { encoding: 'utf-8' });
  } catch (e) {
    console.error(`无法解析 PDF: ${pdfPath}`);
    throw e;
  }
}

/**
 * 解析 Lijst 格式 PDF (300/600/1200/2000)
 *
 * 格式特点：
 * - 每页分两列：左列是单词（带冠词 de/het），右列是频率数字 1/2/3
 * - pdftotext 把每页左列和右列分别提取
 * - 需要过滤掉纯数字行、标题行和空行
 */
function parseLijstFormat(text: string, config: typeof PDF_CONFIGS[0]): RawWord[] {
  const words: RawWord[] = [];
  const lines = text.split('\n');
  let rank = config.startRank;

  for (const line of lines) {
    const trimmed = line.trim();

    // 跳过空行
    if (!trimmed) continue;

    // 跳过标题行 (如 "Woorden 1-300")
    if (trimmed.startsWith('Woorden ')) continue;

    // 跳过纯数字行 (频率标记 1/2/3)
    if (/^\d+$/.test(trimmed)) continue;

    // 跳过括号注释行，如 "(bv)"
    if (/^\(.*\)$/.test(trimmed)) continue;

    // 跳过方括号开头的行，如 "dat [aanw]" 的续行 "[betrek"
    if (trimmed.startsWith('[')) continue;

    // 解析单词行：可能包含冠词 de/het
    const wordLine = trimmed;

    // 模式1: "woord de" 或 "woord het"
    const articleMatch = wordLine.match(/^(.+?)\s+(de|het)$/);
    // 模式2: 纯单词（可能含空格如 "dank je"）或带方括号注释
    // 模式3: 带 (vgl) 等注释
    const annotationMatch = wordLine.match(/^(.+?)\s+\(.*\)$/);

    let dutch: string;
    let article: string | undefined;

    if (articleMatch) {
      dutch = articleMatch[1].trim();
      article = articleMatch[2];
    } else if (annotationMatch) {
      dutch = annotationMatch[1].trim();
    } else {
      // 清理方括号注释
      dutch = wordLine.replace(/\s*\[.*?\]\s*/g, '').trim();
    }

    // 跳过空结果
    if (!dutch) continue;

    // 跳过含有方括号的不完整行
    if (dutch.includes('[') || dutch.includes(']')) continue;

    words.push({
      dutch,
      article,
      frequencyRank: rank++,
      frequencyBand: config.band,
      level: config.level,
    });
  }

  return words;
}

/**
 * 解析 Frequente 格式 PDF (2000-5000)
 *
 * 格式特点：
 * - 冠词在括号中，如 "aanbod (het)"
 * - 有单字母标题行 A, B, C...
 * - 有频率范围标题 "Frequentie 2001-3000"
 * - 末尾有说明文字
 */
function parseFrequenteFormat(text: string, config: typeof PDF_CONFIGS[0]): RawWord[] {
  const words: RawWord[] = [];
  const lines = text.split('\n');
  let rank = config.startRank;

  for (const line of lines) {
    const trimmed = line.trim();

    // 跳过空行
    if (!trimmed) continue;

    // 跳过标题/页眉
    if (trimmed.startsWith('Veel gebruikte')) continue;
    if (trimmed.startsWith('(Alle woorden')) continue;
    if (trimmed.startsWith('Frequentie ')) continue;
    if (trimmed.startsWith('Deze woordenlijsten')) continue;
    if (trimmed.startsWith('woorden zijn')) continue;
    if (trimmed.startsWith('samenstellers')) continue;
    if (trimmed.startsWith('gerangschikt')) continue;
    if (trimmed.startsWith('volwassenenonderwijs')) continue;

    // 跳过单字母标题行 (A, B, C...)
    if (/^[A-Z]$/.test(trimmed)) continue;

    // 跳过纯数字行（页码等）
    if (/^\d+$/.test(trimmed)) continue;

    // 跳过缩写行如 "B.V."
    if (/^[A-Z]\.[A-Z]\.$/.test(trimmed)) continue;

    // 跳过说明文字（包含长句子）
    if (trimmed.length > 60) continue;

    // 解析单词行
    // 模式: "woord (het)" 或 "woord (de)" 或纯单词
    const articleMatch = trimmed.match(/^(.+?)\s+\((de|het)\)$/);

    let dutch: string;
    let article: string | undefined;

    if (articleMatch) {
      dutch = articleMatch[1].trim();
      article = articleMatch[2];
    } else {
      dutch = trimmed;
    }

    // 跳过含括号的其他注释（非冠词），如 "alstublieft aub)"
    if (dutch.includes('(') || dutch.includes(')')) {
      // 尝试提取括号前的部分
      const cleanMatch = dutch.match(/^(\S+)/);
      if (cleanMatch) {
        dutch = cleanMatch[1];
      } else {
        continue;
      }
    }

    // 跳过空结果
    if (!dutch) continue;

    words.push({
      dutch,
      article,
      frequencyRank: rank++,
      frequencyBand: config.band,
      level: config.level,
    });
  }

  return words;
}

/**
 * 根据频率排名分配语言等级
 */
function assignLevel(rank: number): string {
  if (rank <= 300) return 'A1';
  if (rank <= 600) return 'A1';
  if (rank <= 1200) return 'A2';
  if (rank <= 2100) return 'B1';
  if (rank <= 3500) return 'B1';
  return 'B2';
}

/**
 * 根据频率排名分配分类（简单启发式）
 */
function assignCategory(dutch: string): string {
  // 这里只做简单分类，后续可以用更好的方法
  return 'other';
}

/**
 * 去重：相同的荷兰语单词只保留频率更高（rank更小）的
 */
function dedup(words: RawWord[]): RawWord[] {
  const seen = new Map<string, RawWord>();
  for (const w of words) {
    const key = w.dutch.toLowerCase();
    if (!seen.has(key) || w.frequencyRank < seen.get(key)!.frequencyRank) {
      seen.set(key, w);
    }
  }
  return Array.from(seen.values()).sort((a, b) => a.frequencyRank - b.frequencyRank);
}

// === 主流程 ===

console.log('🇳🇱 荷兰语频率词表 PDF 导入工具\n');

let allWords: RawWord[] = [];

for (const config of PDF_CONFIGS) {
  console.log(`📄 解析: ${config.band} (${config.path.split('/').pop()})`);

  const text = extractText(config.path);

  const words =
    config.format === 'frequente'
      ? parseFrequenteFormat(text, config)
      : parseLijstFormat(text, config);

  console.log(`   提取到 ${words.length} 个单词`);
  allWords.push(...words);
}

// 去重
const before = allWords.length;
allWords = dedup(allWords);
console.log(`\n🔄 去重: ${before} → ${allWords.length} 个唯一单词`);

// 转换为最终格式
const outputWords = allWords.map((w, i) => ({
  id: String(i + 1),
  dutch: w.dutch,
  article: w.article || null,
  chinese: '', // 需要后续翻译
  pronunciation: '',
  example: '',
  exampleTranslation: '',
  category: assignCategory(w.dutch),
  level: assignLevel(w.frequencyRank),
  frequencyRank: w.frequencyRank,
}));

// 统计
const stats = {
  total: outputWords.length,
  byLevel: {} as Record<string, number>,
  withArticle: outputWords.filter((w) => w.article).length,
};

for (const w of outputWords) {
  stats.byLevel[w.level] = (stats.byLevel[w.level] || 0) + 1;
}

console.log('\n📊 统计:');
console.log(`   总计: ${stats.total} 个单词`);
console.log(`   带冠词: ${stats.withArticle}`);
for (const [level, count] of Object.entries(stats.byLevel)) {
  console.log(`   ${level}: ${count} 个`);
}

// 写入 JSON
const outputPath = join(__dirname, '..', 'src', 'data', 'words.json');
writeFileSync(outputPath, JSON.stringify(outputWords, null, 2), 'utf-8');
console.log(`\n✅ 已写入: ${outputPath}`);
