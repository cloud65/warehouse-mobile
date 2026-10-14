#!/usr/bin/env bash

set -Eeuo pipefail

REPO="git@github.com:cloud65/warehouse-mobile.git"
PROJECT_DIR="/opt/warehouse-mobile"
IMAGE="warehouse-android-builder:latest"
BRANCH="master"

echo "========================================"
echo " Warehouse Mobile Android Build"
echo "========================================"
echo

# Первоначальное клонирование или обновление проекта
if [[ ! -d "${PROJECT_DIR}/.git" ]]; then
    echo "==> Cloning repository..."
    git clone --branch "${BRANCH}" "${REPO}" "${PROJECT_DIR}"
else
    echo "==> Updating repository..."
    git -C "${PROJECT_DIR}" fetch origin "${BRANCH}"
    git -C "${PROJECT_DIR}" reset --hard "origin/${BRANCH}"
fi

echo
echo "==> Building Android APK..."

podman run --rm \
    -v "${PROJECT_DIR}:/workspace:Z" \
    -w /workspace \
    "${IMAGE}" \
    bash -lc '
        set -euo pipefail

        echo "==> Installing npm dependencies..."
        npm install

        if [[ ! -f android/app/debug.keystore ]]; then
            echo "==> Generating debug.keystore..."
            keytool -genkeypair \
                -keystore android/app/debug.keystore \
                -storepass android \
                -alias androiddebugkey \
                -keypass android \
                -keyalg RSA \
                -keysize 2048 \
                -validity 10000 \
                -dname "CN=Android Debug,O=Android,C=US"
        fi

        echo "==> Running Gradle..."
        cd android
        ./gradlew assembleRelease \
            --no-daemon \
            --build-cache \
            --parallel \
            --console=plain
    '

APK="${PROJECT_DIR}/android/app/build/outputs/apk/release/app-release.apk"

if [[ ! -f "${APK}" ]]; then
    echo
    echo "ERROR: APK was not created."
    exit 1
fi

echo
echo "========================================"
echo " BUILD SUCCESSFUL"
echo "========================================"
echo
echo "APK: ${APK}"
ls -lh "${APK}"
