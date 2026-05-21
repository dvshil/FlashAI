const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

async function extractTextFromBuffer(buffer, mimeType) {
  try {
    if (mimeType === 'application/pdf') {
      const data = await pdfParse(buffer);
      return data.text;
    } else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const result = await mammoth.extractRawText({ buffer: buffer });
      return result.value;
    } else if (mimeType === 'text/plain') {
      return buffer.toString('utf-8');
    } else {
      throw new Error('Unsupported file type');
    }
  } catch (error) {
    console.error('Error extracting text:', error);
    throw new Error('Failed to extract text from file');
  }
}

async function extractTextFromFile(filePath, mimeType) {
  const fs = require('fs');
  const buffer = fs.readFileSync(filePath);
  return extractTextFromBuffer(buffer, mimeType);
}

module.exports = { extractTextFromBuffer, extractTextFromFile };