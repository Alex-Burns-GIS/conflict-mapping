// frontend/src/components/VectorTileLayer.tsx
import React, { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

interface VectorTileLayerProps {
  containerId: string;
}

const VectorTileLayer: React.FC<VectorTileLayerProps> = ({ containerId }) => {
  const mapRef = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current) {
      mapRef.current = new maplibregl.Map({
        container: containerId,
        style: {
          version: 8,
          sources: {
            "vector-tiles": {
              type: "vector",
              tiles: [
                "http://localhost:8080/data/ne_10m_admin_0_countries/{z}/{x}/{y}.pbf",
              ],
              minzoom: 0,
              maxzoom: 10,
            },
          },
          layers: [
            {
              id: "countries-layer",
              type: "fill",
              source: "vector-tiles",
              "source-layer": "ne_10m_admin_0_countries",
              paint: {
                "fill-color": "lightblue",
                "fill-opacity": 0.5,
                "fill-outline-color": "blue",
              },
            },
          ],
        },
        center: [0, 0],
        zoom: 2,
      });

      // Add Click Event for Popups
      mapRef.current.on("click", "countries-layer", (e) => {
        const countryName = e.features?.[0]?.properties?.name || "Unknown";
        new maplibregl.Popup()
          .setLngLat(e.lngLat)
          .setHTML(`<b>Country:</b> ${countryName}`)
          .addTo(mapRef.current!);
      });
    }

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [containerId]);

  return <div id={containerId} style={{ width: "100%", height: "100vh" }} />;
};

export default VectorTileLayer;
