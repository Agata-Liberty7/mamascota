// components/ui/PetForm.tsx — версия с BreedModal
import React, { useState } from "react";
import {
  Platform,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import i18n from "../../i18n";
import { theme } from "../../src/theme";
import type { Species } from "../../types/pet";
import { getLocalizedSpeciesLabel } from "../../utils/getLocalizedSpeciesLabel";
import BreedModal from "../BreedModal";

export default function PetForm({
  species,
  name,
  ageYears,
  breed,
  sex = "",
  neutered,
  onSpeciesChange,
  onNameChange,
  onAgeChange,
  onBreedChange,
  onSexChange,
  onNeuteredChange,
  onChange,
  breedError, // пока не используем, оставляю
}: any) {
  const effectiveSpecies =
    species && typeof species === "string" && species.trim() !== ""
      ? (species as Species)
      : undefined;

  const [breedModal, setBreedModal] = useState(false);

  const lang = (i18n.locale || "").split("-")[0];
  const isRTL = lang === "he";

  return (
    <>
      {/* Вид животного */}
      <View style={{ marginBottom: 16 }}>
        <Text style={[styles.subLabel, isRTL && styles.subLabelRTL]}>
          {i18n.t("settings.pets.species_label")}
        </Text>

        {onSpeciesChange || onChange ? (
          <View style={[styles.tagCloud, isRTL && styles.tagCloudRTL]}>
            {[
              "dog",
              "cat",
              "rabbit",
              "ferret",
              "bird",
              "rodent",
              "reptile",
              "fish",
              "exotic",
            ].map((key) => (
              <TouchableOpacity
                key={key}
                style={[
                  styles.speciesTag,
                  effectiveSpecies === key && styles.speciesTagSelected,
                ]}
                onPress={() => {
                  onSpeciesChange?.(key as Species);
                  onChange?.("species", key);
                }}
              >
                <Text style={styles.speciesTagText}>
                  {i18n.t(`animal_${key}`)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <Text style={[styles.speciesValue, isRTL && styles.speciesValueRTL]}>
            {effectiveSpecies
              ? getLocalizedSpeciesLabel(effectiveSpecies, sex)
              : i18n.t("species_placeholder")}
          </Text>
        )}
      </View>

      {/* Имя */}
      <TextInput
        placeholder={i18n.t("name_placeholder")}
        placeholderTextColor={theme.colors.textLight}
        value={name}
        onChangeText={(v) => {
          onNameChange(v);
          onChange?.("name", v);
        }}
        style={[styles.input, isRTL && styles.inputRTL]}
      />

      {/* Возраст (цифры лучше оставить LTR, но выровнять вправо) */}
      <TextInput
        placeholder={i18n.t("age_placeholder")}
        placeholderTextColor={theme.colors.textLight}
        value={ageYears}
        onChangeText={(v) => {
          onAgeChange(v);
          onChange?.("age", v);
        }}
        keyboardType="numeric"
        style={[styles.input, isRTL && styles.inputAgeRTL]}
      />

      {/* Порода */}
      <TouchableOpacity
        onPress={() => setBreedModal(true)}
        style={styles.breedSelector}
      >
        <Text
          style={[
            styles.breedSelectorText,
            isRTL && styles.breedSelectorTextRTL,
            !breed && styles.breedSelectorPlaceholderText,
          ]}
        >
          {breed
            ? breed === "__other"
              ? i18n.t("animal_other")
              : breed
            : i18n.t("settings.pets.set_default")}
        </Text>
      </TouchableOpacity>

      <BreedModal
        visible={breedModal}
        species={effectiveSpecies}
        selected={breed}
        onSelect={(value) => {
          onBreedChange(value);
          onChange?.("breed", value);
          setBreedModal(false);
        }}
        onClose={() => setBreedModal(false)}
      />

      {!breed ? (
        <Text style={[styles.breedHint, isRTL && styles.breedHintRTL]}>
          {i18n.t("settings.pets.breed_hint")}
        </Text>
      ) : null}

      {/* Пол */}
      <Text style={[styles.subLabel, isRTL && styles.subLabelRTL]}>
        {i18n.t("sex")}
      </Text>

      <View style={[styles.segmentRow, isRTL && styles.segmentRowRTL]}>
        <TouchableOpacity
          onPress={() => {
            onSexChange("male");
            onChange?.("sex", "male");
          }}
          style={[styles.segment, sex === "male" && styles.segmentActive]}
        >
          <Text style={styles.segmentText}>♂</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            onSexChange("female");
            onChange?.("sex", "female");
          }}
          style={[styles.segment, sex === "female" && styles.segmentActive]}
        >
          <Text style={styles.segmentText}>♀</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            onSexChange("");
            onChange?.("sex", "");
          }}
          style={[styles.segment, sex === "" && styles.segmentActive]}
        >
          <Text style={styles.segmentText}>⚪️</Text>
        </TouchableOpacity>
      </View>

      {/* Стерилизация */}
      <View style={[styles.row, isRTL && styles.rowRTL, { marginTop: 8 }]}>
        <Text style={[styles.subLabel, isRTL && styles.subLabelRTL]}>
          {i18n.t("neutered_spayed")}
        </Text>

        <Switch
          value={neutered}
          onValueChange={(val) => {
            onNeuteredChange(val);
            onChange?.("neutered", val);
          }}
          ios_backgroundColor="#D1D5DB"
          trackColor={{ false: "#d1d5db", true: "#bfdbfe" }}
          thumbColor={
            Platform.OS === "android"
              ? neutered
                ? theme.colors.buttonPrimaryBg
                : "#f4f3f4"
              : undefined
          }
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    fontSize: 16,
    color: theme.colors.textPrimary,
    textAlign: "left",
    writingDirection: "ltr",
  },
  inputRTL: {
    textAlign: "right",
    writingDirection: "rtl",
  },
  // возраст: выравниваем вправо, но direction оставляем ltr (цифры/точки/запятые)
  inputAgeRTL: {
    textAlign: "right",
    writingDirection: "ltr",
  },

  subLabel: {
    fontSize: 14,
    color: theme.colors.textPrimary,
    marginTop: 4,
    marginBottom: 6,
    textAlign: "left",
    writingDirection: "ltr",
  },
  subLabelRTL: {
    textAlign: "right",
    writingDirection: "rtl",
  },

  breedSelector: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    backgroundColor: "#fafafa",
  },
  breedSelectorText: {
    fontSize: 16,
    color: theme.colors.textPrimary,
    textAlign: "left",
    writingDirection: "ltr",
  },
  breedSelectorTextRTL: {
    textAlign: "right",
    writingDirection: "rtl",
  },
  breedSelectorPlaceholderText: {
    color: theme.colors.textLight,
  },

  breedHint: {
    fontSize: 12,
    marginBottom: 8,
    color: theme.colors.textLight,
    textAlign: "left",
    writingDirection: "ltr",
  },
  breedHintRTL: {
    textAlign: "right",
    writingDirection: "rtl",
  },

  segmentRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
    flexWrap: "wrap",
  },
  segmentRowRTL: {
    flexDirection: "row-reverse",
  },
  segment: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    borderRadius: 8,
    backgroundColor: theme.colors.background,
  },
  segmentActive: {
    borderColor: theme.colors.textPrimary,
    backgroundColor: theme.colors.cardBg,
  },
  segmentText: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.textPrimary,
  },

  speciesValue: {
    fontSize: 15,
    fontWeight: "600",
    paddingVertical: 4,
    paddingHorizontal: 8,
    color: theme.colors.textPrimary,
    backgroundColor: theme.colors.cardBg,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    textAlign: "left",
    writingDirection: "ltr",
  },
  speciesValueRTL: {
    textAlign: "right",
    writingDirection: "rtl",
  },

  tagCloud: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  tagCloudRTL: {
    flexDirection: "row-reverse",
  },
  speciesTag: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 16,
    backgroundColor: "#f0f0f0",
    borderWidth: 1,
    borderColor: "#ccc",
    marginRight: 8,
    marginBottom: 8,
  },
  speciesTagSelected: {
    backgroundColor: "#d0d0d0",
    borderColor: "#999",
  },
  speciesTagText: {
    fontSize: 14,
    color: "#000",
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rowRTL: {
    flexDirection: "row-reverse",
  },

  errorText: {
    fontSize: 12,
    marginBottom: 8,
  },
});
