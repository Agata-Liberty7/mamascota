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
  slideContent: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 24,
  },
  onbTitle: {
    fontSize: 22,
    fontWeight: '600',
    textAlign: 'center',
    color: theme.colors.textPrimary,
    marginTop: 8,
    marginHorizontal: 24,
  },
  onbSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: theme.colors.textSecondary,
    marginTop: 8,
    marginHorizontal: 28,
    lineHeight: 23,
  },
  onbSubtitleAccent: {
    fontWeight: '700',
    color: theme.colors.buttonPrimaryBg,
  },
  onbImage: {
    width: '74%',
    height: undefined,
    aspectRatio: 2,
    marginTop: 28,
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
  slideContent: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-start',
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
  onbSubtitleAccent: {
    fontWeight: '700',
    color: theme.colors.buttonPrimaryBg,
  },
  onbImage: {
    width: '55%',
    maxWidth: 260,
    height: 'auto',
    aspectRatio: 1,
    marginTop: 20,
    alignSelf: 'center',
  },
  onbImageLarge: {
    width: '62%',
    maxWidth: 300,
    height: undefined,
    aspectRatio: 1,
    marginTop: 14,
    alignSelf: 'center',
  },
  onbImageMedium: {
    width: '52%',
    maxWidth: 240,
    height: undefined,
    aspectRatio: 1,
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
    height: '100%',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 24,
    paddingBottom: 24,
    paddingHorizontal: 24,
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
    paddingBottom: 8,
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

function renderHighlightedText(
  text: string,
  baseStyle: any,
  accentStyle: any
) {
  const parts = String(text || '').split(/(\[\[.*?\]\])/g);

  return (
    <Text style={baseStyle}>
      {parts.map((part, idx) => {
        const match = part.match(/^\[\[(.*?)\]\]$/);
        if (match) {
          return (
            <Text key={idx} style={accentStyle}>
              {match[1]}
            </Text>
          );
        }

        return <Text key={idx}>{part}</Text>;
      })}
    </Text>
  );
}

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
    <View style={styles.slideContent}>
      <Text style={styles.onbTitle}>{i18n.t(titleKey)}</Text>

      {renderHighlightedText(
        String(i18n.t(subtitleKey)),
        styles.onbSubtitle,
        styles.onbSubtitleAccent
      )}

      <Image source={imgSource} style={styles.onbImage} resizeMode="contain" />
    </View>
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
      {
        image: theme.images.onboarding.step4,
        title: i18n.t('onboarding_4_title'),
        subtitle: i18n.t('onboarding_4_subtitle'),
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
    {
      backgroundColor: theme.colors.background,
      image: (
        <Slide
          imgSource={theme.images.onboarding.step4}
          titleKey="onboarding_4_title"
          subtitleKey="onboarding_4_subtitle"
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
          <View style={stylesWeb.slideContent}>
            <Text style={stylesWeb.onbTitle}>{currentWebSlide.title}</Text>

            {renderHighlightedText(
              String(currentWebSlide.subtitle),
              stylesWeb.onbSubtitle,
              stylesWeb.onbSubtitleAccent
            )}

            <Image
              source={currentWebSlide.image}
              style={stylesWeb.onbImage}
              resizeMode="contain"
            />

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
