import React, { useRef, useEffect, useState } from 'react';
import mapboxgl, { Map, Marker, LngLatLike } from 'mapbox-gl';
import { mapboxToken } from '../services/supabase';

// FIX: Set the access token from the imported single source of truth.
mapboxgl.accessToken = mapboxToken;

interface MapMarker {
  id: string;
  lng: number;
  lat: number;
  color?: string;
  popupContent?: string;
}

interface MapWrapperProps {
  markers: MapMarker[];
  routeGeoJson?: any | null; // GeoJSON Feature for the route line
  initialViewState?: {
    longitude: number;
    latitude: number;
    zoom: number;
  };
  style?: React.CSSProperties;
}

const MapWrapper: React.FC<MapWrapperProps> = ({ markers, routeGeoJson, initialViewState, style }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<Map | null>(null);
  const [mapMarkers, setMapMarkers] = useState<Marker[]>([]);

  useEffect(() => {
    if (map.current || !mapContainer.current) return;
    
    // FIX: Check for a falsy token, which is now an empty string if not configured.
    if (!mapboxgl.accessToken) {
        console.warn("Mapbox token not set. Map will not render. Update it in your .env file.");
        return;
    }

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [initialViewState?.longitude || 106.8456, initialViewState?.latitude || -6.2088],
      zoom: initialViewState?.zoom || 11,
    });
    
    map.current.on('load', () => {
        if (map.current && routeGeoJson) {
            map.current.addSource('route', {
                'type': 'geojson',
                'data': routeGeoJson
            });
            map.current.addLayer({
                'id': 'route',
                'type': 'line',
                'source': 'route',
                'layout': {
                    'line-join': 'round',
                    'line-cap': 'round'
                },
                'paint': {
                    'line-color': '#3B82F6',
                    'line-width': 6
                }
            });
        }
    });

  }, [initialViewState, routeGeoJson]);

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
    
    // Auto-fit map to route or markers
    if (routeGeoJson && routeGeoJson.geometry.coordinates.length > 0) {
        const bounds = new mapboxgl.LngLatBounds();
        routeGeoJson.geometry.coordinates.forEach((coord: LngLatLike) => {
            bounds.extend(coord);
        });
        map.current.fitBounds(bounds, { padding: 60 });
    } else if (markers.length > 1) {
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
  }, [markers, routeGeoJson]);
  
   useEffect(() => {
    if (map.current?.getSource('route') && routeGeoJson) {
      (map.current.getSource('route') as mapboxgl.GeoJSONSource).setData(routeGeoJson);
    } else if (map.current?.isStyleLoaded() && !map.current.getSource('route') && routeGeoJson) {
         map.current.addSource('route', {
            'type': 'geojson',
            'data': routeGeoJson
         });
         map.current.addLayer({
            'id': 'route',
            'type': 'line',
            'source': 'route',
            'layout': { 'line-join': 'round', 'line-cap': 'round' },
            'paint': { 'line-color': '#3B82F6', 'line-width': 6 }
         });
    }
  }, [routeGeoJson]);


  // FIX: Update this conditional render to check for a falsy (empty string) token.
  if (!mapboxgl.accessToken) {
    return (
        <div className="h-full w-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center rounded-lg">
            <p className="text-gray-600 dark:text-gray-300">Mapbox token is not configured.</p>
        </div>
    );
  }

  return <div ref={mapContainer} style={style || { width: '100%', height: '100%' }} className="rounded-lg overflow-hidden" />;
};

export default MapWrapper;