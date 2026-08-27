import API from "./apiClient";
import { getApiUrl } from "../config/api";

/* =========================
   GET ALL DOCUMENTS
========================= */
export const getDocuments =
  async (params = {}) => {
    return API.get(
      "/documents",
      { params }
    );
  };

/* =========================
   UPLOAD DOCUMENT
========================= */
export const uploadDocument = async (
  file,
  category
) => {
  const formData = new FormData();

  formData.append("file", file);

  formData.append(
    "category",
    category
  );

  // Let the browser set the multipart boundary (see uploadEmployeeDocument).
  return API.post(
    "/documents/upload",
    formData
  );
};

/* =========================
   DELETE DOCUMENT
========================= */
export const deleteDocument =
  async (id) => {
    return API.delete(
      `/documents/${id}`
    );
  };

/* =========================
   VIEW DOCUMENT
========================= */

/** Returns the authenticated URL for a document (no side-effects). */
export const getDocumentViewUrl = (id) => {
  const token = localStorage.getItem("token");

  let vendorCode = "";
  try {
    const user = JSON.parse(localStorage.getItem("user"));
    vendorCode = user?.vendor_code || "";
  } catch {
    vendorCode = "";
  }

  const separator = vendorCode
    ? `&vendorCode=${encodeURIComponent(vendorCode)}`
    : "";

  return getApiUrl(`/documents/view/${id}?token=${token}${separator}`);
};

/** Opens the document in a new browser tab (legacy helper). */
export const viewDocument = (id) => {
  window.open(getDocumentViewUrl(id), "_blank");
};

/* =========================
   DOWNLOAD DOCUMENT
========================= */
export const downloadDocument = async (id) => {
  const token = localStorage.getItem("token");
  const url = getApiUrl(`/documents/view/${id}?token=${token}`);

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Download failed");

    const blob = await response.blob();

    const blobUrl = window.URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = blobUrl;

    link.setAttribute("download", `document-${id}.pdf`);

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
  } catch (error) {
    console.error("Error downloading the file:", error);
  }
};


export const uploadEmployeeDocument =
  async (formData) => {
    // No manual Content-Type: axios + the browser add the multipart
    // boundary. A boundary-less header breaks server-side parsing.
    return API.post(
      "/documents/upload",
      formData
    );
  };

/* =========================
 GET EMPLOYEE DOCUMENTS
========================= */
export const getEmployeeDocuments =
  async (employeeId, params = {}) => {
    return API.get(
      `/documents/employee/${employeeId}`,
      { params }
    );
  };