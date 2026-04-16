import i18n from "../i18n";

type GenerateObservationDiaryCsvParams = {
  petName?: string;
  speciesLabel?: string;
  startDate?: string;
  rowsCount?: number;
};

const escapeCsv = (value: string) => {
  const safe = String(value ?? "").replace(/"/g, '""');
  return `"${safe}"`;
};

export function generateObservationDiaryCsv({
  petName,
  speciesLabel,
  startDate,
  rowsCount = 14,
}: GenerateObservationDiaryCsvParams = {}) {
  const title = i18n.t("pdf.diary_title", {
    defaultValue: "Observation Diary",
  });

  const petLabel = i18n.t("pdf.diary_pet", {
    defaultValue: "Pet",
  });

  const speciesText = i18n.t("pdf.diary_species", {
    defaultValue: "Species",
  });

  const startDateLabel = i18n.t("pdf.diary_start_date", {
    defaultValue: "Date started",
  });

  const headers = [
    i18n.t("pdf.diary_date", { defaultValue: "Date" }),
    i18n.t("pdf.diary_appetite", { defaultValue: "Appetite" }),
    i18n.t("pdf.diary_water_intake", {
      defaultValue: "Water intake",
    }),
    i18n.t("pdf.diary_activity", { defaultValue: "Activity" }),
    i18n.t("pdf.diary_symptoms", { defaultValue: "Symptoms" }),
    i18n.t("pdf.diary_notes", { defaultValue: "Notes" }),
  ];

  const lines: string[] = [];

  lines.push(escapeCsv(title));
  lines.push(`${escapeCsv(petLabel)},${escapeCsv(petName || "")}`);
  lines.push(`${escapeCsv(speciesText)},${escapeCsv(speciesLabel || "")}`);
  lines.push(`${escapeCsv(startDateLabel)},${escapeCsv(startDate || "")}`);
  lines.push("");

  lines.push(headers.map(escapeCsv).join(","));

  for (let i = 0; i < rowsCount; i += 1) {
    lines.push(headers.map(() => '""').join(","));
  }

  return "\uFEFF" + lines.join("\n");
}