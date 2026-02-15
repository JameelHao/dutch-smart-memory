# Dutch Smart Memory - 架构设计文档

## 1. 项目概述

Dutch Smart Memory 是一款基于艾宾浩斯遗忘曲线的荷兰语单词记忆应用，采用 React Native + Expo 技术栈，支持 Web、iOS 和 Android 平台。

## 2. 整体架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        UI Layer (React Native)                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐   │
│  │HomeScreen│ │LearnScreen│ │StatsScreen│ │SettingsScreen  │   │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────────┬─────────┘   │
│       │            │            │                │              │
│  ┌────┴────────────┴────────────┴────────────────┴────────┐    │
│  │              Components (WordCard, Options, etc.)       │    │
│  └─────────────────────────────┬───────────────────────────┘    │
└────────────────────────────────┼────────────────────────────────┘
                                 │
┌────────────────────────────────┼────────────────────────────────┐
│                    Business Logic Layer                         │
│  ┌─────────────────────────────┴───────────────────────────┐    │
│  │                 Zustand State Store                      │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐    │    │
│  │  │  words   │ │ records  │ │ session  │ │ settings │    │    │
│  │  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘    │    │
│  └───────┼────────────┼────────────┼────────────┼──────────┘    │
│          │            │            │            │               │
│  ┌───────┴────────────┴────────────┴────────────┴──────────┐    │
│  │                     Services                             │    │
│  │  ┌────────────────┐  ┌────────────────┐                 │    │
│  │  │ Memory Engine  │  │   Scheduler    │                 │    │
│  │  │ (艾宾浩斯算法)  │  │  (复习调度器)   │                 │    │
│  │  └────────────────┘  └────────────────┘                 │    │
│  └──────────────────────────────────────────────────────────┘    │
└─────────────────────────────────┬───────────────────────────────┘
                                  │
┌─────────────────────────────────┼───────────────────────────────┐
│                       Data Layer                                │
│  ┌──────────────────────────────┴──────────────────────────┐    │
│  │                    SQLite Database                       │    │
│  │  ┌──────────┐ ┌────────────────┐ ┌──────────────────┐   │    │
│  │  │  words   │ │ user_records   │ │   daily_stats    │   │    │
│  │  └──────────┘ └────────────────┘ └──────────────────┘   │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │                  PDF Parser Module                        │    │
│  │  (导入外部荷兰语单词 PDF)                                  │    │
│  └──────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────┘
```

## 3. 数据层设计

### 3.1 SQLite 数据库表结构

#### words 表 - 单词库
```sql
CREATE TABLE words (
  id TEXT PRIMARY KEY,
  dutch TEXT NOT NULL,           -- 荷兰语单词
  chinese TEXT NOT NULL,         -- 中文释义
  pronunciation TEXT,            -- 发音
  part_of_speech TEXT,           -- 词性 (noun, verb, adj, etc.)
  example TEXT,                  -- 例句
  example_translation TEXT,      -- 例句翻译
  category TEXT,                 -- 分类 (basics, food, numbers, etc.)
  level TEXT,                    -- 难度级别 (A1, A2, B1, B2)
  audio_url TEXT,                -- 音频文件路径
  created_at INTEGER,            -- 创建时间
  source TEXT                    -- 来源 (pdf_import, manual, etc.)
);
```

#### user_records 表 - 用户学习记录
```sql
CREATE TABLE user_records (
  id TEXT PRIMARY KEY,
  word_id TEXT NOT NULL,
  memory_strength REAL DEFAULT 0,  -- 记忆强度 (0-100)
  review_count INTEGER DEFAULT 0,  -- 复习次数
  correct_count INTEGER DEFAULT 0, -- 正确次数
  last_review_time INTEGER,        -- 上次复习时间
  next_review_time INTEGER,        -- 下次复习时间
  interval_days REAL DEFAULT 1,    -- 当前复习间隔（天）
  easiness_factor REAL DEFAULT 2.5,-- SM-2 易度因子
  status TEXT DEFAULT 'new',       -- 状态 (new, learning, review, mastered)
  created_at INTEGER,
  FOREIGN KEY (word_id) REFERENCES words(id)
);
```

#### daily_stats 表 - 每日学习统计
```sql
CREATE TABLE daily_stats (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,              -- 日期 (YYYY-MM-DD)
  words_learned INTEGER DEFAULT 0, -- 学习新词数
  words_reviewed INTEGER DEFAULT 0,-- 复习单词数
  correct_rate REAL DEFAULT 0,     -- 正确率
  study_duration INTEGER DEFAULT 0,-- 学习时长（秒）
  streak_days INTEGER DEFAULT 0    -- 连续学习天数
);
```

### 3.2 数据流

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  PDF Files  │────>│ PDF Parser  │────>│  SQLite DB  │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                               │
                                               ▼
                    ┌─────────────────────────────────────┐
                    │         Zustand Store (内存)         │
                    │  ┌─────────┐  ┌──────────────────┐  │
                    │  │  words  │  │   userRecords    │  │
                    │  └─────────┘  └──────────────────┘  │
                    └─────────────────────────────────────┘
                                               │
                                               ▼
                    ┌─────────────────────────────────────┐
                    │              UI Components           │
                    └─────────────────────────────────────┘
```

## 4. 业务逻辑层设计

### 4.1 记忆引擎 (Memory Engine)

基于 **SM-2 间隔重复算法** 的改进版本：

```typescript
interface MemoryParams {
  easinessFactor: number;  // 易度因子 EF (1.3-2.5)
  interval: number;        // 复习间隔（天）
  repetitions: number;     // 重复次数
}

// 核心算法
function calculateNextReview(
  currentParams: MemoryParams,
  quality: number // 答题质量 0-5
): MemoryParams {
  // 1. 更新易度因子
  const newEF = Math.max(1.3, 
    currentParams.easinessFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  );
  
  // 2. 计算新间隔
  let newInterval: number;
  if (quality < 3) {
    // 答错，重置间隔
    newInterval = 1;
  } else if (currentParams.repetitions === 0) {
    newInterval = 1;
  } else if (currentParams.repetitions === 1) {
    newInterval = 6;
  } else {
    newInterval = currentParams.interval * newEF;
  }
  
  return {
    easinessFactor: newEF,
    interval: newInterval,
    repetitions: quality >= 3 ? currentParams.repetitions + 1 : 0
  };
}
```

### 4.2 复习调度器 (Scheduler)

负责生成每日学习队列：

```typescript
interface DailyQueue {
  newWords: SessionWord[];     // 新词 (40%)
  reviewWords: SessionWord[];  // 复习词 (60%)
}

function generateDailyQueue(config: SchedulerConfig): DailyQueue {
  // 1. 获取到期复习词（按遗忘风险排序）
  const dueWords = getDueWords().sort(byForgetRisk);
  
  // 2. 获取新词
  const newWords = getNewWords(config.dailyNewWords);
  
  // 3. 交叉混合（每3-4个复习词插入1个新词）
  return interleave(newWords, dueWords);
}
```

### 4.3 状态管理 (Zustand Store)

```typescript
interface AppState {
  // 数据
  words: Word[];
  records: Map<string, UserWordRecord>;
  
  // 会话
  currentSession: LearningSession | null;
  currentWordIndex: number;
  
  // 设置
  settings: UserSettings;
  
  // Actions
  loadWords: (words: Word[]) => void;
  startSession: () => void;
  submitAnswer: (result: AnswerResult) => void;
  nextWord: () => void;
}
```

## 5. UI 层设计

### 5.1 页面结构

```
App
├── HomeScreen (首页)
│   ├── 今日学习卡片
│   ├── 学习进度统计
│   └── 快速操作按钮
│
├── LearnScreen (学习页面)
│   ├── 进度条
│   ├── 单词卡片
│   │   ├── 荷兰语单词
│   │   ├── 发音
│   │   └── 中文释义 (答题后显示)
│   └── 答题区域
│       ├── 选择题选项
│       └── 自评按钮 (记住/模糊/忘了)
│
├── StatsScreen (统计页面)
│   ├── 学习日历
│   ├── 掌握进度饼图
│   └── 详细统计列表
│
└── SettingsScreen (设置页面)
    ├── 每日新词数量
    ├── 提醒时间
    └── 通知设置
```

### 5.2 组件层次

```
Components/
├── WordCard.tsx          # 单词卡片
├── ChoiceOptions.tsx     # 选择题选项
├── SelfAssessment.tsx    # 自评按钮组
├── ProgressBar.tsx       # 学习进度条
├── StatCard.tsx          # 统计卡片
└── SettingItem.tsx       # 设置项
```

## 6. PDF 解析模块设计

### 6.1 解析流程

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  PDF File   │────>│  PDF.js     │────>│ Text Extract│
└─────────────┘     └─────────────┘     └──────┬──────┘
                                               │
                                               ▼
                    ┌─────────────────────────────────────┐
                    │         Pattern Matching             │
                    │  (识别单词、词性、释义、例句格式)      │
                    └─────────────────────────────────────┘
                                               │
                                               ▼
                    ┌─────────────────────────────────────┐
                    │        Data Validation               │
                    │  (去重、格式校验、补全缺失字段)        │
                    └─────────────────────────────────────┘
                                               │
                                               ▼
                    ┌─────────────────────────────────────┐
                    │         SQLite Import                │
                    └─────────────────────────────────────┘
```

### 6.2 支持的 PDF 格式

| 格式类型 | 描述 | 示例 |
|---------|------|------|
| 简单列表 | 荷兰语 - 中文 | `hallo - 你好` |
| 带词性 | 荷兰语 (词性) - 中文 | `huis (n.) - 房子` |
| 完整格式 | 荷兰语、发音、词性、中文、例句 | 见下方 |

### 6.3 API 设计

```typescript
interface PDFParserService {
  // 解析 PDF 文件
  parsePDF(filePath: string): Promise<ParsedWord[]>;
  
  // 导入解析结果到数据库
  importToDatabase(words: ParsedWord[]): Promise<ImportResult>;
  
  // 验证数据
  validateWords(words: ParsedWord[]): ValidationResult;
}

interface ParsedWord {
  dutch: string;
  chinese: string;
  pronunciation?: string;
  partOfSpeech?: string;
  example?: string;
  confidence: number; // 解析置信度 0-1
}
```

## 7. 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| UI | React Native + Expo | 跨平台移动应用框架 |
| UI 组件库 | React Native Paper | Material Design 风格 |
| 状态管理 | Zustand | 轻量级状态管理 |
| 数据库 | expo-sqlite | SQLite 本地存储 |
| PDF 解析 | pdf-parse / pdf.js | PDF 文本提取 |
| 导航 | React Navigation | 页面导航 |
| 音频 | expo-av | 单词发音播放 |
| 通知 | expo-notifications | 复习提醒 |

## 8. 文件结构

```
dutch-smart-memory/
├── App.tsx                 # 应用入口
├── src/
│   ├── assets/
│   │   └── words.ts        # 示例单词数据
│   ├── components/         # 可复用组件
│   ├── screens/            # 页面组件
│   │   ├── HomeScreen.tsx
│   │   ├── LearnScreen.tsx
│   │   ├── StatsScreen.tsx
│   │   └── SettingsScreen.tsx
│   ├── services/           # 业务逻辑服务
│   │   ├── memoryEngine.ts # 记忆算法引擎
│   │   ├── scheduler.ts    # 复习调度器
│   │   ├── database.ts     # 数据库操作
│   │   └── pdfParser.ts    # PDF 解析器
│   ├── store/              # Zustand 状态管理
│   │   └── index.ts
│   ├── types/              # TypeScript 类型定义
│   │   └── index.ts
│   └── utils/              # 工具函数
├── docs/
│   └── ARCHITECTURE.md     # 架构文档
└── package.json
```

## 9. 未来扩展

1. **云同步** - 支持多设备数据同步
2. **AI 助手** - 集成 LLM 进行语法解释和对话练习
3. **社区功能** - 用户分享单词库
4. **游戏化** - 增加成就系统和排行榜
5. **离线 TTS** - 本地语音合成

---

*文档版本: 1.0*
*最后更新: 2024*
