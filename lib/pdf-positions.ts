// PDF field positions configuration
// All coordinates are measured from bottom-left corner of the page (0,0)
// Use the calibration tool to get exact coordinates for your PDF

export type CheckboxField = {
  x: number;
  y: number;
  type: "checkbox";
  size?: number;
};

export type RadioField = {
  x: number;
  y: number;
  type: "radio";
  size?: number;
};

export type TextField = {
  x: number;
  y: number;
  type: "text";
  width: number;
  height?: number;
  fontSize?: number;
};

export type DisabilityTypeItem = {
  name: string;
  x: number;
  y: number;
  checked?: boolean;
};

// Main positions interface
export interface PdfPositions {
  // Application Type
  newApplicant: CheckboxField;
  renewal: CheckboxField;

  // Registration No. and Date
  registrationNo: TextField;
  dateApplied: TextField;

  // Personal Information
  lastName: TextField;
  firstName: TextField;
  middleName: TextField;
  suffix: TextField;
  dateOfBirth: TextField;

  // Sex
  sexMale: RadioField;
  sexFemale: RadioField;

  // Civil Status
  civilSingle: RadioField;
  civilMarried: RadioField;
  civilWidowed: RadioField;
  civilSeparated: RadioField;

  // Type of Disability (array of items)
  disabilityTypes: DisabilityTypeItem[];

  // Cause of Disability
  causeAcquired: CheckboxField;
  causeChronic: CheckboxField;
  causeCongenital: CheckboxField;
  causeInjury: CheckboxField;

  // Address
  houseNoStreet: TextField;
  barangay: TextField;
  municipality: TextField;
  province: TextField;
  region: TextField;

  // Contact Details
  landlineNo: TextField;
  mobileNo: TextField;
  emailAddress: TextField;

  // Page dimensions for reference
  pageSize?: {
    width: number;
    height: number;
  };
}

// These coordinates are approximate - use the calibration tool to get exact values
export const pdfPositions: PdfPositions = {
  // Application Type - Adjust these based on your PDF
  newApplicant: { x: 108, y: 711, type: "checkbox", size: 10 },
  renewal: { x: 279, y: 713, type: "checkbox", size: 10 },

  // Registration No. and Date
  registrationNo: { x: 120, y: 725, type: "text", width: 120, fontSize: 10 },
  dateApplied: { x: 400, y: 725, type: "text", width: 100, fontSize: 10 },

  // Personal Information
  lastName: { x: 80, y: 629, type: "text", width: 120, fontSize: 10 },
  firstName: { x: 255, y: 629, type: "text", width: 120, fontSize: 10 },
  middleName: { x: 360, y: 629, type: "text", width: 100, fontSize: 10 },
  suffix: { x: 480, y: 685, type: "text", width: 50, fontSize: 10 },
  dateOfBirth: { x: 100, y: 650, type: "text", width: 100, fontSize: 10 },

  // Sex
  sexMale: { x: 70, y: 620, type: "radio", size: 8 },
  sexFemale: { x: 140, y: 620, type: "radio", size: 8 },

  // Civil Status
  civilSingle: { x: 230, y: 620, type: "radio", size: 8 },
  civilMarried: { x: 310, y: 620, type: "radio", size: 8 },
  civilWidowed: { x: 390, y: 620, type: "radio", size: 8 },
  civilSeparated: { x: 470, y: 620, type: "radio", size: 8 },

  // Type of Disability - Adjust these based on your PDF layout
  disabilityTypes: [
    { name: "Deaf or Hard of Hearing", x: 60, y: 580 },
    { name: "Intellectual Disability", x: 60, y: 560 },
    { name: "Learning Disability", x: 60, y: 540 },
    { name: "Mental Disability", x: 60, y: 520 },
    { name: "Physical Disability", x: 60, y: 500 },
    { name: "Psychosocial Disability", x: 280, y: 580 },
    { name: "Speech and Language Impairment", x: 280, y: 560 },
    { name: "Visual Disability", x: 280, y: 540 },
    { name: "Cancer (RA 11215)", x: 280, y: 520 },
    { name: "Rare Disease (RA10747)", x: 280, y: 500 },
  ],

  // Cause of Disability
  causeAcquired: { x: 60, y: 450, type: "checkbox", size: 10 },
  causeChronic: { x: 180, y: 450, type: "checkbox", size: 10 },
  causeCongenital: { x: 300, y: 450, type: "checkbox", size: 10 },
  causeInjury: { x: 420, y: 450, type: "checkbox", size: 10 },

  // Address
  houseNoStreet: { x: 80, y: 405, type: "text", width: 200, fontSize: 10 },
  barangay: { x: 80, y: 380, type: "text", width: 200, fontSize: 10 },
  municipality: { x: 80, y: 355, type: "text", width: 200, fontSize: 10 },
  province: { x: 80, y: 330, type: "text", width: 200, fontSize: 10 },
  region: { x: 80, y: 305, type: "text", width: 200, fontSize: 10 },

  // Contact Details
  landlineNo: { x: 100, y: 265, type: "text", width: 120, fontSize: 10 },
  mobileNo: { x: 260, y: 265, type: "text", width: 140, fontSize: 10 },
  emailAddress: { x: 100, y: 235, type: "text", width: 250, fontSize: 10 },

  // Page dimensions (A4 default)
  pageSize: {
    width: 595.28,
    height: 841.89,
  },
};
