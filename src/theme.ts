// src/theme.ts
export const theme = {
  colors: {
    background: '#FFFFFF',
    textPrimary: '#222',
    textSecondary: '#555',
    textLight: '#888',
    buttonPrimaryBg: '#42A5F5',
    buttonPrimaryText: '#FFFFFF',
    cardBg: '#F3F4F6',
    border: '#ccc',
    overlay: 'rgba(0,0,0,0.4)',
    footerText: '#555',
    footerButtonBg: '#E0E7FF',
    footerButtonText: '#3730A3',
  },
  spacing: (n: number) => n * 8,
  radius: {
    sm: 6,
    md: 8,
    lg: 12,
    xl: 25,
  },
  images: {
    onboarding: {
      step1: require('../assets/images/on7.png'),
      step2: require('../assets/images/on4.png'),
      step3: require('../assets/images/on1.png'),
      step4: require('../assets/images/on3.png'),
    },
    start: {
      hero: require('../assets/images/Mamascota_2.png'),
    },
    animalSelection: {
      dog: require('../assets/images/perro.png'),
      cat: require('../assets/images/gato.png'),
      rabbit: require('../assets/images/conejo.png'),
      ferret: require('../assets/images/huron.png'),
      bird: require('../assets/images/ave.png'),
      rodent: require('../assets/images/roedor.png'),
      reptile: require('../assets/images/reptiles.png'),
      fish: require('../assets/images/peces.png'),
      exotic: require('../assets/images/exoticos.png'),
    },
  },
} as const;
