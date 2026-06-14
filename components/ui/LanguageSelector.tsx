import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { theme } from '../../src/theme';

type LanguageCode = 'de' | 'en' | 'es' | 'fr' | 'he' | 'it' | 'ru' ;

type Props = {
  selected: string;
  onSelect: (lang: LanguageCode) => void;
  languages?: LanguageCode[];
  vertical?: boolean;
};  

export default function LanguageSelector({
  selected,
  onSelect,
  languages = ['de', 'en', 'es', 'fr', 'he', 'it', 'ru'],
  vertical = false,
}: Props) {
  return (
    <View style={vertical ? styles.column : styles.row}>
      {languages.map((lang) => (
        <TouchableOpacity key={lang} onPress={() => onSelect(lang)}>
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
    justifyContent: 'center',
    gap: 16,
  },
  column: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 10,
  },
  item: {
    fontSize: 16,
    color: theme.colors.textSecondary,     // как в Settings (#999)
    fontWeight: '400',
  },
  itemActive: {
    color: theme.colors.buttonPrimaryBg,   // как в Settings (#42A5F5)
    fontWeight: '700',
  },
});
