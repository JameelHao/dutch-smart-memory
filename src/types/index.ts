/**
 * 单词数据模型
 */
export interface Word {
  id: string;
  dutch: string;
  chinese: string;
  pronunciation: string;
  example: string;
  exampleTranslation: string;
  audio?: string;
  category: WordCategory;
  level: LanguageLevel;
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
  difficultyCoefficient: number; // 1.0-3.0
  currentInterval: number; // 小时
  consecutiveCorrectDays: number;
  errorCount: number;
  nextReviewTime: number; // timestamp
  lastReviewTime: number; // timestamp
  status: WordStatus;
  createdAt: number;
  updatedAt: number;
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
  newWordsLearned: number;
  wordsReviewed: number;
  correctCount: number;
  wrongCount: number;
  totalTimeSpent: number; // 分钟
  averageStrength: number;
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
