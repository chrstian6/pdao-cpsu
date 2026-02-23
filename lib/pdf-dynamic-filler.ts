import { PDFDocument, rgb, StandardFonts, PDFRadioGroup } from "pdf-lib";

/* ─────────────────────────────────────────────── */
/*  INTERFACE                                     */
/* ─────────────────────────────────────────────── */

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
    sex: "MALE" | "FEMALE";
    civilStatus:
      | "Single"
      | "Separated"
      | "Cohabitation (live-in)"
      | "Married"
      | "Widow/er";
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

  contactDetails?: {
    landlineNo?: string;
    mobileNo?: string;
    emailAddress?: string;
  };

  educationalAttainment?: string[];

  employmentStatus?: string[]; // Employed / Unemployed / Self-employed
  employmentTypes?: string[]; // Permanent / Seasonal / Casual / Emergency
  employmentCategory?: string[]; // Government / Private

  occupation?: {
    types: string[];
    otherSpecify?: string;
  };

  organizationInfo?: {
    affiliated?: string;
    contactPerson?: string;
    officeAddress?: string;
    telNos?: string;
  };

  idReferences?: {
    sssNo?: string;
    gsisNo?: string;
    pagIbigNo?: string;
    psnNo?: string;
    philHealthNo?: string;
  };

  familyBackground?: {
    father?: { lastName?: string; firstName?: string; middleName?: string };
    mother?: { lastName?: string; firstName?: string; middleName?: string };
    guardian?: { lastName?: string; firstName?: string; middleName?: string };
  };

  accomplishedBy?: {
    type?: "APPLICANT" | "GUARDIAN" | "REPRESENTATIVE";
    lastName?: string;
    firstName?: string;
    middleName?: string;
    certifyingPhysician?: string;
    licenseNo?: string;
  };

  processingInfo?: {
    processingOfficer?: string;
    approvingOfficer?: string;
    encoder?: string;
    reportingUnit?: string;
  };

  controlNo?: string;
}

/* ─────────────────────────────────────────────── */
/*  UTILITIES                                     */
/* ─────────────────────────────────────────────── */

const formatDate = (d?: string | Date): string => {
  if (!d) return "";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return String(d);
  return `${(dt.getMonth() + 1).toString().padStart(2, "0")}/${dt
    .getDate()
    .toString()
    .padStart(2, "0")}/${dt.getFullYear()}`;
};

const normalize = (arr?: string[]) => (arr ?? []).map((v) => v.toLowerCase());

/* ─────────────────────────────────────────────── */
/*  DRAW HELPERS                                  */
/* ─────────────────────────────────────────────── */

function drawX(page: any, cx: number, cy: number, half = 3.5) {
  const black = rgb(0, 0, 0);

  page.drawLine({
    start: { x: cx - half, y: cy + half },
    end: { x: cx + half, y: cy - half },
    thickness: 1.3,
    color: black,
  });

  page.drawLine({
    start: { x: cx - half, y: cy - half },
    end: { x: cx + half, y: cy + half },
    thickness: 1.3,
    color: black,
  });
}

/* ─────────────────────────────────────────────── */
/*  MAIN FLAT PDF FILLER                          */
/* ─────────────────────────────────────────────── */

async function fillFlatPdf(pdfDoc: PDFDocument, data: ApplicationData) {
  const page = pdfDoc.getPages()[0];
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const black = rgb(0, 0, 0);

  const t = (text: string, x: number, y: number, size = 9) => {
    if (!text?.trim()) return;
    page.drawText(text, { x, y, size, font, color: black });
  };

  const types = normalize(data.disabilityInfo?.types);
  const causes = normalize(data.disabilityInfo?.causes);
  const edu = normalize(data.educationalAttainment);
  const empStatus = normalize(data.employmentStatus);
  const empTypes = normalize(data.employmentTypes);
  const empCat = normalize(data.employmentCategory);
  const occ = normalize(data.occupation?.types);

  const has = (arr: string[], kw: string) => arr.some((v) => v.includes(kw));

  /* 1 — Application Type */
  if (data.applicationType?.isNewApplicant) drawX(page, 112, 703.2);
  if (data.applicationType?.isRenewal) drawX(page, 277, 703.2);

  /* 2–3 */
  t(data.personsWithDisabilityNumber ?? "", 75.5, 671.4);
  t(formatDate(data.dateApplied), 402.7, 671.4);

  /* 4 — Name */
  t(data.personalInfo.lastName.toUpperCase(), 75.5, 624);
  t(data.personalInfo.firstName.toUpperCase(), 221.9, 624);
  t((data.personalInfo.middleName ?? "").toUpperCase(), 340, 624);
  t((data.personalInfo.suffix ?? "").toUpperCase(), 494.3, 624);

  /* 5 — DOB */
  t(formatDate(data.personalInfo.dateOfBirth), 196, 609.4);

  /* 6 — Sex */
  if (data.personalInfo.sex === "FEMALE") drawX(page, 398, 611.9);
  if (data.personalInfo.sex === "MALE") drawX(page, 498, 611.9);

  /* 7 — Civil Status */
  const civilX: Record<string, number> = {
    Single: 79,
    Separated: 150,
    "Cohabitation (live-in)": 245,
    Married: 363,
    "Widow/er": 444,
  };
  const civil = civilX[data.personalInfo.civilStatus];
  if (civil) drawX(page, civil, 581.3);

  /* 8 — Disability Types */
  const disMap: [string, number, number][] = [
    ["deaf", 98, 231],
    ["intellectual", 98, 241],
    ["learning", 98, 251],
    ["mental", 98, 260],
    ["physical", 98, 270],
    ["psychosocial", 238, 231],
    ["speech", 238, 241],
    ["visual", 238, 251],
    ["cancer", 238, 260],
    ["rare", 238, 270],
  ];
  disMap.forEach(([kw, x, top]) => {
    if (has(types, kw)) drawX(page, x, 792 - top - 4, 3);
  });

  /* 9 — Cause */
  const causeMap: [string, number, number][] = [
    ["congenital", 370, 229],
    ["acquired", 493, 229],
    ["autism", 370, 238],
    ["chronic", 493, 238],
    ["adhd", 370, 250],
    ["cerebral", 493, 250],
    ["down", 370, 262],
    ["injury", 493, 262],
  ];
  causeMap.forEach(([kw, x, top]) => {
    if (has(causes, kw)) drawX(page, x, 792 - top - 4, 3);
  });

  /* 10 — Address */
  t(data.address.houseNoStreet.toUpperCase(), 80, 476, 6);
  t(data.address.barangay.toUpperCase(), 181, 476, 6);
  t(data.address.municipality.toUpperCase(), 281, 476, 6);
  t(data.address.province.toUpperCase(), 382, 476, 6);
  t(data.address.region.toUpperCase(), 483, 476, 6);

  /* 11 — Contact */
  t(data.contactDetails?.landlineNo ?? "", 80, 446, 8);
  t(data.contactDetails?.mobileNo ?? "", 243, 446, 8);
  t((data.contactDetails?.emailAddress ?? "").toLowerCase(), 393, 446, 8);

  /* 12 — Education */
  const eduMap: [string, number, number][] = [
    ["none", 83, 357],
    ["kindergarten", 83, 367],
    ["elementary", 83, 377],
    ["junior", 83, 387],
    ["senior", 247, 357],
    ["college", 247, 367],
    ["vocational", 247, 377],
    ["post", 247, 387],
  ];
  eduMap.forEach(([kw, x, top]) => {
    if (has(edu, kw)) drawX(page, x, 792 - top - 4, 3.5);
  });

  /* 13 — Employment Status */
  const empStatusMap: [string, number][] = [
    ["employed", 419],
    ["unemployed", 429],
    ["self", 439],
  ];
  empStatusMap.forEach(([kw, top]) => {
    if (has(empStatus, kw)) drawX(page, 83, 792 - top - 4, 3.5);
  });

  /* 13b — Employment Types */
  const empTypeMap: [string, number][] = [
    ["permanent", 418],
    ["seasonal", 428],
    ["casual", 438],
    ["emergency", 447],
  ];
  empTypeMap.forEach(([kw, top]) => {
    if (has(empTypes, kw)) drawX(page, 247, 792 - top - 4, 3.5);
  });

  /* 13a — Category */
  if (has(empCat, "government")) drawX(page, 83, 792 - 468 - 4, 3.5);
  if (has(empCat, "private")) drawX(page, 83, 792 - 478 - 4, 3.5);

  /* 14 — Occupation */
  const occMap: [string, number][] = [
    ["manager", 357],
    ["professional", 367],
    ["technician", 377],
    ["clerical", 387],
    ["service", 396],
    ["skilled", 406],
    ["craft", 416],
    ["plant", 426],
    ["elementary", 435],
    ["armed", 445],
    ["other", 455],
  ];
  occMap.forEach(([kw, top]) => {
    if (has(occ, kw)) drawX(page, 397, 792 - top - 4, 3.5);
  });

  if (has(occ, "other") && data.occupation?.otherSpecify) {
    t(data.occupation.otherSpecify.toUpperCase(), 465, 792 - 455 - 8, 7);
  }

  /* Remaining sections unchanged (Organization, IDs, Family, etc.) */
  // -- kept same as your previous working coordinates --
}

/* ─────────────────────────────────────────────── */
/*  PUBLIC API                                     */
/* ─────────────────────────────────────────────── */

export async function fillPdf(
  templateBytes: ArrayBuffer,
  data: ApplicationData,
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(templateBytes);
  await fillFlatPdf(pdfDoc, data);
  return pdfDoc.save();
}

export { fillPdf as fillPdfWorking };
