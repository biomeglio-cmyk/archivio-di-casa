import { File } from 'expo-file-system';
import { PDFDocument } from 'pdf-lib';

// Number of pages of a PDF file, read with pdf-lib when it is imported. A protected PDF still
// tells its page count (only its contents are encrypted); a damaged one gives null.
export async function countPdfPages(uri: string): Promise<number | null> {
  try {
    const bytes = await new File(uri).bytes();
    const pdf = await PDFDocument.load(bytes, {
      ignoreEncryption: true,
      updateMetadata: false,
      throwOnInvalidObject: false,
    });
    const count = pdf.getPageCount();
    return count > 0 ? count : null;
  } catch {
    return null;
  }
}
