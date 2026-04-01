// app/onboarding.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useMemo, useRef, useState } from 'react';
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

const stylesMobile = StyleSheet.create({
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
  floatingWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 110,
    alignItems: 'center',
    zIndex: 9999,
  },
  floatingBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.buttonPrimaryBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingBtnAndroid: {
    elevation: 0,
  },
});

const stylesWeb = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  onbTitle: {
    fontSize: 28,
    fontWeight: '600',
    textAlign: 'center',
    color: theme.colors.textPrimary,
    marginTop: 28,
    marginHorizontal: 24,
    maxWidth: 480,
    alignSelf: 'center',
  },
  onbSubtitle: {
    fontSize: 18,
    textAlign: 'center',
    color: theme.colors.textSecondary,
    marginTop: 12,
    marginHorizontal: 24,
    lineHeight: 28,
    maxWidth: 480,
    alignSelf: 'center',
  },
  onbImage: {
    width: '100%',
    maxWidth: 480,
    height: undefined,
    aspectRatio: 2,
    marginTop: 12,
    alignSelf: 'center',
  },
  floatingWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 110,
    alignItems: 'center',
    zIndex: 9999,
  },
  floatingBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.buttonPrimaryBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  floatingBtnAndroid: {
    elevation: 0,
  },
  contentWeb: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 20,
    paddingBottom: 18,
    paddingHorizontal: 24,
  },
  topBlockWeb: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 6,
  },
  heroBlockWeb: {
    width: '90%',
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomBlockWeb: {
    width: '100%',
    alignItems: 'center',
    marginTop: 12,
  },
  paginationWeb: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  dotWeb: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#BDBDBD',
    marginHorizontal: 6,
  },
  dotWebActive: {
    backgroundColor: theme.colors.textPrimary,
  },
});

function Slide({
  imgSource,
  titleKey,
  subtitleKey,
  styles,
}: {
  imgSource: any;
  titleKey: string;
  subtitleKey: string;
  styles: any;
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

  const lang = (i18n.locale || '').split('-')[0];
  const isRTL = lang === 'he';
  const isWeb = Platform.OS === 'web';
  const styles = isWeb ? stylesWeb : stylesMobile;

  const webSlides = useMemo(
    () => [
      {
        image: theme.images.onboarding.step1,
        title: i18n.t('onboarding_1_title'),
        subtitle: i18n.t('onboarding_1_subtitle'),
      },
      {
        image: theme.images.onboarding.step2,
        title: i18n.t('onboarding_2_title'),
        subtitle: i18n.t('onboarding_2_subtitle'),
      },
      {
        image: theme.images.onboarding.step3,
        title: i18n.t('onboarding_3_title'),
        subtitle: i18n.t('onboarding_3_subtitle'),
      },
    ],
    [i18n.locale]
  );

  const currentWebSlide = webSlides[pageIndex] ?? webSlides[0];

  const mobilePages = [
    {
      backgroundColor: theme.colors.background,
      image: (
        <Slide
          imgSource={theme.images.onboarding.step1}
          titleKey="onboarding_1_title"
          subtitleKey="onboarding_1_subtitle"
          styles={stylesMobile}
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
          styles={stylesMobile}
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
          styles={stylesMobile}
        />
      ),
      title: '',
      subtitle: '',
    },
  ] as const;

  const lastIndex = webSlides.length - 1;

  const handleDone = async () => {
    await AsyncStorage.setItem('seenOnboarding', 'true');
    router.replace('/animal-selection');
  };

  const handleArrowPress = async () => {
    if (pageIndex >= lastIndex) {
      await handleDone();
      return;
    }

    if (isWeb) {
      setPageIndex((prev) => Math.min(prev + 1, lastIndex));
      return;
    }

    onboardingRef.current?.goNext?.();
  };

  return (
    <View style={styles.root}>
      {isWeb ? (
        <View style={stylesWeb.contentWeb}>
          <View style={stylesWeb.topBlockWeb}>
            <Text style={stylesWeb.onbTitle}>{currentWebSlide.title}</Text>
          </View>

          <View style={stylesWeb.heroBlockWeb}>
            <Image
              source={currentWebSlide.image}
              style={stylesWeb.onbImage}
              resizeMode="contain"
            />
          </View>

          <View style={stylesWeb.bottomBlockWeb}>
            <Text style={stylesWeb.onbSubtitle}>{currentWebSlide.subtitle}</Text>

            <TouchableOpacity
              onPress={handleArrowPress}
              style={stylesWeb.floatingBtn}
              hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
            >
              <Ionicons
                name={isRTL ? 'chevron-back' : 'chevron-forward'}
                size={24}
                color={theme.colors.buttonPrimaryText}
              />
            </TouchableOpacity>

            <View style={stylesWeb.paginationWeb}>
              {webSlides.map((_, idx) => (
                <View
                  key={`dot-${idx}`}
                  style={[
                    stylesWeb.dotWeb,
                    idx === pageIndex && stylesWeb.dotWebActive,
                  ]}
                />
              ))}
            </View>
          </View>
        </View>
      ) : (
        <>
          <Onboarding
            ref={onboardingRef}
            pages={mobilePages as any}
            onDone={handleDone}
            showSkip={false}
            showNext={false}
            showDone={false}
            pageIndexCallback={(idx: number) => setPageIndex(idx)}
          />

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
                color={theme.colors.buttonPrimaryText}
              />
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}
