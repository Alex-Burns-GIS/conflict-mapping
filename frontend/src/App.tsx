// frontend/src/App.tsx
import React from 'react'; // If using Option A
import MapView from './components/MapView'; // Ensure path and casing are correct

function App() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <h1 className="text-3xl font-bold p-4">World Polygons Map</h1>
      <MapView />
    </div>
  );
}

export default App;
