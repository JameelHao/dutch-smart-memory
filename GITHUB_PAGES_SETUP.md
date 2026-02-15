# GitHub Pages 设置指南

## ✅ 已完成的配置

1. ✅ 安装 Web 依赖 (react-dom, react-native-web, @expo/metro-runtime)
2. ✅ 配置 app.json Web 平台设置
3. ✅ 添加 `build:web` 脚本到 package.json
4. ✅ 创建 GitHub Actions workflow (.github/workflows/deploy.yml)
5. ✅ 提交并推送所有更改到 GitHub

## 🔧 需要手动完成的步骤

### 步骤 1: 启用 GitHub Pages

1. 打开仓库页面: https://github.com/JameelHao/dutch-smart-memory
2. 点击 **Settings** (设置)
3. 在左侧菜单找到 **Pages**
4. 在 "Build and deployment" 部分：
   - **Source**: 选择 "GitHub Actions"
5. 点击 **Save** (保存)

### 步骤 2: 触发首次部署

有两种方式触发部署：

**方式 1: 自动触发 (推荐)**
- 由于代码已经推送，GitHub Actions 应该会自动运行
- 访问 https://github.com/JameelHao/dutch-smart-memory/actions 查看进度

**方式 2: 手动触发**
1. 访问 https://github.com/JameelHao/dutch-smart-memory/actions
2. 点击左侧的 "Deploy to GitHub Pages"
3. 点击右侧的 "Run workflow" 按钮
4. 选择 "main" 分支
5. 点击绿色的 "Run workflow" 按钮

### 步骤 3: 等待部署完成

1. 在 Actions 页面查看部署进度
2. 部署通常需要 2-5 分钟
3. 成功后会显示绿色的 ✓ 标记

### 步骤 4: 访问部署的网站

部署成功后，访问:
**https://jameelhao.github.io/dutch-smart-memory/**

## 🔍 故障排查

### 如果 Actions 显示错误

1. **权限错误**: 
   - Settings → Actions → General
   - 滚动到 "Workflow permissions"
   - 选择 "Read and write permissions"
   - 勾选 "Allow GitHub Actions to create and approve pull requests"
   - 保存更改

2. **Pages 未启用**:
   - 确认在 Settings → Pages 中选择了 "GitHub Actions" 作为 Source

3. **构建失败**:
   - 查看 Actions 日志中的具体错误信息
   - 检查是否所有依赖都正确安装

### 测试访问

部署完成后，你应该能够：
- 在浏览器中打开 Web 应用
- 看到首页界面
- 进行基本的交互测试

## 📱 本地测试

在推送之前，可以本地测试 Web 版本：

```bash
# 开发模式
npm run web

# 构建并预览
npm run build:web
npx http-server dist -p 8000
# 然后访问 http://localhost:8000
```

## 🚀 后续更新

每次推送到 `main` 分支时，GitHub Actions 会自动：
1. 构建最新的 Web 版本
2. 部署到 GitHub Pages
3. 更新线上版本

无需手动操作！

## 📞 需要帮助？

如果遇到问题：
1. 检查 GitHub Actions 日志
2. 查看 DEPLOY.md 文档
3. 确认所有步骤都已正确执行
