/**
 * Web localStorage persistence layer
 * Saves and loads learning records and settings on web platform.
 */

import { Platform } from 'react-native';
import type { UserWordRecord, UserSettings, DailyStats } from '../types';

const KEYS = {
  RECORDS: 'dsm_records',
  SETTINGS: 'dsm_settings',
  DAILY_STATS: 'dsm_daily_stats',
} as const;

const isWeb = Platform.OS === 'web';

export function webSaveRecords(records: Map<string, UserWordRecord>): void {
  if (!isWeb) return;
  try {
    const arr = Array.from(records.values());
    localStorage.setItem(KEYS.RECORDS, JSON.stringify(arr));
  } catch (e) {
    console.warn('webSaveRecords failed:', e);
  }
}

export function webLoadRecords(): UserWordRecord[] {
  if (!isWeb) return [];
  try {
    const raw = localStorage.getItem(KEYS.RECORDS);
    if (!raw) return [];
    return JSON.parse(raw) as UserWordRecord[];
  } catch (e) {
    console.warn('webLoadRecords failed:', e);
    return [];
  }
}

export function webSaveSettings(settings: UserSettings): void {
  if (!isWeb) return;
  try {
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
  } catch (e) {
    console.warn('webSaveSettings failed:', e);
  }
}

export function webLoadSettings(): Partial<UserSettings> {
  if (!isWeb) return {};
  try {
    const raw = localStorage.getItem(KEYS.SETTINGS);
    if (!raw) return {};
    return JSON.parse(raw) as Partial<UserSettings>;
  } catch (e) {
    console.warn('webLoadSettings failed:', e);
    return {};
  }
}

export function webSaveDailyStats(stats: DailyStats[]): void {
  if (!isWeb) return;
  try {
    localStorage.setItem(KEYS.DAILY_STATS, JSON.stringify(stats));
  } catch (e) {
    console.warn('webSaveDailyStats failed:', e);
  }
}

export function webLoadDailyStats(): DailyStats[] {
  if (!isWeb) return [];
  try {
    const raw = localStorage.getItem(KEYS.DAILY_STATS);
    if (!raw) return [];
    return JSON.parse(raw) as DailyStats[];
  } catch (e) {
    console.warn('webLoadDailyStats failed:', e);
    return [];
  }
}
