import { MapPin } from "lucide-react";
import { formatGeoLocation } from "../../utils/geolocation";

function SessionLocationLink({ location, prefix }) {
  const formatted = formatGeoLocation(location);
  if (!formatted) return null;

  return (
    <a
      className="attendance-location-btn"
      href={formatted.mapsUrl}
      target="_blank"
      rel="noopener noreferrer"
      title={`${prefix}: ${formatted.label}`}
    >
      <MapPin size={14} />
    </a>
  );
}

export default SessionLocationLink;
