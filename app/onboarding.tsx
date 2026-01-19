// app/onboarding.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Onboarding from 'react-native-onboarding-swiper';
import { Ionicons } from '@expo/vector-icons';

import i18n from '../i18n';
import { theme } from '../src/theme';

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },

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
  },

  // Оверлей — центрируем ОТ ЭКРАНА (а не от контейнера bottom bar)
  floatingWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 110, // безопасно выше android navigation bar
    alignItems: 'center',
    zIndex: 9999,
  },
  floatingBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#42A5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingBtnAndroid: {
    elevation: 0,
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
      <Text style={styles.onbTitle}>{i18n.t(titleKey)}</Text>
      <Image source={imgSource} style={styles.onbImage} resizeMode="contain" />
      <Text style={styles.onbSubtitle}>{i18n.t(subtitleKey)}</Text>
    </>
  );
}

export default function OnboardingScreen() {
  const router = useRouter();

  // В README указано, что компонент можно контролировать императивно через ref:
  // onboardingRef.current.goNext() / goToPage() :contentReference[oaicite:1]{index=1}
  const onboardingRef = useRef<any>(null);

  // Нужен индекс страницы, чтобы на последней стрелка делала Done
  // pageIndexCallback есть в README :contentReference[oaicite:2]{index=2}
  const [pageIndex, setPageIndex] = useState(0);

  const pages = [
    {
      backgroundColor: theme.colors.background,
      image: (
        <Slide
          imgSource={theme.images.onboarding.step1}
          titleKey="onboarding_1_title"
          subtitleKey="onboarding_1_subtitle"
        />
      ),
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
  ] as const;

  const lastIndex = pages.length - 1;

  const handleDone = async () => {
    await AsyncStorage.setItem('seenOnboarding', 'true');
    router.replace('/animal-selection');
  };

  const handleArrowPress = async () => {
    if (pageIndex >= lastIndex) {
      await handleDone();
      return;
    }
    onboardingRef.current?.goNext?.();
  };

  const lang = (i18n.locale || '').split('-')[0];
  const isRTL = lang === 'he';

  return (
    <View style={styles.root}>
      <Onboarding
        ref={onboardingRef}
        pages={pages as any}
        onDone={handleDone}
        showSkip={false}
        showNext={false}
        showDone={false}
        pageIndexCallback={(idx: number) => setPageIndex(idx)}
      />

      {/* ОВЕРЛЕЙ-КНОПКА: не внутри bottom bar, а поверх всего экрана */}
      <View pointerEvents="box-none" style={styles.floatingWrap}>
        <TouchableOpacity
          onPress={handleArrowPress}
          style={[
            styles.floatingBtn,
            Platform.OS === 'android' ? styles.floatingBtnAndroid : null,
          ]}
          hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
        >
          <Ionicons
            name={isRTL ? 'chevron-back' : 'chevron-forward'}
            size={30}
            color="#fff"
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}
