cat > /opt/build.sh <<'EOF'
#!/usr/bin/env bash

set -euo pipefail

REPO="git@github.com:cloud65/warehouse-mobile.git"
PROJECT_DIR="/opt/warehouse-mobile"
IMAGE="warehouse-android-builder:latest"

echo "========================================"
echo " Warehouse Mobile Android Build"
echo "========================================"
echo

echo "==> Removing old project..."
rm -rf "${PROJECT_DIR}"

echo "==> Cloning repository..."
git clone --branch master "${REPO}" "${PROJECT_DIR}"

echo
echo "==> Building Android APK..."

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
echo "APK:"
echo "${APK}"
echo

ls -lh "${APK}"
EOF

chmod +x /opt/build.sh