import React, { useRef, useEffect, useState } from 'react';
import mapboxgl, { Map, Marker, LngLatLike } from 'mapbox-gl';

// IMPORTANT: Mapbox token is now read from .env file.
// FIX: Cast `import.meta` to `any` to access Vite environment variables without TypeScript errors as type definitions are missing.
mapboxgl.accessToken = (import.meta as any).env?.VITE_MAPBOX_TOKEN || 'YOUR_MAPBOX_TOKEN_HERE';

interface MapMarker {
  id: string;
  lng: number;
  lat: number;
  color?: string;
  popupContent?: string;
}

interface MapWrapperProps {
  markers: MapMarker[];
  initialViewState?: {
    longitude: number;
    latitude: number;
    zoom: number;
  };
  style?: React.CSSProperties;
}

const MapWrapper: React.FC<MapWrapperProps> = ({ markers, initialViewState, style }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<Map | null>(null);
  const [mapMarkers, setMapMarkers] = useState<Marker[]>([]);

  useEffect(() => {
    if (map.current || !mapContainer.current) return;
    
    if (mapboxgl.accessToken.includes('YOUR_MAPBOX_TOKEN_HERE')) {
        console.warn("Mapbox token not set. Map will not render. Update it in your .env file.");
        return;
    }

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [initialViewState?.longitude || 106.8456, initialViewState?.latitude || -6.2088],
      zoom: initialViewState?.zoom || 11,
    });
  }, [initialViewState]);

  useEffect(() => {
    if (!map.current) return;

    // Remove old markers
    mapMarkers.forEach(marker => marker.remove());
    const newMarkers: Marker[] = [];

    // Add new markers
    markers.forEach(markerData => {
      const el = document.createElement('div');
      el.className = 'marker';
      el.style.backgroundColor = markerData.color || '#3B82F6';
      el.style.width = '20px';
      el.style.height = '20px';
      el.style.borderRadius = '50%';
      el.style.border = '2px solid white';
      el.style.boxShadow = '0 0 0 2px rgba(0,0,0,0.1)';
      el.style.cursor = 'pointer';

      const markerInstance = new mapboxgl.Marker(el)
        .setLngLat([markerData.lng, markerData.lat]);

      if (markerData.popupContent) {
        const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(markerData.popupContent);
        markerInstance.setPopup(popup);
      }
      
      markerInstance.addTo(map.current!);
      newMarkers.push(markerInstance);
    });

    setMapMarkers(newMarkers);
    
    // Auto-fit map to markers if there's more than one
    if (markers.length > 1) {
        const bounds = new mapboxgl.LngLatBounds();
        markers.forEach(marker => {
            bounds.extend([marker.lng, marker.lat]);
        });
        map.current.fitBounds(bounds, { padding: 60 });
    } else if (markers.length === 1) {
        map.current.flyTo({
            center: [markers[0].lng, markers[0].lat],
            zoom: 14
        });
    }

  // We only want to re-run this effect when the markers data changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markers]);

  if (mapboxgl.accessToken.includes('YOUR_MAPBOX_TOKEN_HERE')) {
    return (
        <div className="h-full w-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center rounded-lg">
            <p className="text-gray-600 dark:text-gray-300">Mapbox token is not configured.</p>
        </div>
    );
  }

  return <div ref={mapContainer} style={style || { width: '100%', height: '100%' }} className="rounded-lg overflow-hidden" />;
};

export default MapWrapper;