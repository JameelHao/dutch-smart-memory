# Dutch Smart Memory - 架构设计文档

## 1. 项目概述

Dutch Smart Memory 是一款基于 SM-2 间隔重复算法的荷兰语单词记忆应用，采用 React Native + Expo 技术栈，支持 Web、iOS 和 Android 平台。

**核心特性：**
- 4,589 个荷兰语高频词（从 Hazenberg & Hulstijn 频率词表 PDF 导入）
- SM-2 间隔重复算法，动态调整复习间隔
- SQLite 本地持久化，离线可用
- 按频率分级 (A1→B2)，循序渐进

## 2. 系统架构

```
┌─────────────────────────────────────────────────────────────────────┐
│                         UI Layer (React Native)                      │
│                                                                      │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────────┐    │
│  │ HomeScreen │ │LearnScreen │ │StatsScreen │ │SettingsScreen  │    │
│  └─────┬──────┘ └─────┬──────┘ └─────┬──────┘ └───────┬────────┘    │
│        └───────────────┴──────────────┴────────────────┘             │
│                              │                                       │
│                    React Navigation (Tab + Stack)                    │
│                    React Native Paper (MD3)                         │
└──────────────────────────────┬───────────────────────────────────────┘
                               │
┌──────────────────────────────┼───────────────────────────────────────┐
│                     State Layer (Zustand)                             │
│                                                                      │
│  ┌───────────────────────────┴─────────────────────────────────┐     │
│  │                    useAppStore                                │     │
│  │  ┌────────┐ ┌─────────┐ ┌─────────┐ ┌──────────┐           │     │
│  │  │ words  │ │ records │ │ session │ │ settings │           │     │
│  │  │(4589个)│ │ (Map)   │ │(当前会话)│ │(用户偏好) │           │     │
│  │  └────────┘ └─────────┘ └─────────┘ └──────────┘           │     │
│  │                                                              │     │
│  │  Actions: loadWords | submitAnswer | startSession | ...      │     │
│  └──────────────────────────────────────────────────────────────┘     │
└──────────────────────────────┬───────────────────────────────────────┘
                               │
┌──────────────────────────────┼───────────────────────────────────────┐
│                    Business Logic Layer                               │
│                                                                      │
│  ┌──────────────────────┐  ┌──────────────────────┐                  │
│  │   Memory Engine      │  │    Scheduler         │                  │
│  │  (memoryEngine.ts)   │  │  (scheduler.ts)      │                  │
│  │                      │  │                      │                  │
│  │  - SM-2 算法         │  │  - 到期词检测         │                  │
│  │  - 易度因子更新       │  │  - 新词/复习词比例    │                  │
│  │  - 间隔计算          │  │  - 遗忘风险排序       │                  │
│  │  - 记忆强度追踪       │  │  - 测试类型选择       │                  │
│  │  - 掌握判定          │  │  - 交叉混合队列       │                  │
│  └──────────────────────┘  └──────────────────────┘                  │
└──────────────────────────────┬───────────────────────────────────────┘
                               │
┌──────────────────────────────┼───────────────────────────────────────┐
│                       Data Layer                                     │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │                  database.ts (expo-sqlite/next)               │    │
│  │                                                              │    │
│  │  ┌──────────┐ ┌───────────────────┐ ┌──────────┐ ┌────────┐ │    │
│  │  │  words   │ │learning_progress  │ │ settings │ │ daily  │ │    │
│  │  │  (4589)  │ │ (SM-2 参数)       │ │ (k-v)   │ │ _stats │ │    │
│  │  └──────────┘ └───────────────────┘ └──────────┘ └────────┘ │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │           words.json (从 PDF 导入的静态数据)                   │    │
│  │           首次启动时写入 SQLite                                │    │
│  └──────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────┘

            ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐
              Build-time Pipeline (scripts/import-words.ts)
            │                                              │
              5 PDFs ──> pdftotext ──> parse ──> words.json
            │                                              │
            └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘
```

## 3. 数据流

### 3.1 构建时数据流 (PDF → JSON)

```
  ~/Downloads/*.pdf          scripts/import-words.ts        src/data/words.json
  ┌──────────────────┐      ┌─────────────────────┐      ┌──────────────────┐
  │ Lijst-300-words  │─────>│                     │      │ [                │
  │ Lijst-600-words  │─────>│  pdftotext 提取文本  │      │   { id: "1",    │
  │ Lijst-1200-words │─────>│  解析单词+冠词       │─────>│     dutch: ..., │
  │ Lijst-2000-words │─────>│  去重+排序           │      │     article: ..,│
  │ Frequente 2k-5k  │─────>│  分配频率等级        │      │     level: ..., │
  └──────────────────┘      └─────────────────────┘      │     ... }       │
                                                          │ ]               │
                             4,589 唯一单词                └──────────────────┘
```

### 3.2 运行时数据流

```
                            App 启动
                               │
                    ┌──────────┴──────────┐
                    │   initDatabase()    │
                    └──────────┬──────────┘
                               │
                    ┌──────────┴──────────┐
                    │ wordCount === 0 ?   │──── 否 ────┐
                    └──────────┬──────────┘             │
                          是   │                        │
                    ┌──────────┴──────────┐             │
                    │ importWords(JSON)   │             │
                    └──────────┬──────────┘             │
                               │                        │
                    ┌──────────┴────────────────────────┘
                    │ 并行加载:
                    │  getAllWords()
                    │  getAllRecords()
                    │  loadSettings()
                    └──────────┬──────────┐
                               │          │
                    ┌──────────┴──┐  ┌────┴─────────┐
                    │ Zustand     │  │  UI 渲染      │
                    │ Store 更新   │──│  (结束 loading)│
                    └─────────────┘  └──────────────┘


                          学习流程
                               │
                    ┌──────────┴──────────┐
                    │  startSession()     │
                    │  生成学习队列        │
                    └──────────┬──────────┘
                               │
                    ┌──────────┴──────────┐
                    │  显示单词卡片        │<─────────┐
                    │  (选择/拼写/听写)    │          │
                    └──────────┬──────────┘          │
                               │                     │
                    ┌──────────┴──────────┐          │
                    │  submitAnswer()     │          │
                    │  SM-2 算法更新       │          │
                    │  SQLite 持久化      │          │
                    └──────────┬──────────┘          │
                               │                     │
                    ┌──────────┴──────────┐          │
                    │  还有更多单词?       │── 是 ────┘
                    └──────────┬──────────┘
                          否   │
                    ┌──────────┴──────────┐
                    │  会话结束            │
                    │  更新统计            │
                    └─────────────────────┘
```

## 4. 数据库表结构

### words 表 - 单词库 (4,589 条)

| 列名 | 类型 | 说明 |
|------|------|------|
| id | TEXT PK | 单词 ID |
| dutch | TEXT | 荷兰语单词 |
| article | TEXT | 冠词 (de/het/null) |
| chinese | TEXT | 中文释义 |
| pronunciation | TEXT | 发音 (IPA) |
| part_of_speech | TEXT | 词性 |
| example | TEXT | 例句 |
| example_translation | TEXT | 例句翻译 |
| category | TEXT | 分类 (basics, food, ...) |
| level | TEXT | 难度级别 (A1/A2/B1/B2) |
| frequency_rank | INTEGER | 频率排名 (1=最常用) |
| source | TEXT | 来源 (pdf_import/manual) |

### learning_progress 表 - 学习进度

| 列名 | 类型 | 说明 |
|------|------|------|
| word_id | TEXT PK/FK | 关联 words.id |
| memory_strength | REAL | 记忆强度 (0-100) |
| review_count | INTEGER | 复习次数 |
| correct_count | INTEGER | 正确次数 |
| interval_days | REAL | 当前复习间隔 (天) |
| easiness_factor | REAL | SM-2 易度因子 (1.3-2.5) |
| next_review_time | INTEGER | 下次复习时间 (timestamp) |
| last_review_time | INTEGER | 上次复习时间 (timestamp) |
| status | TEXT | new/learning/reviewing/mastered |

### settings 表 - 用户设置

| 列名 | 类型 | 说明 |
|------|------|------|
| key | TEXT PK | 设置键名 |
| value | TEXT | JSON 序列化的值 |

### daily_stats 表 - 每日统计

| 列名 | 类型 | 说明 |
|------|------|------|
| date | TEXT PK | 日期 (YYYY-MM-DD) |
| words_learned | INTEGER | 新学单词数 |
| words_reviewed | INTEGER | 复习单词数 |
| correct_rate | REAL | 正确率 (0-1) |
| study_duration | INTEGER | 学习时长 (秒) |
| streak_days | INTEGER | 连续学习天数 |

## 5. 模块说明

### 5.1 核心服务

| 模块 | 文件 | 职责 |
|------|------|------|
| 记忆引擎 | `services/memoryEngine.ts` | SM-2 算法实现：易度因子、间隔计算、强度追踪 |
| 复习调度器 | `services/scheduler.ts` | 每日队列生成：到期词检测、新/复习比例、交叉混合 |
| 数据库服务 | `services/database.ts` | SQLite CRUD：单词导入、记录持久化、设置存储 |

### 5.2 SM-2 算法参数

```
质量评分 (quality): 0-5
  0-1: 答错 (forgotten/fuzzy)
  2:   几乎忘记但想起
  3:   有些困难但正确 (fuzzy + correct)
  5:   完美回忆 (remembered + correct)

易度因子更新:
  EF' = EF + (0.1 - (5-q) * (0.08 + (5-q) * 0.02))
  EF_min = 1.3

间隔计算:
  质量 < 3 → 重置为 1 天
  第 1 次 → 1 天
  第 2 次 → 6 天
  第 n 次 → 上次间隔 * EF (最大 365 天)

掌握判定:
  记忆强度 >= 85 且 复习次数 >= 5 → mastered
```

### 5.3 调度策略

```
每日学习队列:
  新词 : 复习词 = 40% : 60%
  复习词按遗忘风险降序排列
  每 3-4 个复习词插入 1 个新词

测试类型选择:
  新词/低强度 (<30)  → 选择题
  中等强度 (30-60)   → 选择题/拼写 各 50%
  高强度 (>60)       → 30%选择 + 40%拼写 + 30%听写
```

## 6. 单词数据分布

从 5 个 PDF 导入，按 Hazenberg & Hulstijn 频率排名：

| 频率段 | 来源 PDF | 级别 | 单词数 |
|--------|----------|------|--------|
| 1-300 | Lijst-300-words | A1 | ~299 |
| 301-600 | Lijst-600-words | A1 | ~301 |
| 601-1200 | Lijst-1200-words | A2 | ~602 |
| 1201-2100 | Lijst-2000-words | B1 | ~900 |
| 2001-5000 | Frequente_woorden | B1/B2 | ~3024 |
| **去重后总计** | | | **4,589** |

## 7. 技术栈

| 层级 | 技术 | 版本 | 说明 |
|------|------|------|------|
| 框架 | React Native + Expo | SDK 50 | 跨平台移动/Web |
| UI 库 | React Native Paper | 5.x | Material Design 3 |
| 状态管理 | Zustand | 4.x | 轻量级响应式 Store |
| 数据库 | expo-sqlite | 13.4 | SQLite 本地持久化 |
| 导航 | React Navigation | 6.x | Tab + Stack 导航 |
| 音频 | expo-speech / expo-av | - | TTS 发音 |
| 构建工具 | tsx | - | TypeScript 脚本执行 |

## 8. 文件结构

```
dutch-smart-memory/
├── App.tsx                      # 入口：DB 初始化 + 导航
├── src/
│   ├── data/
│   │   └── words.json           # PDF 导入的 4,589 词 (构建时生成)
│   ├── assets/
│   │   └── words.ts             # 20 个示例词 (开发用)
│   ├── screens/
│   │   ├── HomeScreen.tsx       # 首页：进度概览、学习入口
│   │   ├── LearnScreen.tsx      # 学习：单词卡、答题、自评
│   │   ├── StatsScreen.tsx      # 统计：进度环、趋势图
│   │   └── SettingsScreen.tsx   # 设置：每日新词、语速、通知
│   ├── services/
│   │   ├── database.ts          # SQLite CRUD (expo-sqlite/next)
│   │   ├── memoryEngine.ts      # SM-2 记忆算法
│   │   └── scheduler.ts         # 每日队列调度
│   ├── store/
│   │   └── index.ts             # Zustand: state + actions + selectors
│   └── types/
│       └── index.ts             # TypeScript 接口定义
├── scripts/
│   └── import-words.ts          # PDF→JSON 导入脚本
├── docs/
│   ├── ARCHITECTURE.md          # 本文档
│   └── SOP.md                   # 产品需求规格
└── .github/workflows/
    └── deploy.yml               # GitHub Pages 自动部署
```

---

*文档版本: 2.0*
*最后更新: 2026-02*
