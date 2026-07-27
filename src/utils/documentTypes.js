// Human labels + upload options for employee document types.
// Category grouping lives server-side (backend utils/documentCategory.js);
// the API returns each doc's `category`, so the UI just filters on it.

export const DOC_TYPE_LABEL = {
  PHOTO: "Photo",
  AADHAAR: "Aadhaar Card",
  PAN: "PAN Card",
  EDUCATION: "Education Certificate",
  BANK: "Bank Proof",
  MEDICAL_CARD: "Medical Card",
  SALARY_SLIP: "Salary Slip",
  APPOINTMENT_LETTER: "Appointment Letter",
};

export const DOC_TYPE_OPTIONS = Object.entries(DOC_TYPE_LABEL).map(
  ([value, label]) => ({ value, label })
);

export const docTypeLabel = (type) =>
  DOC_TYPE_LABEL[type] || type || "Document";

// Allowed file extensions per document type. Keep in sync with the backend
// copy in AameegoGig-Backend/utils/documentCategory.js.
export const DOC_TYPE_ACCEPT = {
  PHOTO: [".png", ".jpg", ".jpeg"],
  AADHAAR: [".pdf", ".png", ".jpg", ".jpeg"],
  PAN: [".pdf", ".png", ".jpg", ".jpeg"],
  EDUCATION: [".pdf", ".png", ".jpg", ".jpeg"],
  BANK: [".pdf", ".png", ".jpg", ".jpeg"],
  MEDICAL_CARD: [".pdf", ".png", ".jpg", ".jpeg"],
  SALARY_SLIP: [".pdf"],
  APPOINTMENT_LETTER: [".pdf"],
};

// For the file picker's `accept` attribute.
export const acceptFor = (type) =>
  (DOC_TYPE_ACCEPT[type] || [".pdf", ".png", ".jpg", ".jpeg"]).join(",");

// Instant client-side guard (backend is authoritative).
export const isAllowedFile = (type, fileName = "") => {
  const dot = fileName.lastIndexOf(".");
  const ext = dot === -1 ? "" : fileName.slice(dot).toLowerCase();
  const allowed = DOC_TYPE_ACCEPT[type];
  return allowed ? allowed.includes(ext) : true;
};

// Filter-tab labels shown to users. "All" is the default (no filter).
export const DOC_CATEGORIES = [
  "All",
  "Legal",
  "Finance",
  "Salary Slip",
  "General",
  "Policy",
];

// Pure filter used by both the employee page and the admin modal.
export const filterDocuments = (
  documents,
  { category = "All", search = "" } = {}
) => {
  const cat = category.trim().toLowerCase();
  const term = search.trim().toLowerCase();

  return (documents || []).filter((doc) => {
    const matchesSearch =
      !term ||
      doc.fileName?.toLowerCase().includes(term) ||
      doc.originalName?.toLowerCase().includes(term) ||
      doc.employeeName?.toLowerCase().includes(term) ||
      docTypeLabel(doc.documentType).toLowerCase().includes(term);

    if (cat === "all") return matchesSearch;
    return matchesSearch && doc.category?.trim().toLowerCase() === cat;
  });
};
