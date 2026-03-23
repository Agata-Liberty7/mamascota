import i18n from "../i18n";

type GenerateObservationDiaryPdfParams = {
  petName?: string;
  speciesLabel?: string;
  startDate?: string;
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export function generateObservationDiaryPdf({
  petName,
  speciesLabel,
  startDate,
}: GenerateObservationDiaryPdfParams = {}) {
  const locale = i18n.locale || "en";
  const isRTL = ["he", "ar", "fa", "ur"].includes(locale);

  const safePetName = escapeHtml(
    petName || i18n.t("chat.pet_default", { defaultValue: "Pet" })
  );
  const safeSpeciesLabel = escapeHtml(speciesLabel || "—");
  const safeStartDate = escapeHtml(
    startDate || new Date().toLocaleDateString(locale)
  );

  const title = escapeHtml(
    i18n.t("pdf.diary_title", {
      defaultValue: "Observation Diary",
    })
  );

  const intro = escapeHtml(
    i18n.t("pdf.diary_intro", {
      defaultValue:
        "Track your pet’s symptoms daily. This record can help your veterinarian better understand the situation.",
    })
  );

  const petLabel = escapeHtml(
    i18n.t("pdf.diary_pet", { defaultValue: "Pet" })
  );
  const speciesText = escapeHtml(
    i18n.t("pdf.diary_species", { defaultValue: "Species" })
  );
  const startDateLabel = escapeHtml(
    i18n.t("pdf.diary_start_date", { defaultValue: "Date started" })
  );

  const headers = [
    i18n.t("pdf.diary_date", { defaultValue: "Date" }),
    i18n.t("pdf.diary_appetite", { defaultValue: "Appetite" }),
    i18n.t("pdf.diary_water_intake", {
      defaultValue: "Water intake",
    }),
    i18n.t("pdf.diary_activity", { defaultValue: "Activity" }),
    i18n.t("pdf.diary_symptoms", { defaultValue: "Symptoms" }),
    i18n.t("pdf.diary_notes", { defaultValue: "Notes" }),
  ].map((label) => escapeHtml(label));

  const tableRows = Array.from({ length: 14 }, () => {
    return `
      <tr>
        <td>&nbsp;</td>
        <td>&nbsp;</td>
        <td>&nbsp;</td>
        <td>&nbsp;</td>
        <td>&nbsp;</td>
        <td>&nbsp;</td>
      </tr>
    `;
  }).join("");

  return `
    <!DOCTYPE html>
    <html lang="${escapeHtml(locale)}" dir="${isRTL ? "rtl" : "ltr"}">
      <head>
        <meta charset="UTF-8" />
        <title>${title}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            color: #222;
            padding: 24px;
            margin: 0;
            direction: ${isRTL ? "rtl" : "ltr"};
            background: #fff;
          }

          .title {
            font-size: 24px;
            font-weight: 700;
            margin-bottom: 8px;
          }

          .intro {
            font-size: 14px;
            line-height: 1.5;
            color: #444;
            margin-bottom: 20px;
          }

          .meta {
            margin-bottom: 20px;
            font-size: 14px;
            line-height: 1.6;
          }

          .meta-row {
            margin-bottom: 4px;
          }

          .label {
            font-weight: 700;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
          }

          th,
          td {
            border: 1px solid #cfcfcf;
            padding: 8px;
            font-size: 12px;
            vertical-align: top;
            text-align: ${isRTL ? "right" : "left"};
            height: 34px;
            word-wrap: break-word;
          }

          th {
            background: #f5f5f5;
            font-weight: 700;
          }

          th:nth-child(1),
          td:nth-child(1) {
            width: 14%;
          }

          th:nth-child(2),
          td:nth-child(2),
          th:nth-child(3),
          td:nth-child(3),
          th:nth-child(4),
          td:nth-child(4) {
            width: 14%;
          }

          th:nth-child(5),
          td:nth-child(5) {
            width: 22%;
          }

          th:nth-child(6),
          td:nth-child(6) {
            width: 22%;
          }
        </style>
      </head>
      <body>
        <div class="title">${title}</div>
        <div class="intro">${intro}</div>

        <div class="meta">
          <div class="meta-row"><span class="label">${petLabel}:</span> ${safePetName}</div>
          <div class="meta-row"><span class="label">${speciesText}:</span> ${safeSpeciesLabel}</div>
          <div class="meta-row"><span class="label">${startDateLabel}:</span> ${safeStartDate}</div>
        </div>

        <table>
          <thead>
            <tr>
              ${headers.map((header) => `<th>${header}</th>`).join("")}
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
      </body>
    </html>
  `;
}