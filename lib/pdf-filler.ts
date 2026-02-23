import {
  PDFDocument,
  rgb,
  StandardFonts,
  PDFForm,
  PDFRadioGroup,
} from "pdf-lib";

export interface ApplicationData {
  applicationType: {
    isNewApplicant: boolean;
    isRenewal: boolean;
  };
  personsWithDisabilityNumber?: string;
  dateApplied: string | Date;
  personalInfo: {
    lastName: string;
    firstName: string;
    middleName?: string;
    suffix?: string;
    dateOfBirth: string | Date;
    sex: string;
    civilStatus: string;
  };
  disabilityInfo: {
    types: string[];
    causes: string[];
  };
  address: {
    houseNoStreet: string;
    barangay: string;
    municipality: string;
    province: string;
    region: string;
  };
  contactDetails: {
    landlineNo?: string;
    mobileNo?: string;
    emailAddress?: string;
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatDate = (date: string | Date | undefined): string => {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return String(date);
  return `${(d.getMonth() + 1).toString().padStart(2, "0")}/${d
    .getDate()
    .toString()
    .padStart(2, "0")}/${d.getFullYear()}`;
};

/**
 * Convert pdfplumber "top from top of page" → pdf-lib "y from bottom of page".
 * PAGE_H = 792 pt (US Letter). fontSize shifts baseline into the field row.
 */
const PAGE_H = 792;
const toY = (topFromTop: number, fontSize = 9): number =>
  PAGE_H - topFromTop - fontSize;

// ─── AcroForm strategy (fillable PDFs) ───────────────────────────────────────

function safeTextField(form: PDFForm, name: string, value: string) {
  try {
    form.getTextField(name).setText(value);
  } catch {
    console.warn(`⚠️  Text field not found: "${name}"`);
  }
}
function safeCheckBox(form: PDFForm, name: string, checked: boolean) {
  try {
    checked ? form.getCheckBox(name).check() : form.getCheckBox(name).uncheck();
  } catch {
    console.warn(`⚠️  Checkbox not found: "${name}"`);
  }
}
function safeRadio(form: PDFForm, group: string, value: string) {
  try {
    form.getRadioGroup(group).select(value);
  } catch {
    console.warn(`⚠️  Radio group not found: "${group}" / "${value}"`);
  }
}

async function fillAcroForm(pdfDoc: PDFDocument, data: ApplicationData) {
  const form = pdfDoc.getForm();

  safeCheckBox(form, "new_applicant", data.applicationType.isNewApplicant);
  safeCheckBox(form, "renewal", data.applicationType.isRenewal);
  safeTextField(form, "pwd_number", data.personsWithDisabilityNumber ?? "");
  safeTextField(form, "date_applied", formatDate(data.dateApplied));

  safeTextField(form, "last_name", data.personalInfo.lastName.toUpperCase());
  safeTextField(form, "first_name", data.personalInfo.firstName.toUpperCase());
  safeTextField(
    form,
    "middle_name",
    (data.personalInfo.middleName ?? "").toUpperCase(),
  );
  safeTextField(form, "suffix", (data.personalInfo.suffix ?? "").toUpperCase());
  safeTextField(
    form,
    "date_of_birth",
    formatDate(data.personalInfo.dateOfBirth),
  );

  const sex = data.personalInfo.sex.toUpperCase();
  try {
    safeRadio(form, "sex", sex);
  } catch {
    safeCheckBox(form, "sex_male", sex === "MALE");
    safeCheckBox(form, "sex_female", sex === "FEMALE");
  }

  const civil = data.personalInfo.civilStatus;
  try {
    safeRadio(form, "civil_status", civil);
  } catch {
    safeCheckBox(form, "civil_single", civil === "Single");
    safeCheckBox(form, "civil_married", civil === "Married");
    safeCheckBox(form, "civil_widowed", civil === "Widow/er");
    safeCheckBox(form, "civil_separated", civil === "Separated");
    safeCheckBox(
      form,
      "civil_cohabitation",
      civil === "Cohabitation (live-in)",
    );
  }

  const types = data.disabilityInfo.types.map((t) => t.toLowerCase());
  (
    [
      ["deaf or hard of hearing", "disability_deaf"],
      ["intellectual disability", "disability_intellectual"],
      ["learning disability", "disability_learning"],
      ["mental disability", "disability_mental"],
      ["physical disability", "disability_physical"],
      ["psychosocial disability", "disability_psychosocial"],
      ["speech and language", "disability_speech"],
      ["visual disability", "disability_visual"],
      ["cancer", "disability_cancer"],
      ["rare disease", "disability_rare_disease"],
    ] as [string, string][]
  ).forEach(([label, field]) =>
    safeCheckBox(
      form,
      field,
      types.some((t) => t.includes(label)),
    ),
  );

  const causes = data.disabilityInfo.causes.map((c) => c.toLowerCase());
  (
    [
      ["congenital", "cause_congenital"],
      ["acquired", "cause_acquired"],
      ["autism", "cause_autism"],
      ["chronic", "cause_chronic"],
      ["adhd", "cause_adhd"],
      ["cerebral", "cause_cerebral_palsy"],
      ["injury", "cause_injury"],
      ["down", "cause_down_syndrome"],
    ] as [string, string][]
  ).forEach(([label, field]) =>
    safeCheckBox(
      form,
      field,
      causes.some((c) => c.includes(label)),
    ),
  );

  safeTextField(
    form,
    "house_no_street",
    data.address.houseNoStreet.toUpperCase(),
  );
  safeTextField(form, "barangay", data.address.barangay.toUpperCase());
  safeTextField(form, "municipality", data.address.municipality.toUpperCase());
  safeTextField(form, "province", data.address.province.toUpperCase());
  safeTextField(form, "region", data.address.region.toUpperCase());

  safeTextField(form, "landline_no", data.contactDetails.landlineNo ?? "");
  safeTextField(form, "mobile_no", data.contactDetails.mobileNo ?? "");
  safeTextField(
    form,
    "email_address",
    (data.contactDetails.emailAddress ?? "").toLowerCase(),
  );
}

// ─── Flat / scanned PDF strategy ─────────────────────────────────────────────
//
// All coordinates were measured from the actual PRPWD-APPLICATION_FORM PDF
// using pdfplumber structure extraction (pdfplumber top-from-top coords).
// Form size: 612 × 792 pt (US Letter).
//
// Conversion: pdf_lib_y = 792 - pdfplumber_top - fontSize

/** Draw an X mark using two crossing lines — no font encoding issues */
function drawX(
  page: ReturnType<PDFDocument["getPages"]>[number],
  cx: number,
  cy: number,
  half = 3.5,
) {
  const opts = { thickness: 1.3, color: rgb(0, 0, 0) };
  page.drawLine({
    start: { x: cx - half, y: cy + half },
    end: { x: cx + half, y: cy - half },
    ...opts,
  });
  page.drawLine({
    start: { x: cx - half, y: cy - half },
    end: { x: cx + half, y: cy + half },
    ...opts,
  });
}

async function fillFlatPdf(pdfDoc: PDFDocument, data: ApplicationData) {
  const page = pdfDoc.getPages()[0];
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const draw = (text: string, x: number, pdfY: number, size = 9) => {
    if (!text.trim()) return;
    page.drawText(text, { x, y: pdfY, size, font, color: rgb(0, 0, 0) });
  };

  const types = data.disabilityInfo.types.map((t) => t.toLowerCase());
  const causes = data.disabilityInfo.causes.map((c) => c.toLowerCase());
  const has = (arr: string[], kw: string) => arr.some((v) => v.includes(kw));

  // ─── Section 1: Application Type ─────────────────────────────────────────
  // Circles: NEW APPLICANT centre ≈ (112, top=75.6), RENEWAL ≈ (278, top=75.6)
  if (data.applicationType.isNewApplicant) drawX(page, 112, toY(75.6, 4), 3.5);
  if (data.applicationType.isRenewal) drawX(page, 278, toY(75.6, 4), 3.5);

  // ─── Section 2: PWD Number ───────────────────────────────────────────────
  // Entry area starts at x=93, row top=113 (below the label row top=104)
  draw(data.personsWithDisabilityNumber ?? "", 93, toY(113, 9));

  // ─── Section 3: Date Applied ─────────────────────────────────────────────
  // Right half of same row, after "Date Applied" label (label x0=419, x1≈513)
  draw(formatDate(data.dateApplied), 470, toY(113, 9));

  // ─── Section 4: Personal Information ─────────────────────────────────────
  // Column label row: top=145.3
  // Data entry row sits below that ~12pt gap → top≈157
  // Column x boundaries (from label x0 values):
  //   LAST NAME:   x0=77 → entry starts ~93
  //   FIRST NAME:  x0=209 (mid-cell) → entry starts ~210  [label "FIRST NAME:" at x0≈224]
  //   MIDDLE NAME: x0=308 [label at x0≈308] → entry starts ~310
  //   SUFFIX:      x0=440 → entry starts ~441
  draw(data.personalInfo.lastName.toUpperCase(), 93, toY(157, 9), 9);
  draw(data.personalInfo.firstName.toUpperCase(), 210, toY(157, 9), 9);
  draw((data.personalInfo.middleName ?? "").toUpperCase(), 310, toY(157, 9), 9);
  draw((data.personalInfo.suffix ?? "").toUpperCase(), 441, toY(157, 9), 9);

  // ─── Section 5: Date of Birth ─────────────────────────────────────────────
  // DOB label at top=170.3, entry on same row starting at x=93
  draw(formatDate(data.personalInfo.dateOfBirth), 93, toY(172, 9));

  // ─── Section 6: Sex ───────────────────────────────────────────────────────
  // FEMALE circle at x≈392 (before "FEMALE" text x0=405.6), top=180
  // MALE   circle at x≈493 (before "MALE" text x0=505.4),   top=180
  const sex = data.personalInfo.sex.toUpperCase();
  if (sex === "FEMALE") drawX(page, 395, toY(180, 4), 3.5);
  if (sex === "MALE") drawX(page, 496, toY(180, 4), 3.5);

  // ─── Section 7: Civil Status ──────────────────────────────────────────────
  // Circles sit just left of each label text. Labels at top=206.3:
  //   Single x0=91.8 → circle cx≈81
  //   Separated x0=161.5 → cx≈151
  //   Cohabitation x0=254.3 → cx≈244
  //   Married x0=371.6 → cx≈361
  //   Widow/er x0=455.7 → cx≈445
  const civilCentres: Record<string, number> = {
    Single: 81,
    Separated: 151,
    "Cohabitation (live-in)": 244,
    Married: 361,
    "Widow/er": 445,
  };
  const civilCx = civilCentres[data.personalInfo.civilStatus];
  if (civilCx) drawX(page, civilCx, toY(206.3, 4), 3.5);

  // ─── Section 8: Type of Disability ───────────────────────────────────────
  // Square checkboxes, centre is ~8pt left of label x0.
  // Left column labels x0≈113, so checkbox cx≈103
  // Middle column labels x0≈247, so checkbox cx≈236
  // Rows (pdfplumber top values):
  //   Deaf/Psychosocial:        231.4
  //   Intellectual/Speech:      241.2
  //   Learning/Visual:          250.9
  //   Mental/Cancer:            260.8
  //   Physical/Rare Disease:    270.5
  const disabilityChecks: [string, number, number][] = [
    ["deaf", 103, 231.4],
    ["intellectual", 103, 241.2],
    ["learning", 103, 250.9],
    ["mental", 103, 260.8],
    ["physical", 103, 270.5],
    ["psychosocial", 236, 231.4],
    ["speech", 236, 241.2],
    ["visual", 236, 250.9],
    ["cancer", 236, 260.8],
    ["rare disease", 236, 270.5],
  ];
  disabilityChecks.forEach(([kw, cx, top]) => {
    if (has(types, kw)) drawX(page, cx, toY(top, 4), 3);
  });

  // ─── Section 9: Cause of Disability ──────────────────────────────────────
  // Two top-level squares: Congenital (cx≈369, top=229) / Acquired (cx≈491, top=229)
  // Sub-items below (cx for left sub-col ≈396, right sub-col ≈507):
  //   Autism/Chronic Illness:    top=241
  //   ADHD/Cerebral Palsy:       top=253.1
  //   Cerebral Palsy/Injury:     top=265.1
  //   Down Syndrome:             top=277.1 (left only)
  const causeChecks: [string, number, number][] = [
    ["congenital", 369, 229.0],
    ["acquired", 491, 229.0],
    ["autism", 396, 241.0],
    ["chronic", 507, 241.0],
    ["adhd", 396, 253.1],
    ["cerebral", 507, 253.1],
    ["injury", 507, 265.1],
    ["down", 396, 277.1],
  ];
  causeChecks.forEach(([kw, cx, top]) => {
    if (has(causes, kw)) drawX(page, cx, toY(top, 4), 3);
  });

  // ─── Section 10: Residence Address ───────────────────────────────────────
  // Address labels are inline at top=297.6; data goes right after each label.
  // Column layout (label x1 → entry x start):
  //   House No. and Street: x0=77, label x1≈155 — short entry before Barangay at 178
  //     Since "House No. and Street" is a label IN the cell, value goes right after at ~155
  //     But there's only ~23pt before Barangay, so use small font and clip
  //   Barangay: label x1=216, next label at 279  → entry x=217
  //   Municipality: label x1=327, next at 380    → entry x=328
  //   Province: label x1=415, next at 481        → entry x=416
  //   Region: label x1=510, page ends ~580       → entry x=511
  const addrY = toY(297.6, 8);
  // House/Street is wider — the label takes only the left portion; value fills the row
  // Give it a slightly smaller font to fit
  draw(data.address.houseNoStreet.toUpperCase(), 77, addrY, 7);
  draw(data.address.barangay.toUpperCase(), 217, addrY, 7);
  draw(data.address.municipality.toUpperCase(), 328, addrY, 7);
  draw(data.address.province.toUpperCase(), 416, addrY, 7);
  draw(data.address.region.toUpperCase(), 511, addrY, 7);

  // ─── Section 11: Contact Details ─────────────────────────────────────────
  // Labels at top=328; entries right after label text ends:
  //   Landline No.: label x1≈121.6 → entry x=122
  //   Mobile No.:   label x1≈280.8 → entry x=281
  //   E-mail Address: label x1≈442.6 → entry x=443
  const ctY = toY(328, 9);
  draw(data.contactDetails.landlineNo ?? "", 122, ctY);
  draw(data.contactDetails.mobileNo ?? "", 281, ctY);
  draw((data.contactDetails.emailAddress ?? "").toLowerCase(), 443, ctY);
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Inspect field names in a fillable PDF — run once during development */
export async function inspectFormFields(templateBytes: ArrayBuffer) {
  const pdfDoc = await PDFDocument.load(templateBytes);
  const fields = pdfDoc.getForm().getFields();
  if (!fields.length) {
    console.log("ℹ️  No AcroForm fields — flat/image-based PDF.");
    return;
  }
  console.log(`📋 ${fields.length} AcroForm fields:`);
  fields.forEach((f) => {
    const opts =
      f instanceof PDFRadioGroup ? `  [${f.getOptions().join(", ")}]` : "";
    console.log(`  [${f.constructor.name.padEnd(14)}] "${f.getName()}"${opts}`);
  });
}

/**
 * Fill the PRPWD Application Form PDF with applicant data.
 * Auto-detects fillable vs flat PDF and applies the correct strategy.
 *
 * Usage:
 *   const bytes = await fillPdf(templateArrayBuffer, applicationData);
 */
export async function fillPdf(
  templateBytes: ArrayBuffer,
  data: ApplicationData,
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(templateBytes);
  const fields = pdfDoc.getForm().getFields();

  if (fields.length > 0) {
    console.log(
      `✅ AcroForm detected (${fields.length} fields) — form-fill strategy`,
    );
    await fillAcroForm(pdfDoc, data);
  } else {
    console.log("ℹ️  Flat PDF — coordinate overlay strategy");
    await fillFlatPdf(pdfDoc, data);
  }

  return pdfDoc.save();
}

// Backwards-compatible alias
export { fillPdf as fillPdfWorking };
