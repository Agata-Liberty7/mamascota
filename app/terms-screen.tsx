// app/terms-screen.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import TermsModal from '../components/TermsModal';
import { getUiVariant } from "../utils/analytics";

export default function TermsScreen() {
  const router = useRouter();
  const [visible, setVisible] = useState(true); // показываем модалку сразу

  const handleAccept = async () => {
    await AsyncStorage.multiSet([
      ['acceptedTerms', 'true'],
      ['termsAccepted', 'true'],
    ]);
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
