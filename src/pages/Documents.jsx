import { useCallback, useEffect, useState } from "react";
import MainLayout from "../layouts/MainLayout";
import {
  Search,
  Upload,
  FileText,
  FileSpreadsheet,
  Image,
  Eye,
  Download,
  Paperclip,
} from "lucide-react";

import {
  getDocumentViewUrl,
  downloadDocument,
  getDocuments,
  getEmployeeDocuments,
  uploadEmployeeDocument,
} from "../services/documentService";
import {
  DOC_CATEGORIES,
  DOC_TYPE_ACCEPT,
  DOC_TYPE_OPTIONS,
  acceptFor,
  docTypeLabel,
  filterDocuments,
  isAllowedFile,
} from "../utils/documentTypes";
import Button from "../components/Button";
import DocumentPreview from "../components/DocumentPreview";
import Pagination from "../components/Pagination";

function Documents() {
  const [documents, setDocuments] = useState([]);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [loggedInUser, setLoggedInUser] = useState(null);
  const [docPagination, setDocPagination] = useState({ page: 1, limit: 10, total: 0, pages: 0 });

  // Employee self-upload
  const [documentType, setDocumentType] = useState("AADHAAR");
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [previewUrl, setPreviewUrl] = useState(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("user");
      if (stored) {
        const parsed = JSON.parse(stored);
        setLoggedInUser({
          employeeId: parsed.employeeId,
          name: parsed.name || "Workspace User",
          role: parsed.role?.toLowerCase() || "employee",
        });
      }
    } catch (error) {
      console.error("Error loading user data from localStorage:", error);
    }
  }, []);

  // Admin/HR see every employee's documents; everyone else sees only their own.
  const canSeeAll =
    loggedInUser?.role === "admin" || loggedInUser?.role === "hr";
  const isEmployee = !canSeeAll;

  const fetchDocuments = useCallback(async () => {
    if (!loggedInUser) return;
    try {
      const params = { page: docPagination.page, limit: docPagination.limit };
      const res = canSeeAll
        ? await getDocuments(params)
        : await getEmployeeDocuments(loggedInUser.employeeId, params);
      setDocuments(res.data.documents || []);
      if (res.data.pagination) {
        setDocPagination(prev => ({ ...prev, total: res.data.pagination.total, pages: res.data.pagination.pages }));
      }
    } catch (error) {
      console.error("Error fetching documents:", error);
    }
  }, [loggedInUser, canSeeAll, docPagination.page, docPagination.limit]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleUpload = async () => {
    if (!uploadFile || !loggedInUser?.employeeId) return;
    if (!isAllowedFile(documentType, uploadFile.name)) {
      setMessage(
        `Invalid file for ${docTypeLabel(documentType)}. Allowed: ${DOC_TYPE_ACCEPT[
          documentType
        ].join(", ")}`
      );
      return;
    }
    setUploading(true);
    setMessage("");
    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("employeeId", loggedInUser.employeeId);
      formData.append("documentType", documentType);

      await uploadEmployeeDocument(formData);
      setUploadFile(null);
      setMessage("Document uploaded successfully");
      setTimeout(() => setMessage(""), 3000);
      fetchDocuments();
    } catch (error) {
      setMessage(
        error.response?.data?.message?.includes("File too large")
          ? "File size should be less than 20 MB"
          : error.response?.data?.message || "Upload failed"
      );
    } finally {
      setUploading(false);
    }
  };

  // File-type recognition: a coloured tile per kind so the grid scans fast.
  const fileKind = (type) => {
    const t = type?.toLowerCase();
    if (t === "xls" || t === "xlsx" || t === "csv")
      return { icon: <FileSpreadsheet size={22} />, tone: "sheet" };
    if (t === "png" || t === "jpg" || t === "jpeg" || t === "webp")
      return { icon: <Image size={22} />, tone: "image" };
    if (t === "pdf") return { icon: <FileText size={22} />, tone: "pdf" };
    return { icon: <FileText size={22} />, tone: "doc" };
  };

  const filteredDocuments = filterDocuments(documents, {
    category: activeCategory,
    search,
  });

  return (
    <MainLayout>

      <DocumentPreview
        isOpen={!!previewUrl}
        onClose={() => setPreviewUrl(null)}
        url={previewUrl}
      />
      <div className="documents-page">
        <div className="documents-header">
          <div>
            <h1>Documents</h1>
            <p>
              {isEmployee
                ? "Upload and view your personal documents"
                : "All employee documents across the organization"}{" "}
              • <strong>{documents.length}</strong>
            </p>
          </div>
        </div>

        {/* UPLOAD — employees only. Admin uploads per-employee in Employees. */}
        {isEmployee && (
          <div className="doc-upload">
            <div className="doc-upload__row">
              <label className="doc-upload__field">
                <span>Document type</span>
                <select
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value)}
                >
                  {DOC_TYPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="doc-upload__field">
                <span>File</span>
                <div className="doc-upload__file">
                  <input
                    type="file"
                    accept={acceptFor(documentType)}
                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  />
                  <Paperclip size={15} />
                  <span className="doc-upload__filename">
                    {uploadFile ? uploadFile.name : "Choose a file"}
                  </span>
                </div>
              </label>

              <Button onClick={handleUpload} disabled={!uploadFile || uploading}>
                <Upload size={16} />
                {uploading ? "Uploading…" : "Upload"}
              </Button>
            </div>

            <p className="doc-upload__hint">
              Allowed for {docTypeLabel(documentType)}:{" "}
              {DOC_TYPE_ACCEPT[documentType].join(", ")}
            </p>
            {message && <p className="doc-upload__msg">{message}</p>}
          </div>
        )}

        {/* SEARCH + FILTER */}
        <div className="documents-toolbar-card">
          <div className="search-wrapper">
            <Search size={18} />
            <input
              type="text"
              placeholder={
                isEmployee
                  ? "Search documents..."
                  : "Search by document, type or employee..."
              }
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="document-filters">
            {DOC_CATEGORIES.map((category) => (
              <Button
                key={category}
                className={activeCategory === category ? "active" : "not-active"}
                onClick={() => setActiveCategory(category)}
              >
                {category}
              </Button>
            ))}
          </div>
        </div>

        {/* GRID */}
        <div className="documents-grid">
          {filteredDocuments.length > 0 ? (
            filteredDocuments.map((doc) => {
              const kind = fileKind(doc.fileType);
              return (
                <div key={doc._id} className="document-card">
                  <div className="document-top">
                    <div className={`document-icon document-icon--${kind.tone}`}>
                      {kind.icon}
                    </div>
                    <span className="document-type-badge">
                      {docTypeLabel(doc.documentType)}
                    </span>
                  </div>

                  <h3 className="document-name" title={doc.fileName}>
                    {doc.fileName}
                  </h3>

                  <div className="document-meta">
                    {!isEmployee && doc.employeeName && (
                      <span className="document-owner">{doc.employeeName}</span>
                    )}
                    <span>{doc.fileSize}</span>
                    <span className="document-meta__dot">•</span>
                    <span>{doc.fileType}</span>
                  </div>

                  <div className="document-bottom">
                    <span className="document-date">
                      {new Date(doc.createdAt).toLocaleDateString()}
                    </span>
                    <div className="document-actions">
                      <button
                        className="document-actions__view"
                        onClick={() => setPreviewUrl(getDocumentViewUrl(doc._id))}
                      >
                        <Eye size={15} />
                        View
                      </button>
                      <button
                        title="Download"
                        onClick={() => downloadDocument(doc._id)}
                      >
                        <Download size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="documents-empty">
              <FileText size={30} />
              <p>No documents found</p>
              <span>
                {isEmployee
                  ? "Upload your first document using the form above."
                  : "Documents uploaded for employees will appear here."}
              </span>
            </div>
          )}
        </div>

        {docPagination.pages > 1 && (
          <Pagination
            currentPage={docPagination.page}
            totalPages={docPagination.pages}
            totalRecords={docPagination.total}
            limit={docPagination.limit}
            onPageChange={setDocPagination}
            showPageSize
            onPageSizeChange={(limit) => setDocPagination(p => ({ ...p, limit, page: 1 }))}
          />
        )}
      </div>
    </MainLayout>
  );
}

export default Documents;
