#!/bin/bash
# ============================================================================
# MindFlow .app 构建+部署一条龙（每次代码更新后跑这个）。
# 产物自动替换 /Applications/MindFlow.app 并启动。
# ============================================================================
set -euo pipefail
cd "$(dirname "$0")/.."

APP="MindFlow"
BUNDLE_ID="com.yiyi.mindflow"
VERSION="0.3.0"
OUT="build/${APP}.app"
DEST="/Applications/${APP}.app"

echo "── 1/5 构建前端 ──"
pnpm -C apps/desktop build 2>&1 | tail -1

echo "── 2/5 编译 release ──"
. "$HOME/.cargo/env"
cd src-tauri
cargo build --release 2>&1 | tail -1
cd ..

echo "── 3/5 组装 bundle ──"
rm -rf "$OUT"
mkdir -p "$OUT/Contents/MacOS" "$OUT/Contents/Resources"
cp src-tauri/target/release/mindflow "$OUT/Contents/MacOS/$APP"
cp src-tauri/icons/icon.icns "$OUT/Contents/Resources/${APP}.icns" 2>/dev/null || true

cat > "$OUT/Contents/Info.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleExecutable</key><string>${APP}</string>
    <key>CFBundleIdentifier</key><string>${BUNDLE_ID}</string>
    <key>CFBundleName</key><string>${APP}</string>
    <key>CFBundleDisplayName</key><string>${APP}</string>
    <key>CFBundleVersion</key><string>${VERSION}</string>
    <key>CFBundleShortVersionString</key><string>${VERSION}</string>
    <key>CFBundlePackageType</key><string>APPL</string>
    <key>CFBundleIconFile</key><string>${APP}</string>
    <key>LSMinimumSystemVersion</key><string>13.0</string>
    <key>NSHighResolutionCapable</key><true/>
</dict>
</plist>
PLIST
codesign --force --sign - "$OUT" 2>/dev/null

echo "── 4/5 删旧装新 ──"
# 杀掉正在运行的旧版
pkill -f "/Applications/${APP}.app" 2>/dev/null || true
sleep 1
rm -rf "$DEST"
ditto "$OUT" "$DEST"
codesign --verify "$DEST" 2>/dev/null

echo "── 5/5 启动 ──"
open "$DEST"
echo "✅ ${APP} 已更新并启动（${DEST}）"
