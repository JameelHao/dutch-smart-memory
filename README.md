# 🇳🇱 Dutch Smart Memory

荷兰语智能记忆系统 - 基于动态难度模型与记忆曲线算法的智能单词学习 App

## ✨ 特性

- 🧠 **智能记忆算法** - 动态难度模型，非固定艾宾浩斯曲线
- 📊 **记忆强度追踪** - 实时评估每个单词的掌握程度
- 🎯 **个性化复习** - 根据遗忘风险智能推送复习内容
- ⏱️ **高效学习** - 每天仅需 10-15 分钟
- 📈 **数据可视化** - 直观展示学习进度和趋势

## 🛠️ 技术栈

- **框架**: React Native + Expo
- **状态管理**: Zustand
- **本地存储**: AsyncStorage + SQLite
- **UI 组件**: React Native Paper
- **语音**: expo-speech / expo-av
- **图表**: react-native-chart-kit
- **导航**: React Navigation

## 📁 项目结构

```
dutch-smart-memory/
├── src/
│   ├── components/      # 可复用 UI 组件
│   ├── screens/         # 页面组件
│   ├── services/        # 业务逻辑服务
│   │   ├── memoryEngine.ts    # 记忆算法引擎
│   │   ├── scheduler.ts       # 复习调度器
│   │   └── speechService.ts   # 语音服务
│   ├── hooks/           # 自定义 Hooks
│   ├── utils/           # 工具函数
│   ├── assets/          # 静态资源
│   ├── store/           # 状态管理
│   ├── types/           # TypeScript 类型定义
│   └── navigation/      # 导航配置
├── docs/                # 项目文档
│   └── SOP.md          # 产品 SOP
├── __tests__/          # 测试文件
└── package.json
```

## 🚀 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm start

# iOS 模拟器
npm run ios

# Android 模拟器
npm run android
```

## 📖 核心概念

### 记忆强度 (Memory Strength)
- 范围: 0-100
- 85+ 为掌握阈值
- 根据答题结果和用户自评动态调整

### 掌握判定
- 连续 5 天答对
- 记忆强度 ≥ 85
- 达标后进入低频复习池

### 每日学习结构
- 40% 新词学习
- 60% 复习旧词
- 智能穿插，避免疲劳

## 📄 License

MIT
