import React from 'react';
import MapView from './components/MapView';

function App() {
  return (
    <div className="flex flex-col h-screen w-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white overflow-hidden">
      <h1 className="text-3xl font-bold text-center p-0 m-0 mb-2">World Polygons Map</h1>
      <div className="flex-grow h-full w-full">
        <MapView />
      </div>
    </div>
  );
}

export default App;