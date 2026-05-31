#!/usr/bin/env bash
set -euo pipefail

# ============================================
# WA-AKG E2E Test Runner
# 在真实环境中运行端到端测试
# ============================================

E2E_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PROJECT_DIR="$(cd "$E2E_DIR/.." && pwd)"

echo "========================================"
echo "  WA-AKG E2E Test Runner"
echo "========================================"
echo ""

# 1. 构建生产版本（加速启动）
echo "[1/5] 构建生产版本..."
cd "$PROJECT_DIR"
npm run build 2>/dev/null || { echo "⚠️  Build 失败，继续尝试..."; }

# 2. 设置测试环境变量
echo "[2/5] 设置测试环境..."
export NODE_ENV=production
export PORT=3001
export ADMIN_EMAIL=admin@admin.com
export ADMIN_PASSWORD=admin123

# 使用测试专用 .env（如不存在则复用当前 .env）
if [ ! -f ".env.e2e" ]; then
  echo "⚠️  未找到 .env.e2e，使用当前 .env"
else
  export $(grep -v '^\s*#' .env.e2e | grep -v '^\s*$' | xargs)
fi

# 3. 确保数据库就绪
echo "[3/5] 检查数据库..."
npx prisma db push --skip-generate 2>/dev/null || {
  echo "⚠️  数据库连接失败，请确保数据库已启动"
  echo "   运行: docker compose up -d db"
  exit 1
}

# 4. 创建管理员用户（如果不存在）
echo "[4/5] 确保管理员用户存在..."
node scripts/setup-admin.js admin@admin.com admin123 2>/dev/null || true

# 5. 启动服务器并运行测试
echo "[5/5] 启动服务器 + 运行 E2E 测试..."

# 在后台启动服务器
npx tsx src/server/index.ts &
SERVER_PID=$!
echo "  服务器 PID: $SERVER_PID"

# 等待服务器就绪
for i in $(seq 1 60); do
  if curl -s http://localhost:$PORT > /dev/null 2>&1; then
    echo "  服务器就绪! (${i}s)"
    break
  fi
  if [ $i -eq 60 ]; then
    echo "❌ 服务器启动超时"
    kill $SERVER_PID 2>/dev/null || true
    exit 1
  fi
  sleep 1
done

# 运行 Playwright 测试
echo ""
echo "📋 开始执行 E2E 测试..."
cd "$PROJECT_DIR"
npx playwright test tests/e2e/ --reporter=list --timeout=120000
TEST_EXIT_CODE=$?

# 清理
echo ""
echo "🛑 关闭服务器..."
kill $SERVER_PID 2>/dev/null || true
wait $SERVER_PID 2>/dev/null || true

echo ""
if [ $TEST_EXIT_CODE -eq 0 ]; then
  echo "✅ 所有 E2E 测试通过"
else
  echo "❌ E2E 测试有失败 ($TEST_EXIT_CODE)"
fi

exit $TEST_EXIT_CODE
