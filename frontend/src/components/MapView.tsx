// frontend/src/components/MapView.tsx
import React from "react";
import VectorTileLayer from "./VectorTileLayer";

const MapView: React.FC = () => {
  console.log("MapView rendered");

  return (
    <div className="h-full w-full">
      <VectorTileLayer containerId="map-container" />
    </div>
  );
};

export default MapView;
