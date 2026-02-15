# 部署指南

## GitHub Pages 部署

本项目已配置自动部署到 GitHub Pages。

### 访问地址
- **生产环境**: https://jameelhao.github.io/dutch-smart-memory/

### 自动部署流程

每次推送到 `main` 分支时，GitHub Actions 会自动：
1. 安装依赖
2. 构建 Web 版本
3. 部署到 GitHub Pages

### 手动触发部署

1. 访问 GitHub 仓库的 Actions 页面
2. 选择 "Deploy to GitHub Pages" workflow
3. 点击 "Run workflow"

### 本地构建和预览

```bash
# 构建 Web 版本
npm run build:web

# 预览构建产物（需要安装 http-server）
npx http-server dist -p 8000
```

### 首次配置 GitHub Pages

如果这是首次部署，需要在 GitHub 仓库设置中启用 GitHub Pages：

1. 进入仓库设置: Settings → Pages
2. Source 选择: "GitHub Actions"
3. 保存设置

### 故障排查

如果部署失败：
1. 检查 GitHub Actions 日志
2. 确认 GitHub Pages 已启用
3. 确认有 Pages 部署权限

### 技术栈

- **框架**: React Native + Expo
- **Web 支持**: react-native-web
- **构建工具**: Expo Metro Bundler
- **部署**: GitHub Actions + GitHub Pages
