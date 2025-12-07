import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Dimensions,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';


import TermsModal from '../components/TermsModal';
import PetForm from '../components/ui/PetForm';
import { animals } from '../constants/animals';
import i18n from '../i18n';
import { theme } from '../src/theme';
import type { Pet, Species } from '../types/pet';
import { getPets, upsertPet } from '../utils/pets';
import { setCurrentPetId } from '../src/data/pets';

export default function AnimalSelection() {
  const router = useRouter();
  const navigation = useNavigation();
  const { langKey, from } = useLocalSearchParams();
  const normalizedLangKey = Array.isArray(langKey) ? langKey[0] : langKey ?? 'default';
  const normalizedFrom = Array.isArray(from) ? from[0] : from;

  const [selectedAnimal, setSelectedAnimal] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [species, setSpecies] = useState('');
  const [age, setAge] = useState('');
  const [name, setName] = useState('');
  const [breed, setBreed] = useState('');
  const [sex, setSex] = useState<'male' | 'female' | ''>('');
  const [neutered, setNeutered] = useState<boolean>(false);
  const [petsOpen, setPetsOpen] = useState(false);
  const [myPets, setMyPets] = useState<Pet[]>([]);
  const [editingPetId, setEditingPetId] = useState<string | null>(null);
  const [showTermsModal, setShowTermsModal] = useState(false);
  // ✅ Разрешённые виды для MVP (только собака и кошка)
  const enabledSpecies = new Set<Species>(["dog", "cat"]);


  const resetFields = () => {
    setSpecies('');
    setAge('');
    setName('');
    setBreed('');
    setSex('');
    setNeutered(false);
    setPetsOpen(false);
    setEditingPetId(null);
  };

  useEffect(() => {
    const showBack =
      normalizedFrom === 'chat' ||
      normalizedFrom === 'summary' ||
      normalizedFrom === 'tag-cloud';
    navigation.setOptions({ headerBackVisible: showBack });
  }, [normalizedFrom, navigation]);

  const openMyPets = async () => {
    if (!petsOpen && myPets.length === 0) {
      const list = await getPets();
      setMyPets(Array.isArray(list) ? list : []);
    }
    setPetsOpen(v => !v);
  };

  useEffect(() => {
    const checkTermsAccepted = async () => {
      const accepted = await AsyncStorage.getItem('acceptedTerms');
      const legacy = await AsyncStorage.getItem('termsAccepted');

      if (accepted !== 'true' && legacy !== 'true') {
        setShowTermsModal(true);
      }
    };
    checkTermsAccepted();
  }, []);


  const handleAcceptTerms = async () => {
    await AsyncStorage.multiSet([
      ['acceptedTerms', 'true'],
      ['termsAccepted', 'true'],
    ]);
    setShowTermsModal(false);
  };

  const handleSelect = (animalId: string) => {
    const selected = animals.find(a => a.id === animalId);
    if (selected?.id) {
      setSelectedAnimal(animalId);
      setSpecies(selected.id);
      setEditingPetId(null); // новая карточка
      setModalVisible(true);
    }
  };

  const handleContinue = async () => {
    const validSpecies: Species[] = [
      "cat",
      "dog",
      "rabbit",
      "ferret",
      "bird",
      "rodent",
      "reptile",
      "fish",
      "exotic",
    ];
    const trimmedSpecies = (species || "").trim().toLowerCase() as Species;
    const normalizedSpecies: Species = validSpecies.includes(trimmedSpecies)
      ? trimmedSpecies
      : "exotic";

    // 🔴 1) Жёсткая проверка имени — как было
    if (!name.trim()) {
      Alert.alert(
        i18n.t("continue_without_data_title"),
        i18n.t("continue_without_data_message"),
        [
          {
            text: i18n.t("alert-back"),
            style: "cancel",
            onPress: () => {
              // остаёмся в модалке PetForm
            },
          },
          {
            text: i18n.t("continue"),
            style: "destructive",
            onPress: () => {
              setModalVisible(false);
              // остаёмся на экране animal-selection
            },
          },
        ]
      );
      return; // ⬅️ единственное блокирующее условие
    }

    // 🟡 2) МЯГКОЕ предупреждение, если порода не указана — БЕЗ return
    if (!breed.trim()) {
      Alert.alert(
        i18n.t("breedWarning.title"),
        i18n.t("breedWarning.message")
        // можно добавить одну кнопку "OK" по умолчанию, Alert сам её подставит,
        // если массив кнопок не передавать
      );
    }

    const candidate: Partial<Pet> = {
      id: editingPetId || undefined,
      name: name.trim(),
      species: normalizedSpecies,
      ageYears: age ? parseFloat(age) : undefined,
      // 🐾 если порода не указана — сохраняем "__other"
      breed: breed.trim() || "__other",
      sex: sex === "male" || sex === "female" ? sex : undefined,
      neutered: !!neutered,
    };

    // 💾 сохраняем питомца
    const saved = await upsertPet(candidate);

    // ✅ Сразу записываем активного питомца для всех модулей
    await setCurrentPetId(saved.id);

    resetFields();
    setModalVisible(false);

    // 🔄 Передаём данные в чат
    router.push({
      pathname: "/chat",
      params: { pet: JSON.stringify(saved) },
    });
  };



  const screenWidth = Dimensions.get('window').width;
  const numColumns = 3;
  const spacing = 16;
  const itemWidth = (screenWidth - spacing * (numColumns + 1)) / numColumns;

  return (
    <View key={normalizedLangKey} style={styles.container}>
      <Text style={styles.title}>{i18n.t('animal_question')}</Text>
      <FlatList
        data={animals}
        numColumns={numColumns}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.grid}
        ListFooterComponent={
          <View style={styles.footerContainer}>
            <Text style={styles.footerText}>{i18n.t('not_in_list')}</Text>
            <TouchableOpacity
              onPress={() => {
                Alert.alert(
                  String(i18n.t('coming_soon')),   // заголовок: "Скоро"
                  String(i18n.t('not_in_list'))    // текст: "Если вашего питомца нет в списке…"
                );
              }}
              style={styles.footerButton}
            >
              <Text style={styles.footerButtonText}>{i18n.t('add_other')}</Text>
            </TouchableOpacity>
          </View>
        }

        renderItem={({ item }) => {
          const isEnabled = enabledSpecies.has(item.id as Species);

          return (
            <TouchableOpacity
              style={[
                styles.card,
                { width: itemWidth },
                !isEnabled && styles.cardDisabled,
              ]}
              disabled={!isEnabled}
              onPress={isEnabled ? () => handleSelect(item.id) : undefined}
              activeOpacity={isEnabled ? 0.7 : 1}
            >
              <Image source={item.image} style={styles.image} resizeMode="contain" />
              <Text style={styles.label}>{i18n.t(item.label)}</Text>

              {!isEnabled && (
                <Text style={styles.comingSoon}>
                  {i18n.t("coming_soon")}
                </Text>
              )}
            </TouchableOpacity>
          );
        }}

      />
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView style={styles.modalContent} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
              <Text style={styles.modalTitle}>{i18n.t('animal_data')}</Text>

              <TouchableOpacity onPress={openMyPets} style={styles.pickerButton}>
                <Text style={styles.pickerButtonText}>{i18n.t('settings.pets.title')}</Text>
              </TouchableOpacity>

              {petsOpen && (
                <View style={styles.petsPanel}>
                  {myPets.length === 0 ? (
                    <Text style={styles.petsEmpty}>{i18n.t('settings.pets.empty')}</Text>
                  ) : (
                    myPets.map((p, index) => (
                      <TouchableOpacity
                        key={`${p.id ?? 'noid'}-${index}`}
                        style={styles.petItem}
                        onPress={() => {
                          setSpecies(p.species ?? '');
                          setName(p.name ?? '');
                          setAge(p.ageYears ? String(p.ageYears) : '');

                          // 🐾 НОВОЕ — подтягиваем породу
                          if (p.breed) {
                            // если в карточке есть сохранённая порода — используем её
                            setBreed(p.breed);
                          } else {
                            // если вдруг порода не сохранена — сбрасываем в "__other"
                            setBreed("__other");
                          }

                          if (p.sex) setSex(p.sex as any);
                          if (p.neutered != null) setNeutered(!!p.neutered);
                          setEditingPetId(p.id ?? null); // редактируем существующего
                          setPetsOpen(false);
                        }}

                      >
                        <Text style={styles.petName}>{p.name || '—'}</Text>
                      </TouchableOpacity>
                    ))
                  )}
                </View>
              )}

              <PetForm
                species={species as Species}
                name={name}
                ageYears={age}
                breed={breed}
                sex={sex}
                neutered={neutered}
                onNameChange={setName}
                onAgeChange={setAge}
                onBreedChange={setBreed}
                onSexChange={setSex}
                onNeuteredChange={setNeutered}
              />

              <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
                <Text style={styles.continueText}>{i18n.t('continue')}</Text>
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <TermsModal visible={showTermsModal} onAccept={handleAcceptTerms} onDecline={() => setShowTermsModal(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 16, backgroundColor: theme.colors.background },
  title: { fontSize: 18, fontWeight: '600', marginBottom: 16, textAlign: 'center' },
  grid: { paddingHorizontal: 16, paddingBottom: 32 },
  // 🟦 Карточка-животное как кнопка
  card: {
    borderRadius: 16,
    paddingVertical: 10,
    margin: 8,
    alignItems: "center",
    backgroundColor: "#F5F7FB", // мягкая светлая подложка
  },
  // 🔒 Для заблокированных видов
  cardDisabled: {
    opacity: 0.4,
  },
  image: { width: 100, height: 80
   },
  label: {
    marginTop: 8,
    fontSize: 14,
    textAlign: "center",
  },
    comingSoon: {
    marginTop: 4,
    fontSize: 11,
    color: "#999",
  },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { backgroundColor: theme.colors.background, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20, minHeight: '50%' },
  modalTitle: { fontSize: 18, fontWeight: '600', marginBottom: 12, textAlign: 'center' },
  continueButton: { backgroundColor: theme.colors.buttonPrimaryBg, paddingVertical: 12, borderRadius: 8, marginTop: 12 },
  continueText: { color: theme.colors.buttonPrimaryText, fontSize: 16, fontWeight: '600', textAlign: 'center' },
  scrollContent: { paddingBottom: 20 },
  pickerButton: { marginTop: 8, paddingVertical: 10, borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: '#42A5F5', backgroundColor: '#E3F2FD' },
  pickerButtonText: { fontSize: 15, fontWeight: '600', textAlign: 'center', color: '#1565C0' },
  petsPanel: { padding: 8, marginBottom: 8 },
  petItem: { paddingVertical: 8, borderRadius: 6, marginBottom: 6 },
  petName: { fontSize: 15, fontWeight: '600' },
  petsEmpty: { fontSize: 14, textAlign: 'center', paddingVertical: 6 },
  footerContainer: { alignItems: 'center', marginTop: 20 },
  footerText: { fontSize: 14, color: '#666', marginBottom: 8 },
  footerButton: { backgroundColor: '#42A5F5', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 20 },
  footerButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
