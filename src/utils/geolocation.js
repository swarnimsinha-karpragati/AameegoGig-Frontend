const getLocationErrorMessage = (action = "check in") => {
  const label = action === "check out" ? "check out" : "check in";
  return {
    unsupported: "Geolocation is not supported on this device or browser.",
    denied: `Location permission denied. Please allow location access to ${label}.`,
    unavailable: "Location services are turned off. Please turn on GPS on your device and try again.",
    timeout: "Unable to detect location in time. Please try again.",
    default: "Unable to detect your location. Please ensure location is enabled and try again.",
  };
};

export const getAttendanceLocation = (action = "check in") =>
  new Promise((resolve, reject) => {
    const messages = getLocationErrorMessage(action);

    if (!navigator.geolocation) {
      alert(messages.unsupported);
      reject(new Error(messages.unsupported));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      (error) => {
        let errorMessage = messages.default;

        if (error.code === error.PERMISSION_DENIED) {
          errorMessage = messages.denied;
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errorMessage = messages.unavailable;
        } else if (error.code === error.TIMEOUT) {
          errorMessage = messages.timeout;
        }

        // Trigger browser alert popup
        alert(errorMessage);

        reject(new Error(errorMessage));
      },
      {
        enableHighAccuracy: true,
        timeout: 60000,
        maximumAge: 5000,
      }
    );
  });

/** @deprecated use getAttendanceLocation */
export const getCheckInLocation = () => getAttendanceLocation("check in");

export const formatGeoLocation = (location) => {
  if (!location?.latitude && location?.latitude !== 0) return null;

  const lat = Number(location.latitude).toFixed(6);
  const lng = Number(location.longitude).toFixed(6);
  const accuracy =
    location.accuracy != null
      ? `±${Math.round(Number(location.accuracy))}m`
      : null;

  return {
    label: `${lat}, ${lng}`,
    mapsUrl:
      location.mapsUrl ||
      `https://www.google.com/maps?q=${location.latitude},${location.longitude}`,
    accuracy,
  };
};

/** @deprecated use formatGeoLocation */
export const formatCheckInLocation = formatGeoLocation;