// app/onboarding.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableOpacityProps,
} from 'react-native';
import Onboarding from 'react-native-onboarding-swiper';
import i18n from '../i18n';
import { theme } from '../src/theme';

// Универсальная кнопка для Onboarding
type BtnProps = TouchableOpacityProps & { labelKey: string };

const Btn: React.FC<BtnProps> = ({ labelKey, ...props }) => (
  <TouchableOpacity style={{ marginHorizontal: 10 }} {...props}>
    <Text style={{ fontSize: 16, color: theme.colors.textPrimary }}>
      {i18n.t(labelKey)}
    </Text>
  </TouchableOpacity>
);

// Обёртки с явной типизацией — так не будет implicit any
const SkipButton: React.FC<TouchableOpacityProps> = (p) => (
  <Btn labelKey="onboarding_skip" {...p} />
);
const NextButton: React.FC<TouchableOpacityProps> = (p) => (
  <Btn labelKey="onboarding_next" {...p} />
);
const DoneButton: React.FC<TouchableOpacityProps> = (p) => (
  <Btn labelKey="onboarding_start" {...p} />
);

const styles = StyleSheet.create({
  onbImage: {
    width: '100%',
    height: undefined,
    aspectRatio: 2,   // квадратная область, масштабируется
    marginTop: 8,
    marginBottom: 0, 
  },
});

export default function OnboardingScreen() {
  const router = useRouter();

  const handleDone = async () => {
    await AsyncStorage.setItem('seenOnboarding', 'true');
    router.replace('/animal-selection');
  };


  return (
    <Onboarding
      onSkip={handleDone}
      onDone={handleDone}
      SkipButtonComponent={SkipButton}
      NextButtonComponent={NextButton}
      DoneButtonComponent={DoneButton}
      pages={[
        {
          backgroundColor: theme.colors.background,
          image: (
            <Image
              source={theme.images.onboarding.step1}
              style={styles.onbImage}
              resizeMode="contain"
            />
          ),
          title: i18n.t('onboarding_1_title'),
          subtitle: i18n.t('onboarding_1_subtitle'),
        },
        {
          backgroundColor: theme.colors.background,
          image: (
            <Image
              source={theme.images.onboarding.step2}
              style={styles.onbImage}
              resizeMode="contain"
            />
          ),
          title: i18n.t('onboarding_2_title'),
          subtitle: i18n.t('onboarding_2_subtitle'),
        },
        {
          backgroundColor: theme.colors.background,
          image: (
            <Image
              source={theme.images.onboarding.step3}
              style={styles.onbImage}
              resizeMode="contain"
            />
          ),
          title: i18n.t('onboarding_3_title'),
          subtitle: i18n.t('onboarding_3_subtitle'),
        },
        {
          backgroundColor: theme.colors.background,
          image: (
            <Image
              source={theme.images.onboarding.step4}
              style={styles.onbImage}
              resizeMode="contain"
            />
          ),
          title: i18n.t('onboarding_4_title'),
          subtitle: i18n.t('onboarding_4_subtitle'),
        },
      ]}
    />
  );
}
