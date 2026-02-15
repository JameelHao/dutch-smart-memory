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
  
  startSession: () => {
    const { words, records, settings } = get();
    const recordArray = Array.from(records.values());
    
    const queue = generateDailyQueue(words, recordArray, {
      dailyNewWords: settings.dailyNewWords,
      maxReviewWords: 20,
    });
    
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
  },
  
  nextWord: () => {
    const { currentSession, currentWordIndex } = get();
    if (!currentSession) return;
    
    const nextIndex = currentWordIndex + 1;
    
    if (nextIndex >= currentSession.words.length) {
      // 会话结束
      set({
        currentSession: {
          ...currentSession,
          endTime: Date.now(),
          completed: true,
        },
      });
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
    set({
      settings: { ...settings, ...newSettings },
    });
  },
}));

// 选择器
export const selectCurrentWord = (state: AppState) => {
  if (!state.currentSession) return null;
  const sessionWord = state.currentSession.words[state.currentWordIndex];
  if (!sessionWord) return null;
  return state.words.find(w => w.id === sessionWord.wordId) || null;
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
