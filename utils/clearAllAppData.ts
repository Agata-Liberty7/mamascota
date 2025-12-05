// utils/clearAllAppData.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Полная очистка рабочих данных приложения:
 * - питомцы (новая и старая модели),
 * - сессии и история чатов,
 * - симптомы.
 *
 * Специально НЕ трогаем:
 * - selectedLanguage
 * - флаги онбординга / уведомлений
 * - настройки масштаба текста
 */
export async function clearAllAppData() {
  try {
    const allKeys = await AsyncStorage.getAllKeys();

    const explicitKeys = [
      // 🐾 Питомцы — новая модель
      'pets:list',
      'pets:activeId',

      // 🐾 Питомцы — легаси-ключи (на всякий случай, чтобы вычистить хвосты)
      'pets',
      'petsList',
      'activePetId',
      'currentPetId',
      'animalProfile',

      // 💬 Чат / сессии
      'chatSummary', 
      'sessionSaved',
      'lastChatSessionExists',
      'restoreFromSummary',
      'restoreFromHistory',

      // ⚖️ Согласие с условиями и онбординг
      'acceptedTerms',
      'termsAccepted',
      'seenOnboarding',   // каноничный флаг
      'onboardingSeen',   // на всякий случай: чистим старый ключ, если где-то остался

      // 🤒 Симптомы
      'symptomKeys',
      'selectedSymptoms',
      'symptoms',
    ];

    const keysToRemove = allKeys.filter((key) =>
      explicitKeys.includes(key) ||
      key.startsWith('chatHistory:') ||
      key.startsWith('chatSummary:')
    );

    if (keysToRemove.length > 0) {
      await AsyncStorage.multiRemove(keysToRemove);
      console.log('🧹 clearAllAppData removed keys:', keysToRemove);
    } else {
      console.log('🧹 clearAllAppData: nothing to remove');
    }
  } catch (err) {
    console.error('❌ clearAllAppData error:', err);
  }
}
