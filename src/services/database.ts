/**
 * SQLite 数据库服务
 * 负责单词和学习记录的持久化存储
 *
 * 表结构：
 * - words:             从 PDF 导入的单词数据（含冠词、频率排名）
 * - learning_progress: 用户学习进度 (SM-2 算法参数)
 * - settings:          用户设置 (key-value)
 * - daily_stats:       每日学习统计
 */

import {
  openDatabaseAsync,
  type SQLiteDatabase,
} from 'expo-sqlite/next';
import type {
  Word,
  UserWordRecord,
  UserSettings,
  DailyStats,
  WordCategory,
  LanguageLevel,
  WordStatus,
  VerbConjugation,
  NounInfo,
} from '../types';

const DB_NAME = 'dutch_smart_memory.db';

let db: SQLiteDatabase | null = null;

/**
 * 初始化数据库连接并建表
 */
export async function initDatabase(): Promise<void> {
  db = await openDatabaseAsync(DB_NAME);
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
      article TEXT,
      chinese TEXT DEFAULT '',
      pronunciation TEXT DEFAULT '',
      part_of_speech TEXT,
      example TEXT DEFAULT '',
      example_translation TEXT DEFAULT '',
      audio_url TEXT,
      category TEXT DEFAULT 'other',
      level TEXT DEFAULT 'A1',
      frequency_rank INTEGER,
      source TEXT DEFAULT 'pdf_import'
    );
  `);

  // 用户学习记录表
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS learning_progress (
      word_id TEXT PRIMARY KEY,
      memory_strength REAL DEFAULT 0,
      review_count INTEGER DEFAULT 0,
      correct_count INTEGER DEFAULT 0,
      interval_days REAL DEFAULT 1,
      easiness_factor REAL DEFAULT 2.5,
      next_review_time INTEGER NOT NULL,
      last_review_time INTEGER NOT NULL,
      status TEXT DEFAULT 'new',
      FOREIGN KEY (word_id) REFERENCES words(id)
    );
  `);

  // 用户设置表 (key-value)
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // 每日统计表
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS daily_stats (
      date TEXT PRIMARY KEY,
      words_learned INTEGER DEFAULT 0,
      words_reviewed INTEGER DEFAULT 0,
      correct_rate REAL DEFAULT 0,
      study_duration INTEGER DEFAULT 0,
      streak_days INTEGER DEFAULT 0,
      avg_strength REAL DEFAULT 0
    );
  `);

  // 兼容旧版：添加 avg_strength 列（如果不存在则忽略）
  try {
    await db.execAsync(`ALTER TABLE daily_stats ADD COLUMN avg_strength REAL DEFAULT 0`);
  } catch {
    // 列已存在，忽略
  }

  // 添加动词变位和名词信息列
  try {
    await db.execAsync(`ALTER TABLE words ADD COLUMN conjugation_json TEXT`);
  } catch {
    // 列已存在，忽略
  }
  try {
    await db.execAsync(`ALTER TABLE words ADD COLUMN noun_info_json TEXT`);
  } catch {
    // 列已存在，忽略
  }

  // 索引
  await db.execAsync(`
    CREATE INDEX IF NOT EXISTS idx_words_level ON words(level);
    CREATE INDEX IF NOT EXISTS idx_words_frequency ON words(frequency_rank);
    CREATE INDEX IF NOT EXISTS idx_progress_status ON learning_progress(status);
    CREATE INDEX IF NOT EXISTS idx_progress_next_review ON learning_progress(next_review_time);
    CREATE INDEX IF NOT EXISTS idx_stats_date ON daily_stats(date);
  `);
}

// ==================== Words ====================

/**
 * 批量导入单词（upsert）
 */
export async function importWords(words: Word[]): Promise<number> {
  if (!db) throw new Error('Database not initialized');

  let imported = 0;

  // 分批处理，每批 100 个
  const batchSize = 100;
  for (let i = 0; i < words.length; i += batchSize) {
    const batch = words.slice(i, i + batchSize);

    await db.withTransactionAsync(async () => {
      for (const word of batch) {
        await db!.runAsync(
          `INSERT OR REPLACE INTO words
           (id, dutch, article, chinese, pronunciation, part_of_speech,
            example, example_translation, audio_url, category, level, frequency_rank, source,
            conjugation_json, noun_info_json)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            word.id,
            word.dutch,
            word.article ?? null,
            word.chinese || '',
            word.pronunciation || '',
            word.partOfSpeech ?? null,
            word.example || '',
            word.exampleTranslation || '',
            word.audio ?? null,
            word.category,
            word.level,
            word.frequencyRank ?? null,
            word.source || 'pdf_import',
            word.conjugation ? JSON.stringify(word.conjugation) : null,
            word.nounInfo ? JSON.stringify(word.nounInfo) : null,
          ]
        );
        imported++;
      }
    });
  }

  return imported;
}

/**
 * 获取所有单词
 */
export async function getAllWords(): Promise<Word[]> {
  if (!db) throw new Error('Database not initialized');

  const rows = await db.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM words ORDER BY frequency_rank ASC'
  );

  return rows.map(rowToWord);
}

/**
 * 按级别获取单词
 */
export async function getWordsByLevel(level: LanguageLevel): Promise<Word[]> {
  if (!db) throw new Error('Database not initialized');

  const rows = await db.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM words WHERE level = ? ORDER BY frequency_rank ASC',
    [level]
  );

  return rows.map(rowToWord);
}

/**
 * 获取单词数量
 */
export async function getWordCount(): Promise<number> {
  if (!db) throw new Error('Database not initialized');

  const result = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM words'
  );

  return result?.count ?? 0;
}

function rowToWord(row: Record<string, unknown>): Word {
  let conjugation: VerbConjugation | undefined;
  if (row.conjugation_json) {
    try { conjugation = JSON.parse(row.conjugation_json as string); } catch { /* ignore */ }
  }
  let nounInfo: NounInfo | undefined;
  if (row.noun_info_json) {
    try { nounInfo = JSON.parse(row.noun_info_json as string); } catch { /* ignore */ }
  }

  return {
    id: row.id as string,
    dutch: row.dutch as string,
    article: row.article as string | null,
    chinese: (row.chinese as string) || '',
    pronunciation: (row.pronunciation as string) || '',
    partOfSpeech: row.part_of_speech as string | undefined,
    example: (row.example as string) || '',
    exampleTranslation: (row.example_translation as string) || '',
    audio: row.audio_url as string | undefined,
    category: ((row.category as string) || 'other') as WordCategory,
    level: ((row.level as string) || 'A1') as LanguageLevel,
    frequencyRank: row.frequency_rank as number | undefined,
    source: row.source as string | undefined,
    conjugation,
    nounInfo,
  };
}

// ==================== Learning Progress ====================

/**
 * 保存学习记录（upsert）
 */
export async function saveRecord(record: UserWordRecord): Promise<void> {
  if (!db) throw new Error('Database not initialized');

  await db.runAsync(
    `INSERT OR REPLACE INTO learning_progress
     (word_id, memory_strength, review_count, correct_count, interval_days,
      easiness_factor, next_review_time, last_review_time, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      record.wordId,
      record.memoryStrength,
      record.reviewCount,
      record.correctCount,
      record.intervalDays,
      record.easinessFactor,
      record.nextReviewTime,
      record.lastReviewTime,
      record.status,
    ]
  );
}

/**
 * 批量保存学习记录
 */
export async function saveRecords(records: UserWordRecord[]): Promise<void> {
  if (!db) throw new Error('Database not initialized');

  await db.withTransactionAsync(async () => {
    for (const record of records) {
      await db!.runAsync(
        `INSERT OR REPLACE INTO learning_progress
         (word_id, memory_strength, review_count, correct_count, interval_days,
          easiness_factor, next_review_time, last_review_time, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          record.wordId,
          record.memoryStrength,
          record.reviewCount,
          record.correctCount,
          record.intervalDays,
          record.easinessFactor,
          record.nextReviewTime,
          record.lastReviewTime,
          record.status,
        ]
      );
    }
  });
}

/**
 * 获取所有学习记录
 */
export async function getAllRecords(): Promise<UserWordRecord[]> {
  if (!db) throw new Error('Database not initialized');

  const rows = await db.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM learning_progress'
  );

  return rows.map(rowToRecord);
}

/**
 * 获取到期需要复习的记录
 */
export async function getDueRecords(now: number = Date.now()): Promise<UserWordRecord[]> {
  if (!db) throw new Error('Database not initialized');

  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM learning_progress
     WHERE status != 'new' AND next_review_time <= ?
     ORDER BY next_review_time ASC`,
    [now]
  );

  return rows.map(rowToRecord);
}

/**
 * 获取学习进度统计
 */
export async function getProgressStats(): Promise<{
  total: number;
  learning: number;
  reviewing: number;
  mastered: number;
}> {
  if (!db) throw new Error('Database not initialized');

  const result = await db.getFirstAsync<{
    total: number;
    learning: number;
    reviewing: number;
    mastered: number;
  }>(
    `SELECT
       COUNT(*) as total,
       SUM(CASE WHEN status = 'learning' THEN 1 ELSE 0 END) as learning,
       SUM(CASE WHEN status = 'reviewing' THEN 1 ELSE 0 END) as reviewing,
       SUM(CASE WHEN status = 'mastered' THEN 1 ELSE 0 END) as mastered
     FROM learning_progress`
  );

  return {
    total: result?.total ?? 0,
    learning: result?.learning ?? 0,
    reviewing: result?.reviewing ?? 0,
    mastered: result?.mastered ?? 0,
  };
}

function rowToRecord(row: Record<string, unknown>): UserWordRecord {
  return {
    wordId: row.word_id as string,
    memoryStrength: row.memory_strength as number,
    reviewCount: row.review_count as number,
    correctCount: row.correct_count as number,
    intervalDays: row.interval_days as number,
    easinessFactor: row.easiness_factor as number,
    nextReviewTime: row.next_review_time as number,
    lastReviewTime: row.last_review_time as number,
    status: row.status as WordStatus,
  };
}

// ==================== Settings ====================

/**
 * 保存设置
 */
export async function saveSettings(settings: UserSettings): Promise<void> {
  if (!db) throw new Error('Database not initialized');

  await db.withTransactionAsync(async () => {
    for (const [key, value] of Object.entries(settings)) {
      const serialized = typeof value === 'string' ? value : JSON.stringify(value);
      await db!.runAsync(
        'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
        [key, serialized]
      );
    }
  });
}

/**
 * 加载设置
 */
export async function loadSettings(): Promise<Partial<UserSettings>> {
  if (!db) throw new Error('Database not initialized');

  const rows = await db.getAllAsync<{ key: string; value: string }>(
    'SELECT key, value FROM settings'
  );

  const settings: Record<string, unknown> = {};
  for (const row of rows) {
    try {
      settings[row.key] = JSON.parse(row.value);
    } catch {
      settings[row.key] = row.value;
    }
  }

  return settings as Partial<UserSettings>;
}

// ==================== Daily Stats ====================

/**
 * 保存每日统计
 */
export async function saveDailyStats(stats: DailyStats): Promise<void> {
  if (!db) throw new Error('Database not initialized');

  await db.runAsync(
    `INSERT OR REPLACE INTO daily_stats
     (date, words_learned, words_reviewed, correct_rate, study_duration, streak_days, avg_strength)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      stats.date,
      stats.wordsLearned,
      stats.wordsReviewed,
      stats.correctRate,
      stats.studyDuration,
      stats.streakDays,
      stats.avgStrength,
    ]
  );
}

/**
 * 获取今日统计
 */
export async function getTodayStats(): Promise<DailyStats | null> {
  if (!db) throw new Error('Database not initialized');

  const today = new Date().toISOString().split('T')[0];
  const result = await db.getFirstAsync<Record<string, unknown>>(
    'SELECT * FROM daily_stats WHERE date = ?',
    [today]
  );

  if (!result) return null;

  return {
    date: result.date as string,
    wordsLearned: result.words_learned as number,
    wordsReviewed: result.words_reviewed as number,
    correctRate: result.correct_rate as number,
    studyDuration: result.study_duration as number,
    streakDays: result.streak_days as number,
    avgStrength: (result.avg_strength as number) || 0,
  };
}

/**
 * 获取最近 N 天的统计
 */
export async function getRecentStats(days: number = 7): Promise<DailyStats[]> {
  if (!db) throw new Error('Database not initialized');

  const rows = await db.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM daily_stats ORDER BY date DESC LIMIT ?',
    [days]
  );

  return rows.map((row) => ({
    date: row.date as string,
    wordsLearned: row.words_learned as number,
    wordsReviewed: row.words_reviewed as number,
    correctRate: row.correct_rate as number,
    studyDuration: row.study_duration as number,
    streakDays: row.streak_days as number,
    avgStrength: (row.avg_strength as number) || 0,
  }));
}

/**
 * 计算连续学习天数
 */
export async function getStreakDays(): Promise<number> {
  if (!db) throw new Error('Database not initialized');

  const rows = await db.getAllAsync<{ date: string }>(
    'SELECT date FROM daily_stats WHERE words_reviewed > 0 ORDER BY date DESC LIMIT 60'
  );

  if (rows.length === 0) return 0;

  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < 60; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(checkDate.getDate() - i);
    const dateStr = checkDate.toISOString().split('T')[0];

    if (rows.some(r => r.date === dateStr)) {
      streak++;
    } else {
      // 如果是今天没有记录，继续检查昨天（今天还没学也算连续）
      if (i === 0) continue;
      break;
    }
  }

  return streak;
}

// ==================== Utilities ====================

/**
 * 关闭数据库连接
 */
export async function closeDatabase(): Promise<void> {
  if (db) {
    await db.closeAsync();
    db = null;
  }
}

/**
 * 重置学习进度（保留单词数据）
 */
export async function resetProgress(): Promise<void> {
  if (!db) throw new Error('Database not initialized');

  await db.execAsync(`
    DELETE FROM learning_progress;
    DELETE FROM daily_stats;
    DELETE FROM settings;
  `);
}

/**
 * 重置所有数据（含单词）
 */
export async function resetDatabase(): Promise<void> {
  if (!db) throw new Error('Database not initialized');

  await db.execAsync(`
    DELETE FROM learning_progress;
    DELETE FROM daily_stats;
    DELETE FROM settings;
    DELETE FROM words;
  `);
}
