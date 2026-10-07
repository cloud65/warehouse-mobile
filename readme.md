# Warehouse Mobile — инструкция сборки Android APK

## 1. Архитектура окружения

Разработка ведётся на Windows.

```text
Windows
  └── исходный код
       ↓ Git push
srv-test (AlmaLinux)
  ├── Git repository
  └── Podman
       └── warehouse-android-builder
            └── Android/Gradle build
                 ↓
              APK
```

Build-сервер:

* AlmaLinux 10.2 x86_64
* Podman 5.8.2
* Node.js 22
* Java 17
* Android SDK
* Android Platform 35
* Build Tools 35.0.0
* Expo/EAS CLI
* Git

Проект:

```text
/opt/warehouse-mobile
```

Git bare repository:

```text
/opt/git/warehouse-mobile.git
```

---

## 2. Получить актуальный код

На Windows:

```powershell
git add .
git commit -m "Описание изменений"
git push origin main
```

На `srv-test` обновить рабочую копию:

```bash
sudo -u git git -C /opt/warehouse-mobile pull
```

Проверить:

```bash
sudo -u git git -C /opt/warehouse-mobile status
```

Ожидается:

```text
On branch main
Your branch is up to date with 'origin/main'.

nothing to commit, working tree clean
```

---

## 3. Podman build container

Используется image:

```text
warehouse-android-builder:latest
```

Проверка:

```bash
podman images | grep warehouse-android-builder
```

Проверить инструменты:

```bash
podman run --rm \
  warehouse-android-builder:latest \
  bash -lc '
    node --version &&
    npm --version &&
    java -version &&
    sdkmanager --version &&
    adb version &&
    eas --version
  '
```

---

## 4. Expo prebuild

Если Android native-проект ещё не создан:

```bash
podman run --rm \
  -v /opt/warehouse-mobile:/workspace:Z \
  -w /workspace \
  warehouse-android-builder:latest \
  bash -lc '
    npm install &&
    npx expo prebuild --platform android
  '
```

После этого должен появиться каталог:

```text
/opt/warehouse-mobile/android
```

Проверка:

```bash
ls -la /opt/warehouse-mobile/android
```

После генерации native-файлы должны принадлежать `git`:

```bash
chown -R git:git /opt/warehouse-mobile/android
```

---

## 5. Прокси для Gradle

На `srv-test` прямое скачивание Maven-зависимостей работает очень медленно.

Используется SOCKS5:

```text
192.168.13.155:1080
```

В текущей конфигурации он указан в:

```text
android/gradle.properties
```

Параметры:

```properties
systemProp.socksProxyHost=192.168.13.155
systemProp.socksProxyPort=1080
```

Проверить доступность прокси:

```bash
podman run --rm \
  warehouse-android-builder:latest \
  bash -lc '
    curl -I \
      --socks5-hostname 192.168.13.155:1080 \
      --connect-timeout 10 \
      --max-time 30 \
      https://repo.maven.apache.org/maven2/com/facebook/react/react-android/0.86.3/react-android-0.86.3-release.aar
  '
```

Ожидается HTTP `200` после redirect.

> Если проект когда-нибудь будет собираться без этого прокси, настройки прокси нужно вынести из Git-конфигурации и задавать отдельно на build-сервере.

---

## 6. Сборка Release APK

Основная команда:

```bash
podman run --rm \
  -v /opt/warehouse-mobile:/workspace:Z \
  -w /workspace \
  warehouse-android-builder:latest \
  bash -lc '
    cd android &&
    ./gradlew assembleRelease --no-daemon
  '
```

Успешный результат:

```text
BUILD SUCCESSFUL
```

APK находится здесь:

```text
/opt/warehouse-mobile/android/app/build/outputs/apk/release/app-release.apk
```

Проверить:

```bash
ls -lh \
  /opt/warehouse-mobile/android/app/build/outputs/apk/release/app-release.apk
```

Текущий размер первого APK:

```text
66 MB
```

---

## 7. Передача APK на Windows

Например:

```powershell
scp root@srv-test:/opt/warehouse-mobile/android/app/build/outputs/apk/release/app-release.apk .
```

Если SSH-доступ root запрещён, сначала скопировать APK в доступный каталог пользователя.

---

## 8. Установка APK на Android

### Вариант A — вручную

Передать APK на телефон:

* USB
* файловый обмен
* Telegram
* облачное хранилище

Открыть APK и выполнить установку.

### Вариант B — через ADB

Проверить подключение:

```powershell
adb devices
```

Установить:

```powershell
adb install -r .\app-release.apk
```

---

## 9. Первый smoke-test

После установки проверить:

1. приложение устанавливается;
2. приложение запускается;
3. отображается экран;
4. приложение не падает.

Текущая тестовая версия показывает:

```text
Warehouse Mobile

Сборка работает!
```

Этот этап уже успешно пройден на обычном Android-телефоне.

---

## 10. Git после prebuild

После `expo prebuild` проверить:

```bash
sudo -u git git -C /opt/warehouse-mobile status
```

Не выполнять автоматически:

```bash
git add .
git commit .
```

Сначала нужно посмотреть, какие файлы изменились.

Native-каталог `android/` в дальнейшем понадобится для интеграции Mindeo M40, поэтому после стабилизации native-проекта его следует добавить в Git.

---

# Краткая последовательность повторной сборки

Если проект уже настроен и `android/` существует:

```bash
sudo -u git git -C /opt/warehouse-mobile pull
```

затем:

```bash
podman run --rm \
  -v /opt/warehouse-mobile:/workspace:Z \
  -w /workspace \
  warehouse-android-builder:latest \
  bash -lc '
    cd android &&
    ./gradlew assembleRelease --no-daemon
  '
```

APK:

```text
/opt/warehouse-mobile/android/app/build/outputs/apk/release/app-release.apk
```

Проверка:

```bash
ls -lh /opt/warehouse-mobile/android/app/build/outputs/apk/release/app-release.apk
```

---

# Текущее состояние проекта

На данный момент подтверждено:

* [x] React Native / Expo проект создан
* [x] Git repository настроен
* [x] `srv-test` настроен как build-сервер
* [x] Podman build image создан
* [x] Expo prebuild работает
* [x] Android Gradle build работает
* [x] SOCKS5 используется для Maven-зависимостей
* [x] Release APK собирается
* [x] APK установлен на обычный Android-телефон
* [x] Приложение запускается

Следующий этап:

```text
Mindeo M40
   ↓
аппаратный сканер
   ↓
Broadcast Intent
   ↓
Android BroadcastReceiver
   ↓
React Native
   ↓
штрихкод на экране
```
