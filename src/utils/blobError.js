const readBlobText = (blob) => {
  if (typeof blob.text === 'function') return blob.text();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
};

/**
 * Requests made with `responseType: 'blob'` receive error bodies as a Blob too.
 * When that Blob holds a JSON object, swap it in for `error.response.data` so
 * callers can read `{ message, field, code }` as usual. Always returns the error.
 */
export async function parseBlobError(error) {
  const data = error?.response?.data;
  if (typeof Blob === 'undefined' || !(data instanceof Blob)) return error;
  try {
    const parsed = JSON.parse(await readBlobText(data));
    if (parsed && typeof parsed === 'object') error.response.data = parsed;
  } catch {
    // not JSON (e.g. a proxy HTML page); leave the original body
  }
  return error;
}
