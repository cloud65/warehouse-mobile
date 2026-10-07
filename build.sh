#!/usr/bin/env bash

set -euo pipefail

REPO="git@github.com:cloud65/warehouse-mobile.git"
PROJECT_DIR="/opt/warehouse-mobile"
IMAGE="warehouse-android-builder:latest"

echo "==> Clone/update project"

if [[ -d "${PROJECT_DIR}/.git" ]]; then
    echo "Project already exists, updating..."
    git -C "${PROJECT_DIR}" pull --ff-only
else
    rm -rf "${PROJECT_DIR}"
    git clone "${REPO}" "${PROJECT_DIR}"
fi

echo
echo "==> Build Android APK"

podman run --rm \
    -v "${PROJECT_DIR}:/workspace:Z" \
    -w /workspace \
    "${IMAGE}" \
    bash -lc '
        npm install &&
        cd android &&
        ./gradlew assembleRelease --no-daemon
    '

APK="${PROJECT_DIR}/android/app/build/outputs/apk/release/app-release.apk"

echo
echo "==> BUILD SUCCESSFUL"
echo "APK: ${APK}"

ls -lh "${APK}"