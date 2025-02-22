// frontend/src/components/GeoJSONLayer.tsx
import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { FeatureCollection } from 'geojson';

interface GeoJSONLayerProps {
  data: FeatureCollection;
}

const GeoJSONLayer: React.FC<GeoJSONLayerProps> = ({ data }) => {
  const map = useMap();

  useEffect(() => {
    // Create a Leaflet GeoJSON layer
    const geojsonLayer = L.geoJSON(data, {
      style: () => ({
        color: 'blue',
        weight: 1,
        fillColor: 'lightblue',
        fillOpacity: 0.5,
      }),
      onEachFeature: (feature, layer) => {
        if (feature.properties?.name) {
          layer.bindPopup(feature.properties.name);
        }
      },
    });

    geojsonLayer.addTo(map);

    // Auto-fit the map to the GeoJSON data bounds
    if (data.features.length > 0) {
      map.fitBounds(geojsonLayer.getBounds(), { padding: [20, 20] });
    }

    // Clean up
    return () => {
      map.removeLayer(geojsonLayer);
    };
  }, [data, map]);

  return null;
};

export default GeoJSONLayer;
