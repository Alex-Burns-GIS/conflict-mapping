import React from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import PolygonMap from './PolygonMap';

const MapView: React.FC = () => {
  console.log('MapView rendered');
  return (
    <div className="h-full w-full" style={{ height: '100vh' }}>
      <MapContainer
        center={[20, 0]}
        zoom={2}
        className="h-full w-full"
      >
        <TileLayer
          attribution='© <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <PolygonMap />
      </MapContainer>
    </div>
  );
};

export default MapView;