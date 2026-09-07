// app/terms-screen.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import TermsModal from '../components/TermsModal';
import i18n from '../i18n';
import {
  getUiVariant,
  trackAnalyticsEvent,
} from "../utils/analytics";

export default function TermsScreen() {
  const router = useRouter();
  const [visible, setVisible] = useState(true); // показываем модалку сразу

  useEffect(() => {
    trackAnalyticsEvent("entry_terms_view", i18n.locale);
  }, []);

  const handleAccept = async () => {
    await AsyncStorage.multiSet([
      ['acceptedTerms', 'true'],
      ['termsAccepted', 'true'],
    ]);

    trackAnalyticsEvent("entry_terms_accepted", i18n.locale);
    setVisible(false);
    const uiVariant = getUiVariant();

    if (uiVariant === "v2") {
      router.replace("/animal-selection");
      return;
    }

    router.replace("/about?source=first_entry" as any);
  };


  const handleDecline = () => {
    setVisible(false);
    router.replace('/'); // возврат на главный экран при отказе
  };

  return (
    <TermsModal
      visible={visible}
      onAccept={handleAccept}
      onDecline={handleDecline}
    />
  );
}
