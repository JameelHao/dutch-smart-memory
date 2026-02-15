/**
 * 记忆算法引擎
 * 核心算法实现：动态难度模型 + 记忆曲线
 */

import type { UserWordRecord, SelfAssessment, AnswerResult } from '../types';

// 常量配置
const MIN_INTERVAL_HOURS = 4;
const MAX_INTERVAL_HOURS = 24 * 30; // 30 天
const MASTERY_THRESHOLD = 85;
const MASTERY_CONSECUTIVE_DAYS = 5;

interface StrengthUpdate {
  baseChange: number;
  intervalMultiplier: number;
}

const STRENGTH_RULES: Record<string, StrengthUpdate> = {
  'correct_remembered': { baseChange: 10, intervalMultiplier: 1.5 },
  'correct_fuzzy': { baseChange: 4, intervalMultiplier: 1.2 },
  'correct_forgotten': { baseChange: -12, intervalMultiplier: 0 }, // 重置
  'wrong_remembered': { baseChange: -12, intervalMultiplier: 0 },
  'wrong_fuzzy': { baseChange: -12, intervalMultiplier: 0 },
  'wrong_forgotten': { baseChange: -12, intervalMultiplier: 0 },
};

/**
 * 生成随机因子 (0.8 ~ 1.2)
 */
function getRandomFactor(): number {
  return 0.8 + Math.random() * 0.4;
}

/**
 * 计算记忆强度变化
 */
export function calculateStrengthChange(
  isCorrect: boolean,
  selfAssessment: SelfAssessment,
  currentStrength: number,
  difficultyCoefficient: number
): number {
  const key = `${isCorrect ? 'correct' : 'wrong'}_${selfAssessment}`;
  const rule = STRENGTH_RULES[key] || STRENGTH_RULES['wrong_forgotten'];
  
  const baseChange = rule.baseChange;
  const randomFactor = getRandomFactor();
  
  // 强度变化 = 基础增量 × 随机因子 / 难度系数
  const change = (baseChange * randomFactor) / difficultyCoefficient;
  
  return Math.round(change);
}

/**
 * 计算新的复习间隔
 */
export function calculateNewInterval(
  isCorrect: boolean,
  selfAssessment: SelfAssessment,
  currentInterval: number,
  memoryStrength: number
): number {
  const key = `${isCorrect ? 'correct' : 'wrong'}_${selfAssessment}`;
  const rule = STRENGTH_RULES[key] || STRENGTH_RULES['wrong_forgotten'];
  
  if (rule.intervalMultiplier === 0) {
    // 重置间隔
    return MIN_INTERVAL_HOURS;
  }
  
  // 新间隔 = 当前间隔 × 倍数因子 × (记忆强度/100 + 0.5)
  const strengthFactor = memoryStrength / 100 + 0.5;
  const newInterval = currentInterval * rule.intervalMultiplier * strengthFactor;
  
  return Math.min(MAX_INTERVAL_HOURS, Math.max(MIN_INTERVAL_HOURS, Math.round(newInterval)));
}

/**
 * 更新难度系数
 */
export function updateDifficultyCoefficient(
  currentCoefficient: number,
  isCorrect: boolean,
  consecutiveCorrect: number
): number {
  if (!isCorrect) {
    // 答错增加难度
    return Math.min(3.0, currentCoefficient + 0.2);
  }
  
  if (consecutiveCorrect >= 3) {
    // 连续3次答对降低难度
    return Math.max(1.0, currentCoefficient - 0.1);
  }
  
  return currentCoefficient;
}

/**
 * 判断是否达到掌握标准
 */
export function checkMastery(record: UserWordRecord): boolean {
  return (
    record.memoryStrength >= MASTERY_THRESHOLD &&
    record.consecutiveCorrectDays >= MASTERY_CONSECUTIVE_DAYS
  );
}

/**
 * 更新单词学习记录
 */
export function updateWordRecord(
  record: UserWordRecord,
  result: AnswerResult
): UserWordRecord {
  const { isCorrect, selfAssessment, answeredAt } = result;
  
  // 计算新的记忆强度
  const strengthChange = calculateStrengthChange(
    isCorrect,
    selfAssessment,
    record.memoryStrength,
    record.difficultyCoefficient
  );
  const newStrength = Math.min(100, Math.max(0, record.memoryStrength + strengthChange));
  
  // 计算新的复习间隔
  const newInterval = calculateNewInterval(
    isCorrect,
    selfAssessment,
    record.currentInterval,
    newStrength
  );
  
  // 更新连续答对天数
  const lastDate = new Date(record.lastReviewTime).toDateString();
  const currentDate = new Date(answeredAt).toDateString();
  const isNewDay = lastDate !== currentDate;
  
  let consecutiveCorrectDays = record.consecutiveCorrectDays;
  if (isCorrect && isNewDay) {
    consecutiveCorrectDays += 1;
  } else if (!isCorrect) {
    consecutiveCorrectDays = 0;
  }
  
  // 更新难度系数
  const newDifficulty = updateDifficultyCoefficient(
    record.difficultyCoefficient,
    isCorrect,
    consecutiveCorrectDays
  );
  
  // 计算下次复习时间
  const nextReviewTime = answeredAt + newInterval * 60 * 60 * 1000;
  
  // 更新错误次数
  const errorCount = isCorrect ? record.errorCount : record.errorCount + 1;
  
  // 确定状态
  let status = record.status;
  if (status === 'new') {
    status = 'learning';
  } else if (status === 'learning' && newStrength > 50) {
    status = 'reviewing';
  }
  
  const updated: UserWordRecord = {
    ...record,
    memoryStrength: newStrength,
    difficultyCoefficient: newDifficulty,
    currentInterval: newInterval,
    consecutiveCorrectDays,
    errorCount,
    nextReviewTime,
    lastReviewTime: answeredAt,
    status,
    updatedAt: answeredAt,
  };
  
  // 检查是否掌握
  if (checkMastery(updated)) {
    updated.status = 'mastered';
    // 掌握后设置低频复习间隔
    updated.currentInterval = 24 * 7; // 7 天
    updated.nextReviewTime = answeredAt + 7 * 24 * 60 * 60 * 1000;
  }
  
  return updated;
}

/**
 * 创建新的学习记录
 */
export function createNewRecord(wordId: string): UserWordRecord {
  const now = Date.now();
  return {
    wordId,
    memoryStrength: 0,
    difficultyCoefficient: 1.5, // 初始难度中等
    currentInterval: MIN_INTERVAL_HOURS,
    consecutiveCorrectDays: 0,
    errorCount: 0,
    nextReviewTime: now,
    lastReviewTime: now,
    status: 'new',
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * 计算遗忘风险分数
 * 返回 0-100，越高越危险
 */
export function calculateForgetRisk(record: UserWordRecord): number {
  const now = Date.now();
  const timeSinceReview = now - record.lastReviewTime;
  const intervalMs = record.currentInterval * 60 * 60 * 1000;
  
  // 超时比例
  const overdueRatio = Math.max(0, (timeSinceReview - intervalMs) / intervalMs);
  
  // 基于记忆强度的基础风险
  const baseRisk = 100 - record.memoryStrength;
  
  // 综合风险 = 基础风险 + 超时加成
  const totalRisk = baseRisk + overdueRatio * 30;
  
  return Math.min(100, Math.max(0, Math.round(totalRisk)));
}
