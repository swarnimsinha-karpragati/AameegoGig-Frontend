import React, { useState, useEffect } from "react";
import axios from "axios";
import "./DocumentPreview.css";

const DocumentPreview = ({ url, isOpen, onClose }) => {
    const [blobUrl, setBlobUrl] = useState(null);
    const [contentType, setContentType] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        let currentBlobUrl = null;

        const fetchDocument = async () => {
            if (!isOpen || !url) return;

            try {
                setLoading(true);
                setError(null);
                let parsedUser = null;
                try {
                    parsedUser = JSON.parse(localStorage.getItem("user"));
                } catch {
                    parsedUser = null;
                }

                // Only append vendorCode when the logged-in user actually has one
                // (otherwise the URL ends up with vendorCode=undefined).
                const requestUrl = new URL(url, window.location.origin);
                if (parsedUser?.vendor_code) {
                    requestUrl.searchParams.set("vendorCode", parsedUser.vendor_code);
                }

                // Fetch the document content as a Blob
                const response = await axios.get(requestUrl.toString(), {
                    responseType: "blob",
                });

                const type = response.headers["content-type"] || "";
                setContentType(type);

                // Create a local blob URL that iframes and img tags can render safely
                const blob = new Blob([response.data], { type });
                currentBlobUrl = URL.createObjectURL(blob);
                setBlobUrl(currentBlobUrl);
            } catch (err) {
                console.error("Error loading document preview:", err);
                setError("Failed to load document preview.");
            } finally {
                setLoading(false);
            }
        };

        fetchDocument();

        // Cleanup the object URL when the modal closes or URL changes
        return () => {
            if (currentBlobUrl) {
                URL.revokeObjectURL(currentBlobUrl);
            }
            setBlobUrl(null);
            setContentType("");
        };
    }, [url, isOpen]);

    if (!isOpen) return null;

    const isImage = contentType.startsWith("image/");
    const isPdf = contentType.includes("pdf");

    return (
        <div className="preview-overlay">
            <div className="preview-container">
                <div className="preview-header">
                    <h3>Preview</h3>
                    <button className="close-btn" onClick={onClose}>
                        ✕
                    </button>
                </div>

                <div className="preview-body">
                    {loading && <div className="preview-message">Loading preview...</div>}
                    
                    {error && <div className="preview-message error">{error}</div>}

                    {!loading && !error && blobUrl && (
                        isImage ? (
                            <img src={blobUrl} alt="Preview" className="preview-image" />
                        ) : isPdf ? (
                            <iframe
                                src={blobUrl}
                                title="PDF Preview"
                                className="preview-pdf"
                            />
                        ) : (
                            <iframe
                                src={blobUrl}
                                title="Document Preview"
                                className="preview-pdf"
                            />
                        )
                    )}
                </div>
            </div>
        </div>
    );
};

export default DocumentPreview;