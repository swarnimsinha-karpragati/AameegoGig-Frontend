export const DOWNLOAD_FILE_TYPE = "DOWNLOAD_FILE";

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export const isNativeWebViewDownload = () =>
  typeof window !== "undefined" && typeof window.ReactNativeWebView?.postMessage === "function";

export const mimeTypeForFileName = (fileName, blobType = "") => {
  if (blobType && blobType !== "application/octet-stream") return blobType;
  const lower = String(fileName || "").toLowerCase();
  if (lower.endsWith(".xlsx")) return XLSX_MIME;
  if (lower.endsWith(".xls")) return "application/vnd.ms-excel";
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".csv")) return "text/csv";
  return blobType || "application/octet-stream";
};

const blobToBase64 = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = String(reader.result || "");
      const comma = dataUrl.indexOf(",");
      resolve(comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl);
    };
    reader.onerror = () => reject(reader.error || new Error("Could not read the file"));
    reader.readAsDataURL(blob);
  });

const saveWithAnchor = (blob, fileName) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
  return { method: "anchor" };
};

/**
 * Browser: `<a download>`. Workza WebView: post the bytes to native so the file
 * lands in Downloads instead of a blob URL that never persists.
 */
export const saveDownload = async (blob, fileName, mimeType) => {
  const type = mimeTypeForFileName(fileName, mimeType || blob?.type);
  if (isNativeWebViewDownload()) {
    const base64 = await blobToBase64(blob);
    window.ReactNativeWebView.postMessage(
      JSON.stringify({
        type: DOWNLOAD_FILE_TYPE,
        fileName,
        mimeType: type,
        base64,
      })
    );
    return { method: "native" };
  }
  return saveWithAnchor(blob, fileName);
};
