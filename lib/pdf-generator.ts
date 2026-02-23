import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";

export interface ApplicationData {
  _id?: string;
  formId?: string;
  userId?: string;
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
  educationalAttainment: string[];
  employmentStatus: string[];
  occupation: {
    types: string[];
    otherSpecify?: string;
  };
  employmentCategory?: string[];
  organizationInfo?: Array<{
    organizationAffiliated: string;
    contactPerson: string;
    officeAddress: string;
    telNos: string;
  }>;
  idReferences?: {
    sssNo?: string;
    pagIbigNo?: string;
    psnNo?: string;
    philHealthNo?: string;
  };
  familyBackground?: {
    fatherName?: string;
    motherName?: string;
    guardianName?: string;
  };
  accomplishedBy: {
    type: string;
    certifyingPhysician?: string;
    licenseNo?: string;
  };
  processingInfo: {
    processingOfficer: string;
    approvingOfficer: string;
    encoder: string;
    reportingUnit: string;
  };
  status?: string;
  controlNo?: string;
}

/**
 * Generate PDF from application data
 */
export async function generateApplicationPDF(
  data: ApplicationData,
): Promise<Buffer> {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let yPos = 20;

  // Helper function to format date
  const formatDate = (date: string | Date | undefined) => {
    if (!date) return "___________";
    return format(new Date(date), "MM/dd/yyyy");
  };

  // Helper function to draw checkbox
  const drawCheckbox = (
    x: number,
    y: number,
    checked: boolean,
    size: number = 3,
  ) => {
    doc.setDrawColor(0);
    doc.setLineWidth(0.3);
    doc.rect(x, y, size, size);
    if (checked) {
      doc.setLineWidth(0.5);
      doc.line(x + 1, y + 1, x + size - 1, y + size - 1);
      doc.line(x + size - 1, y + 1, x + 1, y + size - 1);
    }
  };

  // Helper function to draw radio button
  const drawRadio = (
    x: number,
    y: number,
    checked: boolean,
    size: number = 3,
  ) => {
    doc.setDrawColor(0);
    doc.setLineWidth(0.3);
    doc.circle(x + size / 2, y + size / 2, size / 2, "D");
    if (checked) {
      doc.setFillColor(0);
      doc.circle(x + size / 2, y + size / 2, size / 3, "F");
    }
  };

  // Helper function to add text with underline
  const addUnderlinedText = (
    text: string,
    x: number,
    y: number,
    maxWidth?: number,
  ) => {
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(text, x, y);
    const textWidth = doc.getTextWidth(text);
    doc.setLineWidth(0.1);
    doc.line(x, y + 1, x + (maxWidth || textWidth), y + 1);
  };

  // Helper function to add field label
  const addField = (
    label: string,
    value: string,
    x: number,
    y: number,
    width: number = 50,
  ) => {
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text(label, x, y - 3);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    addUnderlinedText(value || "____________________", x, y, width);
  };

  // ===== PAGE 1 =====

  // Header
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("PWD APPLICATION FORM", pageWidth / 2, yPos, { align: "center" });

  yPos += 8;

  // Application Type and Photo
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");

  // New Applicant checkbox
  drawCheckbox(margin, yPos - 2, data.applicationType?.isNewApplicant || false);
  doc.text("NEW APPLICANT", margin + 5, yPos);

  // Renewal checkbox
  drawCheckbox(margin + 45, yPos - 2, data.applicationType?.isRenewal || false);
  doc.text("RENEWAL", margin + 50, yPos);

  // Photo placeholder
  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  doc.rect(pageWidth - margin - 30, yPos - 15, 25, 30);
  doc.setFontSize(8);
  doc.text("Place 1x1", pageWidth - margin - 25, yPos + 5);
  doc.text("Photo Here", pageWidth - margin - 25, yPos + 10);

  yPos += 12;

  // Registration No. and Date Applied
  addField(
    "Registration No.",
    data.personsWithDisabilityNumber || "",
    margin,
    yPos,
    60,
  );
  addField(
    "Date Applied",
    formatDate(data.dateApplied),
    pageWidth / 2,
    yPos,
    50,
  );

  yPos += 15;

  // Personal Information Section
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("I. PERSONAL INFORMATION", margin, yPos);

  yPos += 8;

  // Name fields
  addField("Last Name", data.personalInfo?.lastName || "", margin, yPos, 60);
  addField(
    "First Name",
    data.personalInfo?.firstName || "",
    margin + 70,
    yPos,
    60,
  );
  addField(
    "Middle Name",
    data.personalInfo?.middleName || "N/A",
    margin + 140,
    yPos,
    40,
  );

  yPos += 12;

  addField("Suffix", data.personalInfo?.suffix || "N/A", margin, yPos, 30);
  addField(
    "Date of Birth",
    formatDate(data.personalInfo?.dateOfBirth),
    margin + 70,
    yPos,
    50,
  );

  yPos += 12;

  // Sex
  doc.text("Sex:", margin, yPos - 3);
  drawRadio(margin + 15, yPos - 6, data.personalInfo?.sex === "MALE");
  doc.text("Male", margin + 20, yPos - 3);
  drawRadio(margin + 45, yPos - 6, data.personalInfo?.sex === "FEMALE");
  doc.text("Female", margin + 50, yPos - 3);

  // Civil Status
  doc.text("Civil Status:", margin + 100, yPos - 3);
  const civilStatuses = ["Single", "Married", "Widowed", "Separated"];
  let statusX = margin + 130;
  civilStatuses.forEach((status) => {
    drawRadio(statusX, yPos - 6, data.personalInfo?.civilStatus === status);
    doc.text(status, statusX + 5, yPos - 3);
    statusX += 30;
  });

  yPos += 12;

  // Type of Disability
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("II. TYPE OF DISABILITY", margin, yPos);

  yPos += 8;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");

  const disabilityTypes = [
    "Deaf or Hard of Hearing",
    "Intellectual Disability",
    "Learning Disability",
    "Mental Disability",
    "Physical Disability",
    "Psychosocial Disability",
    "Speech and Language Impairment",
    "Visual Disability",
    "Cancer (RA 11215)",
    "Rare Disease (RA10747)",
  ];

  let typeX = margin;
  let typeY = yPos;
  disabilityTypes.forEach((type, index) => {
    if (index % 2 === 0 && index > 0) {
      typeX = margin;
      typeY += 7;
    } else if (index > 0) {
      typeX = pageWidth / 2;
    }

    const checked = data.disabilityInfo?.types?.includes(type) || false;
    drawCheckbox(typeX, typeY - 4, checked);
    doc.text(type, typeX + 5, typeY);

    if (index % 2 === 0) {
      typeX = pageWidth / 2;
    }
  });

  yPos = typeY + 12;

  // Cause of Disability
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("III. CAUSE OF DISABILITY", margin, yPos);

  yPos += 8;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");

  const causeTypes = [
    "Acquired",
    "Chronic Illness",
    "Congenital/Inborn",
    "Injury",
  ];
  causeTypes.forEach((cause, index) => {
    const checked = data.disabilityInfo?.causes?.includes(cause) || false;
    drawCheckbox(margin + index * 45, yPos - 4, checked);
    doc.text(cause, margin + index * 45 + 5, yPos);
  });

  yPos += 12;

  // Address
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("IV. ADDRESS", margin, yPos);

  yPos += 8;
  doc.setFontSize(9);

  addField(
    "House No./Street",
    data.address?.houseNoStreet || "",
    margin,
    yPos,
    70,
  );
  addField("Barangay", data.address?.barangay || "", margin + 80, yPos, 50);

  yPos += 12;

  addField("Municipality", data.address?.municipality || "", margin, yPos, 60);
  addField("Province", data.address?.province || "", margin + 80, yPos, 50);

  yPos += 12;

  addField("Region", data.address?.region || "", margin, yPos, 60);

  yPos += 15;

  // Contact Details
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("V. CONTACT DETAILS", margin, yPos);

  yPos += 8;
  doc.setFontSize(9);

  addField(
    "Landline No.",
    data.contactDetails?.landlineNo || "",
    margin,
    yPos,
    50,
  );
  addField(
    "Mobile No.",
    data.contactDetails?.mobileNo || "",
    margin + 80,
    yPos,
    60,
  );

  yPos += 12;

  addField(
    "Email Address",
    data.contactDetails?.emailAddress || "",
    margin,
    yPos,
    80,
  );

  // ===== PAGE 2 =====
  doc.addPage();
  yPos = 20;

  // Educational Attainment
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("VI. EDUCATIONAL ATTAINMENT", margin, yPos);

  yPos += 8;
  doc.setFontSize(9);

  const educationLevels = [
    "No Grade Completed",
    "Elementary Level",
    "Elementary Graduate",
    "High School Level",
    "High School Graduate",
    "Post Secondary Level",
    "Post Secondary Graduate",
    "College Level",
    "College Graduate",
    "Vocational",
    "Masteral",
    "Doctoral",
  ];

  let eduX = margin;
  let eduY = yPos;
  educationLevels.forEach((edu, index) => {
    if (index % 3 === 0 && index > 0) {
      eduX = margin;
      eduY += 7;
    } else if (index > 0) {
      eduX += 60;
    }

    const checked = data.educationalAttainment?.includes(edu) || false;
    drawCheckbox(eduX, eduY - 4, checked);
    doc.text(edu, eduX + 5, eduY);
  });

  yPos = eduY + 15;

  // Employment Status
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("VII. EMPLOYMENT STATUS", margin, yPos);

  yPos += 8;
  doc.setFontSize(9);

  const employmentStatuses = ["Employed", "Unemployed", "Self-employed"];
  employmentStatuses.forEach((status, index) => {
    const checked = data.employmentStatus?.includes(status) || false;
    drawRadio(margin + index * 50, yPos - 4, checked);
    doc.text(status, margin + index * 50 + 5, yPos);
  });

  yPos += 12;

  // Types of Employment
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("VIII. TYPES OF EMPLOYMENT", margin, yPos);

  yPos += 8;
  doc.setFontSize(9);

  const employmentTypes = [
    "Permanent",
    "Casual",
    "Emergency",
    "Job Order",
    "Contract of Service",
  ];
  employmentTypes.forEach((type, index) => {
    const checked = data.employmentCategory?.includes(type) || false;
    drawRadio(margin + index * 40, yPos - 4, checked);
    doc.text(type, margin + index * 40 + 5, yPos);
  });

  yPos += 15;

  // Occupation
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("IX. OCCUPATION", margin, yPos);

  yPos += 8;
  doc.setFontSize(9);

  const occupations = [
    "Managers",
    "Professionals",
    "Technicians and Associate Professionals",
    "Clerical Support Workers",
    "Service and Sales Workers",
    "Skilled Agricultural, Forestry and Fishery Workers",
    "Craft and Related Trades Workers",
    "Plant and Machine Operators and Assemblers",
    "Elementary Occupations",
    "Armed Forces Occupations",
    "Others",
  ];

  let occX = margin;
  let occY = yPos;
  occupations.forEach((occ, index) => {
    if (index % 2 === 0 && index > 0) {
      occX = margin;
      occY += 7;
    } else if (index > 0) {
      occX = pageWidth / 2;
    }

    const checked = data.occupation?.types?.includes(occ) || false;
    drawCheckbox(occX, occY - 4, checked);
    doc.text(occ, occX + 5, occY);
  });

  if (data.occupation?.otherSpecify) {
    occY += 10;
    addField("Other Specify", data.occupation.otherSpecify, margin, occY, 80);
  }

  yPos = occY + 15;

  // ===== PAGE 3 =====
  doc.addPage();
  yPos = 20;

  // Organization Information
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("X. ORGANIZATION INFORMATION", margin, yPos);

  yPos += 8;
  doc.setFontSize(9);

  if (data.organizationInfo && data.organizationInfo.length > 0) {
    data.organizationInfo.forEach((org, index) => {
      addField(
        `Organization ${index + 1}`,
        org.organizationAffiliated || "",
        margin,
        yPos,
        80,
      );
      yPos += 8;
      addField("Contact Person", org.contactPerson || "", margin, yPos, 80);
      yPos += 8;
      addField("Office Address", org.officeAddress || "", margin, yPos, 100);
      yPos += 8;
      addField("Tel No.", org.telNos || "", margin, yPos, 50);
      yPos += 10;
    });
  } else {
    addField("Organization", "N/A", margin, yPos, 80);
    yPos += 8;
    addField("Contact Person", "N/A", margin, yPos, 80);
    yPos += 8;
    addField("Office Address", "N/A", margin, yPos, 100);
    yPos += 8;
    addField("Tel No.", "N/A", margin, yPos, 50);
    yPos += 10;
  }

  yPos += 5;

  // ID Reference Numbers
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("XI. ID REFERENCE NUMBERS", margin, yPos);

  yPos += 8;
  doc.setFontSize(9);

  addField("SSS No.", data.idReferences?.sssNo || "", margin, yPos, 50);
  addField(
    "PAG-IBIG No.",
    data.idReferences?.pagIbigNo || "",
    margin + 70,
    yPos,
    50,
  );

  yPos += 12;

  addField("PSN No.", data.idReferences?.psnNo || "", margin, yPos, 50);
  addField(
    "PhilHealth No.",
    data.idReferences?.philHealthNo || "",
    margin + 70,
    yPos,
    50,
  );

  yPos += 15;

  // Family Background
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("XII. FAMILY BACKGROUND", margin, yPos);

  yPos += 8;
  doc.setFontSize(9);

  addField(
    "Father's Name",
    data.familyBackground?.fatherName || "",
    margin,
    yPos,
    100,
  );
  yPos += 12;
  addField(
    "Mother's Name",
    data.familyBackground?.motherName || "",
    margin,
    yPos,
    100,
  );
  yPos += 12;
  addField(
    "Guardian's Name",
    data.familyBackground?.guardianName || "",
    margin,
    yPos,
    100,
  );

  yPos += 15;

  // Accomplished By
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("XIII. ACCOMPLISHED BY", margin, yPos);

  yPos += 8;
  doc.setFontSize(9);

  const accomplishedTypes = ["Applicant", "Guardian", "Representative"];
  accomplishedTypes.forEach((type, index) => {
    const checked = data.accomplishedBy?.type === type.toUpperCase();
    drawRadio(margin + index * 40, yPos - 4, checked);
    doc.text(type, margin + index * 40 + 5, yPos);
  });

  yPos += 12;

  addField(
    "Certifying Physician",
    data.accomplishedBy?.certifyingPhysician || "",
    margin,
    yPos,
    80,
  );
  yPos += 12;
  addField(
    "License No.",
    data.accomplishedBy?.licenseNo || "",
    margin,
    yPos,
    50,
  );

  yPos += 15;

  // Processing Information
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("XIV. PROCESSING INFORMATION", margin, yPos);

  yPos += 8;
  doc.setFontSize(9);

  addField(
    "Processing Officer",
    data.processingInfo?.processingOfficer || "",
    margin,
    yPos,
    80,
  );
  addField(
    "Approving Officer",
    data.processingInfo?.approvingOfficer || "",
    margin + 90,
    yPos,
    80,
  );

  yPos += 12;

  addField("Encoder", data.processingInfo?.encoder || "", margin, yPos, 80);
  addField(
    "Reporting Unit",
    data.processingInfo?.reportingUnit || "PDAO",
    margin + 90,
    yPos,
    50,
  );

  yPos += 12;

  addField("Control No.", data.controlNo || "", margin, yPos, 60);

  // Footer
  yPos = pageHeight - 15;
  doc.setFontSize(7);
  doc.setFont("helvetica", "italic");
  doc.text(
    "Sources definition of terms are the following: Republic Act 10747, MOP of ONESS, Department Administrative 2013-0005 and Amendment Department Administrative 2013-0005-A, Republic Act 11215, Philippine Standard Occupational Classification Of 2012. Work Health Organization (thru online searching) DOLE 2019 guideline (thru online searching)",
    margin,
    yPos,
    { maxWidth: pageWidth - margin * 2 },
  );

  // Convert to Buffer
  const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
  return pdfBuffer;
}
