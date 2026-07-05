import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { theme } from '../../src/theme';

type LanguageCode =
  | 'bg'
  | 'de'
  | 'en'
  | 'es'
  | 'fr'
  | 'he'
  | 'it'
  | 'ka'
  | 'pl'
  | 'pt'
  | 'ru'
  | 'sr'
  | 'tr'
  | 'uk';

type Props = {
  selected: string;
  onSelect: (lang: LanguageCode) => void;
  languages?: LanguageCode[];
  vertical?: boolean;
};  

export default function LanguageSelector({
  selected,
  onSelect,
  languages = ['bg', 'de', 'en', 'es', 'fr', 'he', 'it', 'ka', 'pl', 'pt', 'ru', 'sr', 'tr', 'uk'],
  vertical = false,
}: Props) {
  return (
    <View style={vertical ? styles.column : styles.row}>
      {languages.map((lang) => (
        <TouchableOpacity
          key={lang}
          onPress={() => onSelect(lang)}
          style={vertical ? undefined : styles.itemButton}
        >
          <Text
            style={[
              styles.item,
              selected === lang && styles.itemActive,
            ]}
          >
            {lang.toUpperCase()}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    rowGap: 8,
    width: '100%',
    maxWidth: '100%',
  },
  itemButton: {
    width: '14.285%',
    alignItems: 'center',
    paddingVertical: 2,
  },
  column: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 10,
  },
  item: {
    textAlign: 'center',
    fontSize: 16,
    color: theme.colors.textSecondary,
    fontWeight: '400',
  },
  itemActive: {
    color: theme.colors.buttonPrimaryBg,   // как в Settings (#42A5F5)
    fontWeight: '700',
  },
});
