import { useRef, useEffect, useState } from 'react';
import {
  Map,
  Marker,
  MapControl,
  ControlPosition,
  useMap,
} from '@vis.gl/react-google-maps';

const toValidCoord = (value, fallback) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

// NOTE: must be rendered INSIDE <Map> so useMap() returns a real instance.
// Calling useMap() in the same component that renders <Map> always gives null,
// which is why panTo() silently did nothing ("my location sometimes not working").
const MapController = ({ center, onReady, disabled, onMapClick }) => {
  const map = useMap();
  const lastPannedRef = useRef('');

  useEffect(() => {
    if (map) onReady?.(map);
  }, [map, onReady]);

  // Pan only when the *selected position* changes (my-location / initial edit
  // value / marker drag). Plain map panning never touches the position, so the
  // marker no longer sticks to the map center.
  useEffect(() => {
    if (!map || !center) return;
    const key = `${center.lat.toFixed(6)},${center.lng.toFixed(6)}`;
    if (lastPannedRef.current === key) return;
    lastPannedRef.current = key;
    map.panTo(center);
  }, [map, center]);

  useEffect(() => {
    if (!map || disabled) return;
    const listener = map.addListener('click', (e) => {
      if (e.latLng) onMapClick?.(e.latLng.lat(), e.latLng.lng());
    });
    return () => listener.remove();
  }, [map, disabled, onMapClick]);

  return null;
};

export default function MyMap({ latitude, longitude, onChange, disabled }) {
  const fallbackCenter = { lat: 28.4601, lng: 77.0264 };
  const mapRef = useRef(null);
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState('');

  const hasCoords =
    latitude !== '' && latitude !== null && latitude !== undefined &&
    longitude !== '' && longitude !== null && longitude !== undefined &&
    Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude));

  const currentCenter = {
    lat: hasCoords ? toValidCoord(latitude, fallbackCenter.lat) : fallbackCenter.lat,
    lng: hasCoords ? toValidCoord(longitude, fallbackCenter.lng) : fallbackCenter.lng,
  };
  // Only pass a real position to the controller once user has picked something.
  const selectedPosition = hasCoords ? currentCenter : null;

  const emitChange = (newLat, newLng) => {
    if (!Number.isFinite(Number(newLat)) || !Number.isFinite(Number(newLng))) return;
    setLocError('');
    onChange?.(Number(newLat), Number(newLng));
  };

  const focusMap = (newLat, newLng) => {
    if (mapRef.current) {
      mapRef.current.panTo({ lat: newLat, lng: newLng });
      mapRef.current.setZoom(16);
    }
  };

  const handleMarkerDragEnd = (e) => {
    if (e.latLng) {
      const newLat = e.latLng.lat();
      const newLng = e.latLng.lng();
      emitChange(newLat, newLng);
      focusMap(newLat, newLng);
    }
  };

  const handleMapClick = (newLat, newLng) => {
    emitChange(newLat, newLng);
    // Don't re-center on plain clicks so the map doesn't jump under the cursor.
  };

  const handleCurrentLocation = () => {
    setLocError('');
    if (!('geolocation' in navigator)) {
      setLocError('Geolocation is not supported by this browser.');
      return;
    }
    // Must run in a secure context (https / localhost) or the callback never fires.
    if (typeof window !== 'undefined' && window.isSecureContext === false) {
      setLocError('Current location needs HTTPS or localhost to work.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const newLat = pos.coords.latitude;
        const newLng = pos.coords.longitude;
        emitChange(newLat, newLng);
        focusMap(newLat, newLng);
      },
      (err) => {
        setLocating(false);
        if (err?.code === 1) setLocError('Location blocked. Please allow location permission and try again.');
        else if (err?.code === 3) setLocError('Location request timed out. Please try again.');
        else setLocError('Unable to fetch current location. Please try again.');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  return (
    <Map
      defaultZoom={hasCoords ? 16 : 11}
      defaultCenter={currentCenter}
      mapTypeId="roadmap"
      mapTypeControl={false} // removes the Map / Satellite toggle
      streetViewControl={false}
      fullscreenControl={false} // removes the full-view / expand button
      zoomControl={!disabled}
      disableDefaultUI={disabled} // Hides zoom controls in view mode
      gestureHandling={disabled ? 'none' : 'greedy'} // Prevents dragging in view mode
    >
      <MapController
        center={selectedPosition}
        disabled={disabled}
        onReady={(m) => { mapRef.current = m; }}
        onMapClick={handleMapClick}
      />

      {/* White "Current location" button in the top-right corner */}
      {!disabled && (
        <MapControl position={ControlPosition.TOP_RIGHT}>
          <button
            type="button" // Prevents form submission
            onClick={handleCurrentLocation}
            disabled={locating}
            title={locating ? 'Fetching your location…' : 'Go to my location'}
            aria-label="Go to my location"
            style={{
              height: '40px',
              marginTop: '10px',
              marginRight: '10px',
              padding: '0 15px',
              background: '#fff',
              color: '#1f2937',
              border: 'none',
              borderRadius: '4px',
              boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
              cursor: locating ? 'wait' : 'pointer',
              fontWeight: '600',
              fontSize: '14px',
              opacity: locating ? 0.6 : 1,
            }}
          >
            {locating ? 'Locating…' : 'Current location'}
          </button>
        </MapControl>
      )}

      {locError && !disabled ? (
        <MapControl position={ControlPosition.BOTTOM_CENTER}>
          <div style={{ background: '#fef2f2', color: '#b91c1c', fontSize: 12, padding: '6px 12px', borderRadius: 4, marginBottom: 8, boxShadow: '0 2px 6px rgba(0,0,0,0.2)' }}>
            {locError}
          </div>
        </MapControl>
      ) : null}

      {/* Marker only moves when the user drags it or clicks the map —
          dragging/panning the map itself no longer moves the pointer. */}
      {hasCoords ? (
        <Marker
          position={currentCenter}
          draggable={!disabled}
          onDragEnd={disabled ? undefined : handleMarkerDragEnd}
        />
      ) : null}

    </Map>
  );
}
