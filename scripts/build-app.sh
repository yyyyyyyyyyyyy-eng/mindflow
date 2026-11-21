#!/bin/bash
# ============================================================================
# MindFlow .app 打包脚本（macOS）
# 前置：pnpm install 已跑、Rust stable 已装、cargo 镜像已配
# 产物：build/MindFlow.app（可拷贝到 /Applications）
# ============================================================================

set -euo pipefail
cd "$(dirname "$0")/.."

APP="MindFlow"
BUNDLE_ID="com.yiyi.mindflow"
VERSION="0.3.0"
OUT="build/${APP}.app"

echo "── 1/4 构建前端 ──"
pnpm -C apps/desktop build 2>&1 | tail -2

echo "── 2/4 编译 release 二进制（LTO + strip，首次约 2-4 分钟）──"
. "$HOME/.cargo/env"
cd src-tauri
cargo build --release 2>&1 | tail -3
cd ..

echo "── 3/4 组装 .app bundle ──"
rm -rf "$OUT"
mkdir -p "$OUT/Contents/MacOS" "$OUT/Contents/Resources"

# 二进制
cp src-tauri/target/release/mindflow "$OUT/Contents/MacOS/$APP"

# 图标
cp src-tauri/icons/icon.icns "$OUT/Contents/Resources/${APP}.icns" 2>/dev/null || echo "(icon.icns 缺失，跳过)"

# Info.plist
cat > "$OUT/Contents/Info.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleExecutable</key>
    <string>${APP}</string>
    <key>CFBundleIdentifier</key>
    <string>${BUNDLE_ID}</string>
    <key>CFBundleName</key>
    <string>${APP}</string>
    <key>CFBundleDisplayName</key>
    <string>${APP}</string>
    <key>CFBundleVersion</key>
    <string>${VERSION}</string>
    <key>CFBundleShortVersionString</key>
    <string>${VERSION}</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleIconFile</key>
    <string>${APP}</string>
    <key>LSMinimumSystemVersion</key>
    <string>13.0</string>
    <key>NSHighResolutionCapable</key>
    <true/>
    <key>NSSupportsAutomaticGraphicsSwitching</key>
    <true/>
</dict>
</plist>
PLIST

# 签名（ad-hoc，Gatekeeper 首次打开需右键）
codesign --force --sign - "$OUT" 2>&1 | tail -1
codesign --verify "$OUT" 2>&1 | tail -1

echo "── 4/4 完成 ──"
echo "产物：$OUT"
echo "安装：ditto ${OUT} /Applications/${APP}.app && open /Applications/${APP}.app"
