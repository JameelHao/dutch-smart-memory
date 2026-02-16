/**
 * 学习页面
 * 核心学习交互界面
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Text, Button, Card, IconButton, ProgressBar } from 'react-native-paper';
import * as Speech from 'expo-speech';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  useAppStore,
  selectCurrentWord,
  selectCurrentSessionWord,
  selectProgress,
} from '../store';
import type { SelfAssessment, TestType } from '../types';

// 选择题选项组件
function ChoiceOptions({
  options,
  onSelect,
  correctAnswer,
  showResult,
}: {
  options: string[];
  onSelect: (option: string) => void;
  correctAnswer: string;
  showResult: boolean;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  
  const handleSelect = (option: string) => {
    if (showResult) return;
    setSelected(option);
    onSelect(option);
  };
  
  const getButtonStyle = (option: string) => {
    if (!showResult) return 'outlined';
    if (option === correctAnswer) return 'contained';
    if (option === selected && option !== correctAnswer) return 'outlined';
    return 'outlined';
  };
  
  return (
    <View style={styles.optionsContainer}>
      {options.map((option, index) => (
        <Button
          key={index}
          mode={getButtonStyle(option)}
          onPress={() => handleSelect(option)}
          style={[
            styles.optionButton,
            showResult && option === correctAnswer && styles.correctButton,
            showResult && option === selected && option !== correctAnswer && styles.wrongButton,
          ]}
          labelStyle={styles.optionLabel}
        >
          {option}
        </Button>
      ))}
    </View>
  );
}

// 自评按钮组
function SelfAssessmentButtons({
  onAssess,
}: {
  onAssess: (assessment: SelfAssessment) => void;
}) {
  return (
    <View style={styles.assessmentContainer}>
      <Text variant="bodyMedium" style={styles.assessmentTitle}>
        你觉得记得怎么样？
      </Text>
      <View style={styles.assessmentButtons}>
        <Button
          mode="contained"
          onPress={() => onAssess('remembered')}
          style={[styles.assessButton, styles.rememberedButton]}
          labelStyle={styles.assessLabel}
        >
          记住了
        </Button>
        <Button
          mode="contained"
          onPress={() => onAssess('fuzzy')}
          style={[styles.assessButton, styles.fuzzyButton]}
          labelStyle={styles.assessLabel}
        >
          模糊
        </Button>
        <Button
          mode="contained"
          onPress={() => onAssess('forgotten')}
          style={[styles.assessButton, styles.forgottenButton]}
          labelStyle={styles.assessLabel}
        >
          忘了
        </Button>
      </View>
    </View>
  );
}

// Fisher-Yates 洗牌算法
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export default function LearnScreen({ navigation }: any) {
  const currentWord = useAppStore(selectCurrentWord);
  const sessionWord = useAppStore(selectCurrentSessionWord);
  const progress = useAppStore(selectProgress);
  const currentSession = useAppStore(state => state.currentSession);
  const startSession = useAppStore(state => state.startSession);
  const submitAnswer = useAppStore(state => state.submitAnswer);
  const nextWord = useAppStore(state => state.nextWord);
  const allWords = useAppStore(state => state.words);
  
  const [showAnswer, setShowAnswer] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  
  // 正确答案
  const correctChinese = currentWord?.chinese || '（点击查看）';
  
  // 生成选择题选项：从词库随机抽取3个干扰项，然后打乱顺序
  const quizOptions = useMemo(() => {
    if (!currentWord) return [];
    
    // 获取所有有中文翻译的单词（排除当前单词）
    const otherWords = allWords.filter(
      w => w.id !== currentWord.id && w.chinese && w.chinese.trim() !== ''
    );
    
    // 随机抽取3个作为干扰项
    const shuffledOthers = shuffleArray(otherWords);
    const distractors = shuffledOthers.slice(0, 3).map(w => w.chinese);
    
    // 如果干扰项不足3个，用备用选项填充
    const fallbackOptions = ['（其他）', '（不确定）', '（跳过）'];
    while (distractors.length < 3) {
      distractors.push(fallbackOptions[distractors.length]);
    }
    
    // 将正确答案和干扰项合并并打乱顺序
    const allOptions = [correctChinese, ...distractors];
    return shuffleArray(allOptions);
  }, [currentWord?.id, correctChinese, allWords]);
  
  useEffect(() => {
    if (!currentSession) {
      // 自动开始会话（也可以改为手动触发）
    }
  }, [currentSession]);
  
  const handleSelectAnswer = (answer: string) => {
    if (!currentWord) return;
    const correct = answer === correctChinese;
    setIsCorrect(correct);
    setSelectedAnswer(answer);
    setShowAnswer(true);
  };
  
  const handleSelfAssess = (assessment: SelfAssessment) => {
    if (!currentWord || !sessionWord) return;
    
    submitAnswer({
      wordId: currentWord.id,
      testType: sessionWord.testType,
      isCorrect,
      selfAssessment: assessment,
      answeredAt: Date.now(),
      timeTaken: 0, // TODO: 实现计时
    });
    
    // 重置状态并进入下一个
    setShowAnswer(false);
    setSelectedAnswer(null);
    nextWord();
  };
  
  // 显示可用声音（调试用）
  const showAvailableVoices = useCallback(async () => {
    const voices = await Speech.getAvailableVoicesAsync();
    const dutchVoices = voices.filter(v => v.language.startsWith('nl'));
    const voiceList = dutchVoices.map(v => `${v.name} (${v.language})`).join('\n') || '没有荷兰语声音';
    Alert.alert('可用荷兰语声音', voiceList);
  }, []);

  // 播放荷兰语发音
  const speakDutch = useCallback(async () => {
    if (!currentWord?.dutch) return;
    
    // 停止当前播放
    await Speech.stop();
    
    // 获取可用声音，优先选择荷兰语女声
    const voices = await Speech.getAvailableVoicesAsync();
    const dutchVoices = voices.filter(v => v.language.startsWith('nl'));
    
    // iOS 荷兰语女声: Ellen (nl-NL), Claire (nl-BE)
    // iOS 荷兰语男声: Xander (nl-NL)
    const femaleVoice = dutchVoices.find(v => 
      v.name.toLowerCase() === 'ellen' || 
      v.identifier.toLowerCase().includes('ellen')
    ) || dutchVoices.find(v => 
      v.name.toLowerCase() === 'claire' || 
      v.identifier.toLowerCase().includes('claire')
    );
    
    // 排除男声 Xander，选任意其他荷兰语声音
    const fallbackVoice = femaleVoice || dutchVoices.find(v => 
      !v.name.toLowerCase().includes('xander') && 
      !v.identifier.toLowerCase().includes('xander')
    );
    
    // 构建语音选项
    const speechOptions: Speech.SpeechOptions = {
      language: 'nl-NL',
      rate: 0.85,
      pitch: fallbackVoice ? 1.05 : 1.3, // 没女声时提高音调
    };
    
    // 只有找到特定声音时才设置 voice 参数
    if (fallbackVoice) {
      speechOptions.voice = fallbackVoice.identifier;
    }
    
    Speech.speak(currentWord.dutch, speechOptions);
  }, [currentWord?.dutch]);
  
  // 无会话时显示开始按钮
  if (!currentSession) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyState}>
          <Text variant="headlineMedium" style={styles.emptyTitle}>
            准备好学习了吗？
          </Text>
          <Text variant="bodyLarge" style={styles.emptySubtitle}>
            今天有一些新单词等着你
          </Text>
          <Button
            mode="contained"
            onPress={startSession}
            style={styles.startButton}
            contentStyle={styles.startButtonContent}
          >
            开始学习
          </Button>
        </View>
      </SafeAreaView>
    );
  }
  
  // 会话完成
  if (currentSession.completed) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyState}>
          <Text variant="headlineMedium" style={styles.emptyTitle}>
            太棒了！
          </Text>
          <Text variant="bodyLarge" style={styles.emptySubtitle}>
            今日学习任务完成
          </Text>
          <Button
            mode="contained"
            onPress={() => navigation.navigate('Home')}
            style={styles.startButton}
          >
            返回首页
          </Button>
        </View>
      </SafeAreaView>
    );
  }
  
  if (!currentWord) {
    return (
      <SafeAreaView style={styles.container}>
        <Text>加载中...</Text>
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={styles.container}>
      {/* 进度条 */}
      <View style={styles.progressHeader}>
        <Text variant="bodySmall">
          {progress.current} / {progress.total}
        </Text>
        <ProgressBar
          progress={progress.current / progress.total}
          style={styles.progressBar}
          color="#FF6B35"
        />
      </View>
      
      {/* 单词卡片 */}
      <Card style={styles.wordCard}>
        <Card.Content style={styles.wordContent}>
          {sessionWord?.isNew && (
            <View style={styles.newBadge}>
              <Text style={styles.newBadgeText}>新词</Text>
            </View>
          )}
          
          <View style={styles.dutchWordRow}>
            <Text variant="displayMedium" style={styles.dutchWord}>
              {currentWord.dutch}
            </Text>
            <IconButton
              icon="volume-high"
              size={32}
              onPress={speakDutch}
              onLongPress={showAvailableVoices}
              style={styles.speakButton}
              iconColor="#FFFFFF"
              containerColor="#1E88E5"
              mode="contained"
            />
          </View>
          
          {currentWord.pronunciation && (
            <Text variant="bodyMedium" style={styles.pronunciation}>
              {currentWord.pronunciation}
            </Text>
          )}
          
          {showAnswer && (
            <>
              <Text variant="titleLarge" style={styles.chineseWord}>
                {currentWord.chinese || '（暂无翻译）'}
              </Text>
              {currentWord.example && (
                <Text variant="bodySmall" style={styles.example}>
                  {currentWord.example}
                </Text>
              )}
            </>
          )}
        </Card.Content>
      </Card>
      
      {/* 答题区域 */}
      <View style={styles.answerSection}>
        {!showAnswer ? (
          <ChoiceOptions
            options={quizOptions}
            onSelect={handleSelectAnswer}
            correctAnswer={correctChinese}
            showResult={showAnswer}
          />
        ) : (
          <SelfAssessmentButtons onAssess={handleSelfAssess} />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  progressHeader: {
    padding: 16,
    paddingBottom: 8,
  },
  progressBar: {
    marginTop: 8,
    height: 6,
    borderRadius: 3,
  },
  wordCard: {
    margin: 16,
    borderRadius: 16,
  },
  wordContent: {
    alignItems: 'center',
    padding: 32,
  },
  newBadge: {
    backgroundColor: '#21A179',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 16,
  },
  newBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  dutchWordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dutchWord: {
    fontWeight: 'bold',
    color: '#1E3A5F',
    textAlign: 'center',
  },
  speakButton: {
    marginLeft: 4,
    marginTop: -4,
  },
  pronunciation: {
    color: '#888',
    marginTop: 8,
  },
  chineseWord: {
    marginTop: 24,
    color: '#FF6B35',
  },
  example: {
    marginTop: 16,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  answerSection: {
    flex: 1,
    padding: 16,
  },
  optionsContainer: {
    gap: 12,
  },
  optionButton: {
    borderRadius: 12,
    borderWidth: 2,
  },
  optionLabel: {
    fontSize: 16,
    paddingVertical: 4,
  },
  correctButton: {
    backgroundColor: '#21A179',
    borderColor: '#21A179',
  },
  wrongButton: {
    backgroundColor: '#FFEBEE',
    borderColor: '#E53935',
    borderWidth: 2,
  },
  assessmentContainer: {
    alignItems: 'center',
  },
  assessmentTitle: {
    marginBottom: 16,
    color: '#666',
  },
  assessmentButtons: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
    justifyContent: 'center',
  },
  assessButton: {
    borderRadius: 12,
    minWidth: 90,
    paddingHorizontal: 8,
  },
  assessLabel: {
    fontSize: 14,
    marginHorizontal: 4,
    paddingHorizontal: 0,
  },
  rememberedButton: {
    backgroundColor: '#21A179',
  },
  fuzzyButton: {
    backgroundColor: '#FFA000',
  },
  forgottenButton: {
    backgroundColor: '#E53935',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontWeight: 'bold',
    color: '#1E3A5F',
    textAlign: 'center',
  },
  emptySubtitle: {
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  startButton: {
    marginTop: 32,
    borderRadius: 12,
  },
  startButtonContent: {
    paddingHorizontal: 32,
    paddingVertical: 8,
  },
});
