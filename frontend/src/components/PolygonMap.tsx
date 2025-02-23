// // frontend/src/components/PolygonMap.tsx
// import React, { useEffect, useState } from 'react';
// import GeoJSONLayer from './GeoJSONLayer'; // Import instead of defining
// import { FeatureCollection } from 'geojson';

// const PolygonMap: React.FC = () => {
//   const [geoData, setGeoData] = useState<FeatureCollection | null>(null);

//   useEffect(() => {
//     // Fetch the GeoJSON data from the backend
//     fetch('http://localhost:4000/api/world-polygons')
//       .then((response) => {
//         if (!response.ok) {
//           throw new Error(`HTTP error! status: ${response.status}`);
//         }
//         return response.json();
//       })
//       .then((data: FeatureCollection) => setGeoData(data))
//       .catch((err) => console.error('Error fetching GeoJSON:', err));
//   }, []);

//   return (
//     <div>
//       {geoData ? (
//         <GeoJSONLayer data={geoData} />
//       ) : (
//         <p>Loading polygons...</p>
//       )}
//     </div>
//   );
// };

// export default PolygonMap;
