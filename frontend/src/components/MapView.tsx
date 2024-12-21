// frontend/src/components/MapView.tsx
import React from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css'; // Import Leaflet CSS
import PolygonMap from './PolygonMap';

const MapView: React.FC = () => {
  return (
    <div className="map-container">
      {/* Ensure MapContainer occupies the full height and width */}
      <MapContainer
        center={[20, 0]} // Center of the map
        zoom={2} // Default zoom level
        style={{ height: '100%', width: '100%' }} // Ensures full coverage
      >
        <TileLayer
          attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <PolygonMap />
      </MapContainer>
    </div>
  );
};

export default MapView;
