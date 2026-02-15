/**
 * 复习调度器
 * 负责生成每日学习队列
 */

import type { Word, UserWordRecord, SessionWord, TestType } from '../types';
import { calculateForgetRisk } from './memoryEngine';

// 配置常量
const NEW_WORD_RATIO = 0.4; // 40% 新词
const REVIEW_WORD_RATIO = 0.6; // 60% 复习词

interface SchedulerConfig {
  dailyNewWords: number;
  maxReviewWords: number;
}

const DEFAULT_CONFIG: SchedulerConfig = {
  dailyNewWords: 5,
  maxReviewWords: 20,
};

/**
 * 获取到期需要复习的单词
 */
export function getDueWords(
  records: UserWordRecord[],
  now: number = Date.now()
): UserWordRecord[] {
  return records
    .filter(r => r.status !== 'new' && r.nextReviewTime <= now)
    .sort((a, b) => {
      // 优先复习高风险单词
      const riskA = calculateForgetRisk(a);
      const riskB = calculateForgetRisk(b);
      return riskB - riskA;
    });
}

/**
 * 获取新单词
 */
export function getNewWords(
  allWords: Word[],
  learnedWordIds: Set<string>,
  count: number
): Word[] {
  const newWords = allWords.filter(w => !learnedWordIds.has(w.id));
  return newWords.slice(0, count);
}

/**
 * 选择测试类型
 * 根据记忆强度和答题历史智能选择
 */
export function selectTestType(
  record: UserWordRecord | null,
  preferredTypes: TestType[] = ['choice', 'spelling', 'dictation']
): TestType {
  if (!record || record.status === 'new') {
    // 新词先用选择题
    return 'choice';
  }
  
  const strength = record.memoryStrength;
  
  if (strength < 30) {
    // 低强度用简单题型
    return 'choice';
  } else if (strength < 60) {
    // 中等强度可以用拼写
    return Math.random() > 0.5 ? 'choice' : 'spelling';
  } else {
    // 高强度用更难的题型
    const rand = Math.random();
    if (rand < 0.3) return 'choice';
    if (rand < 0.7) return 'spelling';
    return 'dictation';
  }
}

/**
 * 交叉混合新词和复习词
 */
function interleaveWords(
  newWords: SessionWord[],
  reviewWords: SessionWord[]
): SessionWord[] {
  const result: SessionWord[] = [];
  let newIndex = 0;
  let reviewIndex = 0;
  
  // 每 3-4 个复习词插入一个新词
  const insertInterval = 3;
  let counter = 0;
  
  while (newIndex < newWords.length || reviewIndex < reviewWords.length) {
    if (counter >= insertInterval && newIndex < newWords.length) {
      // 插入新词
      result.push(newWords[newIndex++]);
      counter = 0;
    } else if (reviewIndex < reviewWords.length) {
      // 插入复习词
      result.push(reviewWords[reviewIndex++]);
      counter++;
    } else if (newIndex < newWords.length) {
      // 只剩新词
      result.push(newWords[newIndex++]);
    }
  }
  
  return result;
}

/**
 * 生成每日学习队列
 */
export function generateDailyQueue(
  allWords: Word[],
  records: UserWordRecord[],
  config: SchedulerConfig = DEFAULT_CONFIG
): SessionWord[] {
  const now = Date.now();
  const learnedWordIds = new Set(records.map(r => r.wordId));
  
  // 获取到期复习词
  const dueRecords = getDueWords(records, now);
  const reviewCount = Math.min(dueRecords.length, config.maxReviewWords);
  const selectedReviewRecords = dueRecords.slice(0, reviewCount);

  // 计算新词数量
  // 如果有复习词，按 40/60 比例分配；如果没有复习词，直接使用 dailyNewWords
  let newWordCount: number;
  if (reviewCount > 0) {
    const totalWords = Math.round(reviewCount / REVIEW_WORD_RATIO);
    newWordCount = Math.min(
      config.dailyNewWords,
      Math.round(totalWords * NEW_WORD_RATIO)
    );
  } else {
    newWordCount = config.dailyNewWords;
  }

  // 获取新词
  const newWords = getNewWords(allWords, learnedWordIds, newWordCount);
  
  // 构建会话词列表
  const newSessionWords: SessionWord[] = newWords.map(word => ({
    wordId: word.id,
    isNew: true,
    testType: 'choice', // 新词用选择题
  }));
  
  const reviewSessionWords: SessionWord[] = selectedReviewRecords.map(record => ({
    wordId: record.wordId,
    isNew: false,
    testType: selectTestType(record),
  }));
  
  // 交叉混合
  return interleaveWords(newSessionWords, reviewSessionWords);
}

/**
 * 获取学习统计摘要
 */
export function getQueueSummary(queue: SessionWord[]): {
  totalWords: number;
  newWords: number;
  reviewWords: number;
  testTypes: Record<TestType, number>;
} {
  const summary = {
    totalWords: queue.length,
    newWords: queue.filter(w => w.isNew).length,
    reviewWords: queue.filter(w => !w.isNew).length,
    testTypes: {
      choice: 0,
      spelling: 0,
      dictation: 0,
    } as Record<TestType, number>,
  };
  
  queue.forEach(w => {
    summary.testTypes[w.testType]++;
  });
  
  return summary;
}

/**
 * 估算学习时间（分钟）
 */
export function estimateLearningTime(queue: SessionWord[]): number {
  // 每个单词平均时间：
  // 选择题 ~15秒，拼写题 ~25秒，听写题 ~35秒
  const timePerType: Record<TestType, number> = {
    choice: 15,
    spelling: 25,
    dictation: 35,
  };
  
  const totalSeconds = queue.reduce((sum, word) => {
    return sum + timePerType[word.testType];
  }, 0);
  
  return Math.ceil(totalSeconds / 60);
}
