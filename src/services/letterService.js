import API from './apiClient';
import { parseBlobError } from '../utils/blobError';

/** Letter APIs use the standard `{ success, data }` envelope. */
const dataOf = (response) => response.data?.data;

/**
 * Renders a letter for a real recipient -> { html, bodyHtml, missing, invalid }.
 * `bodyHtml` is the resolved body without the letterhead layout; it is what a
 * per-letter edit starts from and is sent back as `editedHtml` when issuing.
 */
export const previewLetter = async (payload) => dataOf(await API.post('/letters/preview', payload));

/**
 * People a letter can be issued to, including employees who have left (experience/relieving letters).
 * With `templateId` the server lists only people that letter can go to (an offer skips accepted candidates).
 * -> [{ _id, name, code, email, designation, department, status }]
 */
export const getLetterRecipients = async ({ recipientType, search = '', id = '', templateId = '' } = {}) => {
  const params = { recipientType, search, id, ...(templateId ? { templateId } : {}) };
  return dataOf(await API.get('/letters/recipients', { params })) || [];
};

/** -> { letter, fileUrl, emailed, emailError }; the server stamps emailedAt only after a successful send. */
export const issueLetter = async (payload) => {
  const data = dataOf(await API.post('/letters/issue', payload)) || {};
  return { ...data, emailed: Boolean(data.letter?.emailedAt) };
};

/** -> { letters, pagination: { page, limit, total, totalPages } } */
export const getIssuedLetters = async (params = {}) => {
  const body = (await API.get('/letters', { params })).data || {};
  return { letters: body.data || [], pagination: body.pagination || null };
};

export const emailIssuedLetter = async (id) => dataOf(await API.post(`/letters/${id}/email`));

export const voidIssuedLetter = async (id, reason) => dataOf(await API.post(`/letters/${id}/void`, { reason }));

const fetchFile = async (request) => {
  try {
    return await request();
  } catch (error) {
    throw await parseBlobError(error);
  }
};

const fetchBlob = async (request) => (await fetchFile(request)).data;

/** File name from a Content-Disposition header; prefers the UTF-8 `filename*` form. */
const fileNameFromDisposition = (header = '') => {
  const encoded = /filename\*\s*=\s*UTF-8''([^;]+)/i.exec(header);
  if (encoded) {
    try {
      return decodeURIComponent(encoded[1].trim());
    } catch {
      // Malformed encoding: fall through to the plain filename.
    }
  }
  const plain = /filename\s*=\s*"?([^";]+)"?/i.exec(header);
  return plain ? plain[1].trim() : '';
};

const requestIssuedLetterPdf = (id) => API.get(`/letters/${id}/download`, { responseType: 'blob' });

export const fetchIssuedLetterPdf = (id) => fetchBlob(() => requestIssuedLetterPdf(id));

const saveBlob = (blob, fileName) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

/** Saves an issued letter under the server's name (template + letter number); `fallbackName` only when the header is missing. */
export const downloadIssuedLetter = async (id, fallbackName = `letter-${id}.pdf`) => {
  const response = await fetchFile(() => requestIssuedLetterPdf(id));
  saveBlob(response.data, fileNameFromDisposition(response.headers?.['content-disposition']) || fallbackName);
};

/** Watermarked PDF of an unissued letter; takes the same payload as previewLetter and records nothing. */
export const downloadDraftLetter = async (payload, fileName = 'letter_DRAFT.pdf') => {
  const blob = await fetchBlob(() => API.post('/letters/preview/pdf', payload, { responseType: 'blob' }));
  saveBlob(blob, fileName);
};
