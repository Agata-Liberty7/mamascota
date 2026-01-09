// app/onboarding.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, TouchableOpacityProps } from 'react-native';
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
const SkipButton: React.FC<TouchableOpacityProps> = (p) => <Btn labelKey="onboarding_skip" {...p} />;
const NextButton: React.FC<TouchableOpacityProps> = (p) => <Btn labelKey="onboarding_next" {...p} />;
const DoneButton: React.FC<TouchableOpacityProps> = (p) => <Btn labelKey="onboarding_start" {...p} />;

const styles = StyleSheet.create({
  onbTitle: {
    fontSize: 22,
    fontWeight: '600',
    textAlign: 'center',
    color: theme.colors.textPrimary,
    marginTop: 24,
    marginHorizontal: 24,
  },
  onbSubtitle: {
    fontSize: 15,
    textAlign: 'center',
    color: theme.colors.textSecondary,
    marginTop: 12,
    marginHorizontal: 28,
    lineHeight: 22,
  },
  onbImage: {
    width: '100%',
    height: undefined,
    aspectRatio: 2,
    marginTop: 12,
    marginBottom: 0,
  },
});

function Slide({
  imgSource,
  titleKey,
  subtitleKey,
}: {
  imgSource: any;
  titleKey: string;
  subtitleKey: string;
}) {
  return (
    <>
      {/* Заголовок */}
      <Text style={styles.onbTitle}>
        {i18n.t(titleKey)}
      </Text>

      {/* Картинка */}
      <Image
        source={imgSource}
        style={styles.onbImage}
        resizeMode="contain"
      />

      {/* Текст */}
      <Text style={styles.onbSubtitle}>
        {i18n.t(subtitleKey)}
      </Text>
    </>
  );
}


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
            <Slide
              imgSource={theme.images.onboarding.step1}
              titleKey="onboarding_1_title"
              subtitleKey="onboarding_1_subtitle"
            />
          ),
          // Отключаем стандартный рендер title/subtitle снизу
          title: '',
          subtitle: '',
        },
        {
          backgroundColor: theme.colors.background,
          image: (
            <Slide
              imgSource={theme.images.onboarding.step2}
              titleKey="onboarding_2_title"
              subtitleKey="onboarding_2_subtitle"
            />
          ),
          title: '',
          subtitle: '',
        },
        {
          backgroundColor: theme.colors.background,
          image: (
            <Slide
              imgSource={theme.images.onboarding.step3}
              titleKey="onboarding_3_title"
              subtitleKey="onboarding_3_subtitle"
            />
          ),
          title: '',
          subtitle: '',
        },
      ]}
    />
  );
}
  