import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, RotateCcw, X } from "lucide-react";

function SelfieCapture({ open, onClose, onCapture, submitting = false }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [capturedBlob, setCapturedBlob] = useState(null);
  const [error, setError] = useState("");
  const [cameraReady, setCameraReady] = useState(false);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraReady(false);
  }, []);

  const resetCapture = useCallback(() => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl("");
    setCapturedBlob(null);
  }, [previewUrl]);

  const startCamera = useCallback(async () => {
    setError("");

    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Camera is not supported on this device or browser.");
      return;
    }

    try {
      stopCamera();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current
            ?.play()
            .then(() => setCameraReady(true))
            .catch(() => setError("Unable to start camera preview."));
        };
      }
    } catch (err) {
      setError(
        err?.name === "NotAllowedError"
          ? "Camera permission denied. Please allow camera access to check in."
          : "Unable to access camera. Please try again."
      );
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stopCamera]);

  useEffect(() => {
    if (open) {
      startCamera();
    } else {
      stopCamera();
      resetCapture();
      setError("");
    }

    return () => {
      stopCamera();
    };
  }, [open, startCamera, stopCamera, resetCapture]);

  useEffect(
    () => () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    },
    [previewUrl]
  );

  const handleCapture = () => {
    const video = videoRef.current;
    if (!video || !cameraReady) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setError("Failed to capture selfie. Please try again.");
          return;
        }

        if (previewUrl) {
          URL.revokeObjectURL(previewUrl);
        }

        setCapturedBlob(blob);
        setPreviewUrl(URL.createObjectURL(blob));
        stopCamera();
      },
      "image/jpeg",
      0.9
    );
  };

  const handleConfirm = () => {
    if (!capturedBlob || submitting) return;
    onCapture(capturedBlob);
  };

  if (!open) return null;

  return (
    <div className="selfie-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="selfie-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="selfie-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="selfie-modal-header">
          <div>
            <h2 id="selfie-modal-title">Check in with selfie</h2>
            <p>
              Take a clear photo of your face. Your location will be captured when you confirm check-in.
            </p>
          </div>
          <button
            type="button"
            className="selfie-modal-close"
            onClick={onClose}
            disabled={submitting}
            aria-label="Close"
          >
            <X/>
          </button>
        </div>

        <div className="selfie-modal-body">
          {previewUrl ? (
            <img src={previewUrl} alt="Captured selfie preview" className="selfie-preview" />
          ) : (
            <div className="selfie-video-wrap">
              <video ref={videoRef} className="selfie-video" playsInline muted />
              {!cameraReady && !error ? (
                <span className="selfie-video-loading">Starting camera…</span>
              ) : null}
            </div>
          )}

          {error ? <p className="selfie-error">{error}</p> : null}
        </div>

        <div className="selfie-modal-actions">
          {previewUrl ? (
            <>
              <button
                type="button"
                className="selfie-btn secondary"
                onClick={() => {
                  resetCapture();
                  startCamera();
                }}
                disabled={submitting}
              >
                <RotateCcw size={16} />
                Retake
              </button>
              <button
                type="button"
                className="selfie-btn primary"
                onClick={handleConfirm}
                disabled={submitting}
              >
                {submitting ? "Checking in…" : "Confirm & Check In"}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="selfie-btn secondary"
                onClick={onClose}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="selfie-btn primary"
                onClick={handleCapture}
                disabled={!cameraReady || submitting}
              >
                <Camera size={16} />
                Capture Selfie
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default SelfieCapture;
