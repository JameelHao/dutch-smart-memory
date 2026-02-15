/**
 * SQLite 数据库服务
 * 负责单词和学习记录的持久化存储
 */

import * as SQLite from 'expo-sqlite';
import type { Word, UserWordRecord, DailyStats } from '../types';

const DB_NAME = 'dutch_smart_memory.db';

let db: SQLite.SQLiteDatabase | null = null;

/**
 * 初始化数据库连接
 */
export async function initDatabase(): Promise<void> {
  db = await SQLite.openDatabaseAsync(DB_NAME);
  await createTables();
}

/**
 * 创建数据库表
 */
async function createTables(): Promise<void> {
  if (!db) throw new Error('Database not initialized');

  // 单词表
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS words (
      id TEXT PRIMARY KEY,
      dutch TEXT NOT NULL,
      chinese TEXT NOT NULL,
      pronunciation TEXT,
      part_of_speech TEXT,
      example TEXT,
      example_translation TEXT,
      category TEXT,
      level TEXT,
      audio_url TEXT,
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      source TEXT DEFAULT 'manual'
    );
  `);

  // 用户学习记录表
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS user_records (
      id TEXT PRIMARY KEY,
      word_id TEXT NOT NULL,
      memory_strength REAL DEFAULT 0,
      review_count INTEGER DEFAULT 0,
      correct_count INTEGER DEFAULT 0,
      last_review_time INTEGER,
      next_review_time INTEGER,
      interval_days REAL DEFAULT 1,
      easiness_factor REAL DEFAULT 2.5,
      status TEXT DEFAULT 'new',
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      FOREIGN KEY (word_id) REFERENCES words(id)
    );
  `);

  // 每日统计表
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS daily_stats (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL UNIQUE,
      words_learned INTEGER DEFAULT 0,
      words_reviewed INTEGER DEFAULT 0,
      correct_rate REAL DEFAULT 0,
      study_duration INTEGER DEFAULT 0,
      streak_days INTEGER DEFAULT 0
    );
  `);

  // 创建索引
  await db.execAsync(`
    CREATE INDEX IF NOT EXISTS idx_words_category ON words(category);
    CREATE INDEX IF NOT EXISTS idx_words_level ON words(level);
    CREATE INDEX IF NOT EXISTS idx_records_word_id ON user_records(word_id);
    CREATE INDEX IF NOT EXISTS idx_records_next_review ON user_records(next_review_time);
    CREATE INDEX IF NOT EXISTS idx_stats_date ON daily_stats(date);
  `);
}

/**
 * 插入或更新单词
 */
export async function upsertWord(word: Word): Promise<void> {
  if (!db) throw new Error('Database not initialized');

  await db.runAsync(
    `INSERT OR REPLACE INTO words 
     (id, dutch, chinese, pronunciation, part_of_speech, example, example_translation, category, level, source)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      word.id,
      word.dutch,
      word.chinese,
      word.pronunciation || null,
      word.partOfSpeech || null,
      word.example || null,
      word.exampleTranslation || null,
      word.category || null,
      word.level || null,
      'pdf_import',
    ]
  );
}

/**
 * 批量插入单词
 */
export async function insertWords(words: Word[]): Promise<number> {
  if (!db) throw new Error('Database not initialized');

  let inserted = 0;
  
  await db.withTransactionAsync(async () => {
    for (const word of words) {
      try {
        await upsertWord(word);
        inserted++;
      } catch (error) {
        console.warn(`Failed to insert word: ${word.dutch}`, error);
      }
    }
  });

  return inserted;
}

/**
 * 获取所有单词
 */
export async function getAllWords(): Promise<Word[]> {
  if (!db) throw new Error('Database not initialized');

  const result = await db.getAllAsync<{
    id: string;
    dutch: string;
    chinese: string;
    pronunciation: string | null;
    part_of_speech: string | null;
    example: string | null;
    example_translation: string | null;
    category: string | null;
    level: string | null;
  }>('SELECT * FROM words ORDER BY created_at DESC');

  return result.map(row => ({
    id: row.id,
    dutch: row.dutch,
    chinese: row.chinese,
    pronunciation: row.pronunciation || '',
    partOfSpeech: row.part_of_speech || undefined,
    example: row.example || '',
    exampleTranslation: row.example_translation || '',
    category: row.category || 'other',
    level: row.level || 'A1',
  }));
}

/**
 * 按分类获取单词
 */
export async function getWordsByCategory(category: string): Promise<Word[]> {
  if (!db) throw new Error('Database not initialized');

  const result = await db.getAllAsync<any>(
    'SELECT * FROM words WHERE category = ? ORDER BY dutch',
    [category]
  );

  return result.map(row => ({
    id: row.id,
    dutch: row.dutch,
    chinese: row.chinese,
    pronunciation: row.pronunciation || '',
    example: row.example || '',
    exampleTranslation: row.example_translation || '',
    category: row.category || 'other',
    level: row.level || 'A1',
  }));
}

/**
 * 获取单词数量
 */
export async function getWordCount(): Promise<number> {
  if (!db) throw new Error('Database not initialized');

  const result = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM words'
  );

  return result?.count || 0;
}

/**
 * 保存用户学习记录
 */
export async function saveUserRecord(record: UserWordRecord): Promise<void> {
  if (!db) throw new Error('Database not initialized');

  await db.runAsync(
    `INSERT OR REPLACE INTO user_records 
     (id, word_id, memory_strength, review_count, correct_count, 
      last_review_time, next_review_time, interval_days, easiness_factor, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      record.wordId, // 使用 wordId 作为 id
      record.wordId,
      record.memoryStrength,
      record.reviewCount,
      record.correctCount,
      record.lastReviewTime,
      record.nextReviewTime,
      record.intervalDays,
      record.easinessFactor,
      record.status,
    ]
  );
}

/**
 * 获取所有用户记录
 */
export async function getAllUserRecords(): Promise<UserWordRecord[]> {
  if (!db) throw new Error('Database not initialized');

  const result = await db.getAllAsync<any>('SELECT * FROM user_records');

  return result.map(row => ({
    wordId: row.word_id,
    memoryStrength: row.memory_strength,
    reviewCount: row.review_count,
    correctCount: row.correct_count,
    lastReviewTime: row.last_review_time,
    nextReviewTime: row.next_review_time,
    intervalDays: row.interval_days,
    easinessFactor: row.easiness_factor,
    status: row.status,
  }));
}

/**
 * 保存每日统计
 */
export async function saveDailyStats(stats: DailyStats): Promise<void> {
  if (!db) throw new Error('Database not initialized');

  const date = new Date(stats.date).toISOString().split('T')[0];

  await db.runAsync(
    `INSERT OR REPLACE INTO daily_stats 
     (id, date, words_learned, words_reviewed, correct_rate, study_duration, streak_days)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      date,
      date,
      stats.wordsLearned,
      stats.wordsReviewed,
      stats.correctRate,
      stats.studyDuration,
      stats.streakDays,
    ]
  );
}

/**
 * 获取今日统计
 */
export async function getTodayStats(): Promise<DailyStats | null> {
  if (!db) throw new Error('Database not initialized');

  const today = new Date().toISOString().split('T')[0];
  const result = await db.getFirstAsync<any>(
    'SELECT * FROM daily_stats WHERE date = ?',
    [today]
  );

  if (!result) return null;

  return {
    date: result.date,
    wordsLearned: result.words_learned,
    wordsReviewed: result.words_reviewed,
    correctRate: result.correct_rate,
    studyDuration: result.study_duration,
    streakDays: result.streak_days,
  };
}

/**
 * 删除所有数据（用于重置）
 */
export async function resetDatabase(): Promise<void> {
  if (!db) throw new Error('Database not initialized');

  await db.execAsync(`
    DELETE FROM user_records;
    DELETE FROM daily_stats;
    DELETE FROM words;
  `);
}

/**
 * 关闭数据库连接
 */
export async function closeDatabase(): Promise<void> {
  if (db) {
    await db.closeAsync();
    db = null;
  }
}
