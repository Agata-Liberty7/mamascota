// app/terms-screen.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import TermsModal from '../components/TermsModal';

export default function TermsScreen() {
  const router = useRouter();
  const [visible, setVisible] = useState(true); // показываем модалку сразу

  const handleAccept = async () => {
    await AsyncStorage.multiSet([
      ['acceptedTerms', 'true'],
      ['termsAccepted', 'true'],
    ]);
    setVisible(false);
    router.replace('/onboarding'); // теперь после Условий всегда идём в онбординг
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
