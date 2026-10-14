import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as SQLite from 'expo-sqlite';
import * as SecureStore from 'expo-secure-store';
import { StatusBar } from 'expo-status-bar';

const PASSWORD_KEY = 'api_password';

export default function App() {
  const [apiUrl, setApiUrl] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const [hasSavedPassword, setHasSavedPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      const db = await SQLite.openDatabaseAsync('warehouse.db');

      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS app_settings (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          api_url TEXT NOT NULL,
          username TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
      `);

      const settings = await db.getFirstAsync(
        'SELECT api_url, username FROM app_settings WHERE id = 1'
      );

      if (settings) {
        setApiUrl(settings.api_url);
        setUsername(settings.username);
      }

      const savedPassword =
        await SecureStore.getItemAsync(PASSWORD_KEY);

      setHasSavedPassword(savedPassword !== null);
    } catch (error) {
      Alert.alert(
        'Ошибка',
        'Не удалось загрузить настройки приложения.'
      );
      console.error('Load settings error:', error);
    } finally {
      setLoading(false);
    }
  }

  async function saveSettings() {
    const url = apiUrl.trim();
    const login = username.trim();
    const newPassword = password;

    if (!url || !login) {
      Alert.alert(
        'Проверьте данные',
        'Укажите адрес API и логин.'
      );
      return;
    }

    let parsedUrl;

    try {
      parsedUrl = new URL(url);
    } catch {
      Alert.alert(
        'Некорректный адрес',
        'Введите полный адрес, например https://server.example.com/api/v1'
      );
      return;
    }

    if (
      !['http:', 'https:'].includes(parsedUrl.protocol) ||
      parsedUrl.username ||
      parsedUrl.password
    ) {
      Alert.alert(
        'Некорректный адрес',
        'Укажите HTTP(S)-адрес без логина и пароля внутри URL.'
      );
      return;
    }

    if (!newPassword && !hasSavedPassword) {
      Alert.alert('Введите пароль', 'Пароль ещё не сохранён.');
      return;
    }

    setSaving(true);

    try {
      const db = await SQLite.openDatabaseAsync('warehouse.db');

      // Если введён новый пароль — сохраняем его отдельно.
      if (newPassword.length > 0) {
        await SecureStore.setItemAsync(
          PASSWORD_KEY,
          newPassword
        );
        setHasSavedPassword(true);
        setPassword('');
      }

      await db.runAsync(
        `INSERT INTO app_settings
          (id, api_url, username, updated_at)
         VALUES (1, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           api_url = excluded.api_url,
           username = excluded.username,
           updated_at = excluded.updated_at`,
        url,
        login,
        new Date().toISOString()
      );

      setApiUrl(url);
      setUsername(login);

      Alert.alert(
        'Готово',
        'Настройки подключения сохранены.'
      );
    } catch (error) {
      Alert.alert(
        'Ошибка сохранения',
        'Не удалось сохранить настройки. Попробуйте ещё раз.'
      );
      console.error('Save settings error:', error);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>
          Загрузка настроек...
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar style="dark" />

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.appName}>Warehouse Mobile</Text>
          <Text style={styles.title}>Настройки подключения</Text>
          <Text style={styles.subtitle}>
            Укажите данные сервера учётной системы.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Адрес API</Text>
          <TextInput
            style={styles.input}
            value={apiUrl}
            onChangeText={setApiUrl}
            placeholder="https://server.example.com/api/v1"
            keyboardType="url"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!saving}
          />

          <Text style={styles.label}>Логин</Text>
          <TextInput
            style={styles.input}
            value={username}
            onChangeText={setUsername}
            placeholder="Введите логин"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!saving}
          />

          <Text style={styles.label}>Пароль</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder={
              hasSavedPassword
                ? 'Оставьте пустым, чтобы не менять'
                : 'Введите пароль'
            }
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            editable={!saving}
          />

          {hasSavedPassword && (
            <Text style={styles.hint}>
              <Text style={styles.statusDot}>● </Text>
              Пароль сохранён. Введите новый, только если
              хотите его изменить.
            </Text>
          )}

          <Pressable
            style={[
              styles.button,
              saving && styles.buttonDisabled,
            ]}
            onPress={saveSettings}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.buttonText}>
                Сохранить настройки
              </Text>
            )}
          </Pressable>
        </View>

        <Text style={styles.footer}>
          Данные сохраняются на этом устройстве.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f3f5f8',
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f5f8',
  },
  loadingText: {
    marginTop: 12,
    color: '#64748b',
  },
  header: {
    marginBottom: 24,
  },
  appName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2563eb',
    marginBottom: 12,
  },
  title: {
    fontSize: 27,
    fontWeight: '700',
    color: '#172033',
  },
  subtitle: {
    fontSize: 15,
    color: '#64748b',
    marginTop: 8,
    lineHeight: 22,
  },
  card: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 15,
    color: '#172033',
    backgroundColor: '#ffffff',
  },
  hint: {
    marginTop: 12,
    fontSize: 13,
    lineHeight: 19,
    color: '#64748b',
  },
  statusDot: {
    color: '#16a34a',
  },
  button: {
    minHeight: 50,
    marginTop: 24,
    borderRadius: 10,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 20,
  },
});