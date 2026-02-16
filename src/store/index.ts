/**
 * Zustand 状态管理
 */

import { create } from 'zustand';
import type {
  Word,
  UserWordRecord,
  LearningSession,
  UserSettings,
  DailyStats,
} from '../types';
import { createNewRecord, updateWordRecord } from '../services/memoryEngine';
import { generateDailyQueue } from '../services/scheduler';
import {
  saveRecord,
  saveSettings as dbSaveSettings,
  saveDailyStats as dbSaveDailyStats,
  getStreakDays,
} from '../services/database';
import {
  webSaveRecords,
  webSaveSettings,
  webSaveDailyStats,
} from '../services/webStorage';
import { Platform } from 'react-native';
import type { AnswerResult } from '../types';

interface AppState {
  // 单词数据
  words: Word[];
  records: Map<string, UserWordRecord>;
  
  // 当前学习会话
  currentSession: LearningSession | null;
  currentWordIndex: number;
  
  // 设置
  settings: UserSettings;
  
  // 统计
  dailyStats: DailyStats[];
  
  // 加载状态
  isLoading: boolean;
  
  // Actions
  loadWords: (words: Word[]) => void;
  loadRecords: (records: UserWordRecord[]) => void;
  loadDailyStats: (stats: DailyStats[]) => void;
  startSession: () => void;
  submitAnswer: (result: AnswerResult) => void;
  nextWord: () => void;
  endSession: () => void;
  updateSettings: (settings: Partial<UserSettings>) => void;
}

const DEFAULT_SETTINGS: UserSettings = {
  dailyNewWords: 5,
  reminderTime: '09:00',
  preferredTestTypes: ['choice', 'spelling', 'dictation'],
  speechRate: 1.0,
  notificationsEnabled: true,
  soundEnabled: true,
};

export const useAppStore = create<AppState>((set, get) => ({
  words: [],
  records: new Map(),
  currentSession: null,
  currentWordIndex: 0,
  settings: DEFAULT_SETTINGS,
  dailyStats: [],
  isLoading: false,
  
  loadWords: (words) => {
    set({ words });
  },
  
  loadRecords: (records) => {
    const recordMap = new Map<string, UserWordRecord>();
    records.forEach(r => recordMap.set(r.wordId, r));
    set({ records: recordMap });
  },

  loadDailyStats: (stats) => {
    set({ dailyStats: stats });
  },

  startSession: () => {
    const { words, records, settings } = get();
    const recordArray = Array.from(records.values());
    
    console.log('[DEBUG] startSession - words count:', words.length);
    console.log('[DEBUG] startSession - records count:', recordArray.length);
    console.log('[DEBUG] startSession - dailyNewWords:', settings.dailyNewWords);
    
    const queue = generateDailyQueue(words, recordArray, {
      dailyNewWords: settings.dailyNewWords,
      maxReviewWords: 20,
    });
    
    console.log('[DEBUG] startSession - queue length:', queue.length);
    if (queue.length > 0) {
      console.log('[DEBUG] startSession - first word id:', queue[0].wordId);
    }
    
    const session: LearningSession = {
      id: Date.now().toString(),
      startTime: Date.now(),
      words: queue,
      completed: false,
    };
    
    set({
      currentSession: session,
      currentWordIndex: 0,
    });
  },
  
  submitAnswer: (result) => {
    const { records, currentSession, currentWordIndex } = get();
    if (!currentSession) return;
    
    const sessionWord = currentSession.words[currentWordIndex];
    if (!sessionWord) return;
    
    // 更新或创建记录
    let record = records.get(result.wordId);
    if (!record) {
      record = createNewRecord(result.wordId);
    }
    
    const updatedRecord = updateWordRecord(record, result);
    
    // 更新 session
    const updatedWords = [...currentSession.words];
    updatedWords[currentWordIndex] = {
      ...sessionWord,
      result,
    };
    
    const newRecords = new Map(records);
    newRecords.set(result.wordId, updatedRecord);

    set({
      records: newRecords,
      currentSession: {
        ...currentSession,
        words: updatedWords,
      },
    });

    // 持久化
    if (Platform.OS === 'web') {
      webSaveRecords(newRecords);
    } else {
      saveRecord(updatedRecord).catch(console.warn);
    }
  },
  
  nextWord: () => {
    const { currentSession, currentWordIndex } = get();
    if (!currentSession) return;

    const nextIndex = currentWordIndex + 1;

    if (nextIndex >= currentSession.words.length) {
      // 会话结束，标记完成
      const completedSession = {
        ...currentSession,
        endTime: Date.now(),
        completed: true,
      };
      set({ currentSession: completedSession });

      // 计算并保存今日统计
      const { records, dailyStats } = get();
      const today = new Date().toISOString().split('T')[0];
      const existingToday = dailyStats.find(s => s.date === today);

      const answeredWords = completedSession.words.filter(w => w.result);
      const newWordsThisSession = answeredWords.filter(w => w.isNew).length;
      const reviewedThisSession = answeredWords.length;
      const correctThisSession = answeredWords.filter(w => w.result?.isCorrect).length;
      const durationSec = Math.round(
        (completedSession.endTime! - completedSession.startTime) / 1000
      );

      const prevLearned = existingToday?.wordsLearned ?? 0;
      const prevReviewed = existingToday?.wordsReviewed ?? 0;
      const prevCorrect = Math.round((existingToday?.correctRate ?? 0) * prevReviewed);
      const prevDuration = existingToday?.studyDuration ?? 0;

      const totalReviewed = prevReviewed + reviewedThisSession;
      const totalCorrect = prevCorrect + correctThisSession;

      let avgStrength = 0;
      if (records.size > 0) {
        let total = 0;
        records.forEach(r => total += r.memoryStrength);
        avgStrength = Math.round(total / records.size);
      }

      const todayStats: DailyStats = {
        date: today,
        wordsLearned: prevLearned + newWordsThisSession,
        wordsReviewed: totalReviewed,
        correctRate: totalReviewed > 0 ? totalCorrect / totalReviewed : 0,
        studyDuration: prevDuration + durationSec,
        streakDays: existingToday?.streakDays ?? 0,
        avgStrength,
      };

      const updatedStats = existingToday
        ? dailyStats.map(s => s.date === today ? todayStats : s)
        : [todayStats, ...dailyStats];
      set({ dailyStats: updatedStats });

      if (Platform.OS === 'web') {
        webSaveDailyStats(updatedStats);
      } else {
        dbSaveDailyStats(todayStats).catch(console.warn);
        getStreakDays().then(streak => {
          const withStreak = { ...todayStats, streakDays: streak };
          dbSaveDailyStats(withStreak).catch(console.warn);
          set({
            dailyStats: get().dailyStats.map(s =>
              s.date === today ? withStreak : s
            ),
          });
        }).catch(console.warn);
      }
    } else {
      set({ currentWordIndex: nextIndex });
    }
  },
  
  endSession: () => {
    set({
      currentSession: null,
      currentWordIndex: 0,
    });
  },
  
  updateSettings: (newSettings) => {
    const { settings } = get();
    const merged = { ...settings, ...newSettings };
    set({ settings: merged });

    // 持久化
    if (Platform.OS === 'web') {
      webSaveSettings(merged);
    } else {
      dbSaveSettings(merged).catch(console.warn);
    }
  },
}));

// 选择器
export const selectCurrentWord = (state: AppState) => {
  if (!state.currentSession) {
    console.log('[DEBUG] selectCurrentWord - no session');
    return null;
  }
  console.log('[DEBUG] selectCurrentWord - session words:', state.currentSession.words.length);
  console.log('[DEBUG] selectCurrentWord - currentWordIndex:', state.currentWordIndex);
  const sessionWord = state.currentSession.words[state.currentWordIndex];
  if (!sessionWord) {
    console.log('[DEBUG] selectCurrentWord - no sessionWord at index');
    return null;
  }
  console.log('[DEBUG] selectCurrentWord - looking for wordId:', sessionWord.wordId);
  const word = state.words.find(w => w.id === sessionWord.wordId);
  console.log('[DEBUG] selectCurrentWord - found word:', word ? 'yes' : 'no');
  return word || null;
};

export const selectCurrentSessionWord = (state: AppState) => {
  if (!state.currentSession) return null;
  return state.currentSession.words[state.currentWordIndex] || null;
};

export const selectProgress = (state: AppState) => {
  if (!state.currentSession) return { current: 0, total: 0 };
  return {
    current: state.currentWordIndex + 1,
    total: state.currentSession.words.length,
  };
};

export const selectMasteredCount = (state: AppState) => {
  let mastered = 0;
  state.records.forEach(r => {
    if (r.status === 'mastered') mastered++;
  });
  return mastered;
};

export const selectTotalLearned = (state: AppState) => {
  return state.records.size;
};

export const selectTodayStats = (state: AppState): DailyStats | null => {
  const today = new Date().toISOString().split('T')[0];
  return state.dailyStats.find(s => s.date === today) ?? null;
};

export const selectRecentStats = (state: AppState, days: number = 7): DailyStats[] => {
  // dailyStats 按日期降序排列，取最近 N 天
  return state.dailyStats.slice(0, days);
};
