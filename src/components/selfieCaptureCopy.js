export const cameraAccessErrorMessage = (err) => {
  if (err?.name === "NotAllowedError") {
    return "Camera permission denied. Tap Allow camera and choose Allow. If the phone does not ask, enable Camera for Workza in Settings.";
  }
  return "Unable to access camera. Please try again.";
};
