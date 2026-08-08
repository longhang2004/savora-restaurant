#!/usr/bin/env bash

# Tên file zip kết quả (cố định, không dùng timestamp)
ZIP_NAME="savora-restaurant.zip"

# Xoá file zip cũ nếu có để replace hoàn toàn mỗi lần chạy
if [ -f "$ZIP_NAME" ]; then
  echo "🗑️  Đang xoá file zip cũ: $ZIP_NAME..."
  rm -f "$ZIP_NAME"
fi

echo "📦 Đang nén repository vào $ZIP_NAME..."

# Build the archive from a filtered file list. Every .env* file is excluded
# except the explicitly shareable .env.example template.
find . -type f \
  ! -path './node_modules/*' \
  ! -path './.next/*' \
  ! -path './build/*' \
  ! -path './out/*' \
  ! -path './dist/*' \
  ! -path './coverage/*' \
  ! -path './.cache/*' \
  ! -path './.turbo/*' \
  ! -path './.vercel/*' \
  ! -path './.git/*' \
  ! -path './.reasonix/*' \
  ! -path './.pnpm-store/*' \
  ! -path './.local/*' \
  ! -path './test-results/*' \
  ! -path './playwright-report/*' \
  ! -name '.DS_Store' \
  ! -name '*.tsbuildinfo' \
  ! -name '*.zip' \
  \( -name '.env.example' -o \( ! -name '.env' ! -name '.env.*' \) \) \
  -print | zip -q -@ "$ZIP_NAME"

echo "✅ Nén thành công! File lưu tại: $ZIP_NAME"
