import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, RotateCcw, X } from "lucide-react";

function SelfieCapture({ open, onClose, onCapture, submitting = false, mode = "checkin" }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [capturedBlob, setCapturedBlob] = useState(null);
  const [error, setError] = useState("");
  const [cameraReady, setCameraReady] = useState(false);
  const [fetchingLocation, setFetchingLocation] = useState(false);

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

  const getCurrentLocation = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation is not supported by your browser."));
        return;
      }

      const options = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      };

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp,
          });
        },
        (err) => {
          let msg = "Unable to fetch current location.";
          if (err.code === err.PERMISSION_DENIED) {
            msg = "Location access denied. Please enable location permissions.";
          } else if (err.code === err.POSITION_UNAVAILABLE) {
            msg = "Location information is unavailable.";
          } else if (err.code === err.TIMEOUT) {
            msg = "Location request timed out. Please try again.";
          }
          reject(new Error(msg));
        },
        options
      );
    });
  };

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

  const handleConfirm = async () => {
    if (!capturedBlob || submitting || fetchingLocation) return;

    try {
      setError("");
      setFetchingLocation(true);

      const location = await getCurrentLocation();

      setFetchingLocation(false);
      onCapture({
        blob: capturedBlob,
        location: location,
      });
    } catch (locErr) {
      setFetchingLocation(false);
      setError(locErr.message || "Failed to get current location.");
    }
  };

  if (!open) return null;

  const isCheckout = mode === "checkout";
  const modalTitle = isCheckout ? "Check out with selfie" : "Check in with selfie";
  const modalDescription = isCheckout
    ? "Take a clear photo of your face. Your current location will be captured live when you confirm."
    : "Take a clear photo of your face. Your current location will be captured live when you confirm.";

  const isProcessing = submitting || fetchingLocation;

  const confirmLabel = isProcessing
    ? fetchingLocation
      ? "Fetching location…"
      : isCheckout
        ? "Checking out…"
        : "Checking in…"
    : isCheckout
      ? "Confirm & Check Out"
      : "Confirm & Check In";

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
            <h2 id="selfie-modal-title">{modalTitle}</h2>
            <p>{modalDescription}</p>
          </div>
          <button
            type="button"
            className="selfie-modal-close"
            onClick={onClose}
            disabled={isProcessing}
            aria-label="Close"
          >
            <X />
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
                disabled={isProcessing}
              >
                <RotateCcw size={16} />
                Retake
              </button>
              <button
                type="button"
                className="selfie-btn primary"
                onClick={handleConfirm}
                disabled={isProcessing}
              >
                {confirmLabel}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="selfie-btn secondary"
                onClick={onClose}
                disabled={isProcessing}
              >
                Cancel
              </button>
              <button
                type="button"
                className="selfie-btn primary"
                onClick={handleCapture}
                disabled={!cameraReady || isProcessing}
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