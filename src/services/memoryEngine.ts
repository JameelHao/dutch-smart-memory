/**
 * 记忆算法引擎
 * 基于 SM-2 间隔重复算法的改进版本
 */

import type { UserWordRecord, SelfAssessment, AnswerResult } from '../types';

// 常量配置
const MIN_INTERVAL_DAYS = 1;
const MAX_INTERVAL_DAYS = 365;
const MASTERY_THRESHOLD = 85;
const MIN_EASINESS_FACTOR = 1.3;
const DEFAULT_EASINESS_FACTOR = 2.5;

/**
 * 将自评结果转换为 SM-2 质量分数 (0-5)
 */
function selfAssessmentToQuality(
  isCorrect: boolean,
  selfAssessment: SelfAssessment
): number {
  if (!isCorrect) {
    return selfAssessment === 'forgotten' ? 0 : 1;
  }
  
  switch (selfAssessment) {
    case 'remembered':
      return 5; // 完美回忆
    case 'fuzzy':
      return 3; // 有些困难但正确
    case 'forgotten':
      return 2; // 几乎忘了但最终想起
    default:
      return 3;
  }
}

/**
 * SM-2 算法：计算新的易度因子
 */
function calculateNewEasinessFactor(
  currentEF: number,
  quality: number
): number {
  // EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  const newEF = currentEF + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  return Math.max(MIN_EASINESS_FACTOR, newEF);
}

/**
 * 计算新的复习间隔（天）
 */
function calculateNewInterval(
  currentInterval: number,
  reviewCount: number,
  easinessFactor: number,
  quality: number
): number {
  if (quality < 3) {
    // 答错，重置间隔
    return MIN_INTERVAL_DAYS;
  }
  
  if (reviewCount === 0) {
    return 1;
  } else if (reviewCount === 1) {
    return 6;
  } else {
    const newInterval = currentInterval * easinessFactor;
    return Math.min(MAX_INTERVAL_DAYS, Math.round(newInterval));
  }
}

/**
 * 计算记忆强度变化
 */
function calculateStrengthChange(quality: number, currentStrength: number): number {
  // 根据答题质量调整记忆强度
  const baseChange = (quality - 2.5) * 8; // -20 to +20
  
  // 低强度时增长更快，高强度时增长更慢
  const factor = currentStrength < 50 ? 1.2 : 0.8;
  
  return Math.round(baseChange * factor);
}

/**
 * 更新单词学习记录
 */
export function updateWordRecord(
  record: UserWordRecord,
  result: AnswerResult
): UserWordRecord {
  const { isCorrect, selfAssessment, answeredAt } = result;
  
  // 计算质量分数
  const quality = selfAssessmentToQuality(isCorrect, selfAssessment);
  
  // 更新易度因子
  const newEF = calculateNewEasinessFactor(record.easinessFactor, quality);
  
  // 更新复习次数
  const newReviewCount = quality >= 3 ? record.reviewCount + 1 : 0;
  
  // 计算新间隔
  const newInterval = calculateNewInterval(
    record.intervalDays,
    newReviewCount,
    newEF,
    quality
  );
  
  // 计算记忆强度变化
  const strengthChange = calculateStrengthChange(quality, record.memoryStrength);
  const newStrength = Math.min(100, Math.max(0, record.memoryStrength + strengthChange));
  
  // 更新正确次数
  const newCorrectCount = isCorrect ? record.correctCount + 1 : record.correctCount;
  
  // 计算下次复习时间
  const nextReviewTime = answeredAt + newInterval * 24 * 60 * 60 * 1000;
  
  // 确定状态
  let status = record.status;
  if (status === 'new') {
    status = 'learning';
  } else if (newStrength >= MASTERY_THRESHOLD && newReviewCount >= 5) {
    status = 'mastered';
  } else if (newStrength >= 50) {
    status = 'reviewing';
  }
  
  return {
    wordId: record.wordId,
    memoryStrength: newStrength,
    reviewCount: newReviewCount,
    correctCount: newCorrectCount,
    intervalDays: newInterval,
    easinessFactor: newEF,
    nextReviewTime,
    lastReviewTime: answeredAt,
    status,
  };
}

/**
 * 创建新的学习记录
 */
export function createNewRecord(wordId: string): UserWordRecord {
  const now = Date.now();
  return {
    wordId,
    memoryStrength: 0,
    reviewCount: 0,
    correctCount: 0,
    intervalDays: MIN_INTERVAL_DAYS,
    easinessFactor: DEFAULT_EASINESS_FACTOR,
    nextReviewTime: now,
    lastReviewTime: now,
    status: 'new',
  };
}

/**
 * 计算遗忘风险分数
 * 返回 0-100，越高越危险
 */
export function calculateForgetRisk(record: UserWordRecord): number {
  const now = Date.now();
  const timeSinceReview = now - record.lastReviewTime;
  const intervalMs = record.intervalDays * 24 * 60 * 60 * 1000;
  
  // 超时比例
  const overdueRatio = Math.max(0, (timeSinceReview - intervalMs) / intervalMs);
  
  // 基于记忆强度的基础风险
  const baseRisk = 100 - record.memoryStrength;
  
  // 综合风险 = 基础风险 + 超时加成
  const totalRisk = baseRisk + overdueRatio * 30;
  
  return Math.min(100, Math.max(0, Math.round(totalRisk)));
}

/**
 * 判断单词是否需要复习
 */
export function isDueForReview(record: UserWordRecord): boolean {
  return record.nextReviewTime <= Date.now();
}

/**
 * 获取记忆状态描述
 */
export function getMemoryStatusText(strength: number): string {
  if (strength >= 85) return '已掌握';
  if (strength >= 60) return '熟悉';
  if (strength >= 30) return '学习中';
  return '需加强';
}

/**
 * 获取下次复习时间的友好描述
 */
export function getNextReviewText(nextReviewTime: number): string {
  const now = Date.now();
  const diff = nextReviewTime - now;
  
  if (diff <= 0) return '现在';
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    return `${days} 天后`;
  } else if (hours > 0) {
    return `${hours} 小时后`;
  } else {
    const minutes = Math.floor(diff / (1000 * 60));
    return `${minutes} 分钟后`;
  }
}
