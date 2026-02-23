import { PDFDocument } from "pdf-lib";

export async function analyzePdfStructure(pdfBytes: ArrayBuffer) {
  try {
    const pdfDoc = await PDFDocument.load(pdfBytes);

    console.log("===== PDF ANALYSIS =====");
    console.log("Page count:", pdfDoc.getPageCount());

    // Check for form fields
    const form = pdfDoc.getForm();
    const fields = form.getFields();
    console.log("Form fields found:", fields.length);

    fields.forEach((field, index) => {
      console.log(`Field ${index + 1}:`, {
        name: field.getName(),
        type: field.constructor.name,
      });
    });

    // Get page sizes
    const pages = pdfDoc.getPages();
    pages.forEach((page, index) => {
      const { width, height } = page.getSize();
      console.log(`Page ${index + 1} size:`, { width, height });
    });

    return {
      pageCount: pdfDoc.getPageCount(),
      fields: fields.map((f) => ({
        name: f.getName(),
        type: f.constructor.name,
      })),
      pages: pages.map((p) => p.getSize()),
    };
  } catch (error) {
    console.error("Error analyzing PDF:", error);
    return null;
  }
}
