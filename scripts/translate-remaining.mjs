#!/usr/bin/env node
/**
 * 使用 Gemini 翻译剩余的荷兰语单词
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORDS_FILE = path.join(__dirname, '../src/data/words.json');
const BATCH_SIZE = 50; // 每批翻译的单词数

function translateBatch(dutchWords) {
  const wordList = dutchWords.join(', ');
  const prompt = `Translate these Dutch words to Chinese. Return ONLY a JSON object mapping each Dutch word to its Chinese translation. No explanation, just the JSON.

Dutch words: ${wordList}

Example format: {"hond": "狗", "kat": "猫"}`;

  try {
    const result = execSync(`gemini "${prompt.replace(/"/g, '\\"')}"`, {
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024,
      timeout: 120000
    });
    
    // 提取 JSON
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return {};
  } catch (error) {
    console.error('Error translating batch:', error.message);
    return {};
  }
}

async function main() {
  console.log('📚 使用 Gemini 翻译剩余单词...\n');
  
  // 读取单词文件
  const wordsData = fs.readFileSync(WORDS_FILE, 'utf-8');
  const words = JSON.parse(wordsData);
  
  // 找出未翻译的单词
  const untranslated = words.filter(w => !w.chinese || w.chinese.trim() === '');
  console.log(`📊 需要翻译 ${untranslated.length} 个单词\n`);
  
  let translated = 0;
  let failed = 0;
  
  // 分批翻译
  for (let i = 0; i < untranslated.length; i += BATCH_SIZE) {
    const batch = untranslated.slice(i, i + BATCH_SIZE);
    const dutchWords = batch.map(w => w.dutch);
    
    console.log(`🔄 翻译批次 ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(untranslated.length / BATCH_SIZE)} (${dutchWords.length} 词)...`);
    
    const translations = translateBatch(dutchWords);
    
    // 应用翻译
    for (const word of batch) {
      const dutch = word.dutch.toLowerCase();
      if (translations[dutch] || translations[word.dutch]) {
        word.chinese = translations[dutch] || translations[word.dutch];
        translated++;
      } else {
        failed++;
      }
    }
    
    // 每批保存一次（防止中断丢失进度）
    fs.writeFileSync(WORDS_FILE, JSON.stringify(words, null, 2));
    
    // 短暂延迟避免 rate limit
    await new Promise(r => setTimeout(r, 500));
  }
  
  console.log('\n✅ 翻译完成！');
  console.log(`   - 新翻译: ${translated}`);
  console.log(`   - 失败: ${failed}`);
}

main().catch(console.error);
