/**
 * 单词数据模型
 */
export interface Word {
  id: string;
  dutch: string;
  article?: string | null; // 冠词 de / het
  chinese: string;
  pronunciation: string;
  partOfSpeech?: string; // 词性 (noun, verb, adj, etc.)
  example: string;
  exampleTranslation: string;
  audio?: string;
  category: WordCategory;
  level: LanguageLevel;
  frequencyRank?: number; // 频率排名 (1 = 最常用)
  source?: string; // 来源 (pdf_import, manual, etc.)
}

export type LanguageLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

export type WordCategory =
  | 'basics'
  | 'numbers'
  | 'colors'
  | 'food'
  | 'family'
  | 'time'
  | 'weather'
  | 'travel'
  | 'work'
  | 'health'
  | 'shopping'
  | 'other';

/**
 * 用户单词学习记录
 */
export interface UserWordRecord {
  wordId: string;
  memoryStrength: number; // 0-100
  reviewCount: number; // 复习次数
  correctCount: number; // 正确次数
  intervalDays: number; // 当前复习间隔（天）
  easinessFactor: number; // SM-2 易度因子 (1.3-2.5)
  nextReviewTime: number; // timestamp
  lastReviewTime: number; // timestamp
  status: WordStatus;
}

export type WordStatus = 'new' | 'learning' | 'reviewing' | 'mastered';

/**
 * 用户自评结果
 */
export type SelfAssessment = 'remembered' | 'fuzzy' | 'forgotten';

/**
 * 测试类型
 */
export type TestType = 'choice' | 'spelling' | 'dictation';

/**
 * 答题结果
 */
export interface AnswerResult {
  wordId: string;
  testType: TestType;
  isCorrect: boolean;
  selfAssessment: SelfAssessment;
  answeredAt: number;
  timeTaken: number; // 毫秒
}

/**
 * 每日学习统计
 */
export interface DailyStats {
  date: string; // YYYY-MM-DD
  wordsLearned: number;
  wordsReviewed: number;
  correctRate: number; // 0-1
  studyDuration: number; // 秒
  streakDays: number;
  avgStrength: number; // 当日平均记忆强度 0-100
}

/**
 * 学习会话
 */
export interface LearningSession {
  id: string;
  startTime: number;
  endTime?: number;
  words: SessionWord[];
  completed: boolean;
}

export interface SessionWord {
  wordId: string;
  isNew: boolean;
  testType: TestType;
  result?: AnswerResult;
}

/**
 * 用户设置
 */
export interface UserSettings {
  dailyNewWords: number; // 5, 7, 10
  reminderTime: string; // HH:mm
  preferredTestTypes: TestType[];
  speechRate: number; // 0.5-2.0
  notificationsEnabled: boolean;
  soundEnabled: boolean;
}

/**
 * 风险等级
 */
export type RiskLevel = 'high' | 'medium' | 'low' | 'mastered';

export function getRiskLevel(memoryStrength: number): RiskLevel {
  if (memoryStrength >= 86) return 'mastered';
  if (memoryStrength >= 61) return 'low';
  if (memoryStrength >= 31) return 'medium';
  return 'high';
}
