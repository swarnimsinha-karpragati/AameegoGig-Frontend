import React from "react";
import "./DocumentPreview.css";

const getFileExtension = (url = "") => {
    try {
        return url.split(".").pop().split("?")[0].toLowerCase();
    } catch {
        return "";
    }
};

const imageExtensions = [
    "png",
    "jpg",
    "jpeg",
    "gif",
    "webp",
    "bmp",
    "svg",
    "avif",
];

const DocumentPreview = ({ url, isOpen, onClose }) => {
    if (!isOpen || !url) return null;

    const extension = getFileExtension(url);
    const isImage = imageExtensions.includes(extension);
    const isPdf = extension === "pdf";

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
                    {isImage ? (
                        <img src={url} alt="Preview" className="preview-image" />
                    ) : isPdf ? (
                        <iframe
                            src={url}
                            title="PDF Preview"
                            className="preview-pdf"
                        />
                    ) : (
                        <iframe
                            src={url}
                            title="Document Preview"
                            className="preview-pdf"
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default DocumentPreview;