import MapView from './components/MapView';

function App() {
  return (
    <div className="flex flex-col h-screen w-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white">
      <h1 className="text-3xl font-bold text-center mb-2">Conflict Analysis Map Project</h1>
      
      {/* The main content row */}
      <div className="flex flex-row flex-grow overflow-hidden">
        {/* Left side: the map, e.g. 2/3 of the width */}
        <div className="w-2/3 h-full">
          <MapView />
        </div>

        {/* Right side: a dashboard area for charts, stats, etc. */}
        <div className="w-1/3 h-full bg-white dark:bg-gray-800 overflow-auto p-2">
          <p className="font-semibold mb-2">Dashboard Components</p>
          {/* place future charts or tables here */}
          <div className="space-y-4">
            <div>Chart #1</div>
            <div>Chart #2</div>
          </div>
        </div>
      </div>
    </div>
  );
}


export default App;