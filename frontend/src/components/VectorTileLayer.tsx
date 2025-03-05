import React, { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

interface VectorTileLayerProps {
  containerId: string;
}

const VectorTileLayer: React.FC<VectorTileLayerProps> = ({ containerId }) => {
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<string>("all");
  const [debugInfo, setDebugInfo] = useState<string>("");
  const [mapHeight, setMapHeight] = useState<string>("100%");
  const [tileServerUrl, setTileServerUrl] = useState<string>("");
  const [tileTestResults, setTileTestResults] = useState<string>("");

  // Helper for debugging
  const addDebug = (msg: string) => {
    console.log(msg);
    setDebugInfo(prev => `${prev}\n${msg}`);
  };

  // Initialize map
  useEffect(() => {
    // Force map container to have explicit height and width
    setMapHeight("600px");
    
    // Make sure the map container element exists and has dimensions
    const container = document.getElementById(containerId);
    if (!container) {
      console.error(`Map container with ID "${containerId}" not found`);
      addDebug(`ERROR: Map container with ID "${containerId}" not found`);
      return;
    }
    
    // Set explicit styles to ensure visibility
    container.style.width = "100%";
    container.style.height = "600px";
    container.style.background = "#e0e0e0"; // Light gray background to see if container is rendering
    
    addDebug(`Map container dimensions: ${container.clientWidth}x${container.clientHeight}px`);

    // Determine the correct Martin URL based on environment
    const hostname = window.location.hostname;
    
    // Set tile server URL based on environment
    let martinUrlBase: string;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      // When accessing from browser on host machine
      martinUrlBase = "http://localhost:3001";
      addDebug(`Running in local mode, using Martin URL: ${martinUrlBase}`);
    } else {
      // When running inside Docker network, use the service name
      martinUrlBase = "http://martin:3000";
      addDebug(`Running in Docker network mode, using Martin URL: ${martinUrlBase}`);
    }

    setTileServerUrl(martinUrlBase);
    addDebug(`Initializing map with Martin URL: ${martinUrlBase}`);

    // Create map with a simplified style first to debug
    addDebug("Creating map instance...");
    const map = new maplibregl.Map({
      container: containerId,
      style: {
        version: 8,
        sources: {
          // OSM raster tiles
          "osm": {
            type: "raster",
            tiles: ["https://a.tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          }
        },
        layers: [
          // Simple background
          {
            id: "background",
            type: "background",
            paint: { "background-color": "#e0e0e0" }
          },
          // OSM base layer
          {
            id: "osm-tiles",
            type: "raster",
            source: "osm",
            minzoom: 0,
            maxzoom: 19
          }
        ]
      },
      center: [0, 0], // Start with a world view
      zoom: 1,
      preserveDrawingBuffer: true, // May help with rendering issues
    });
    
    addDebug("Map instance created");
    
    // Add specific error handling for OSM tiles
    map.on('data', (e) => {
      if (e.sourceId === 'osm' && e.isSourceLoaded) {
        addDebug("✅ OSM base tiles loaded successfully");
      }
    });

    // Add navigation controls
    try {
      map.addControl(new maplibregl.NavigationControl(), 'top-right');
      addDebug("Added navigation controls");
    } catch (err) {
      addDebug(`Error adding navigation controls: ${err.message}`);
    }

    // Add scale
    map.addControl(new maplibregl.ScaleControl({
      maxWidth: 100,
      unit: 'metric'
    }), 'bottom-left');

    // Add current coordinates display
    map.on('mousemove', (e) => {
      const coords = document.getElementById('coords');
      if (coords) {
        coords.innerHTML = `
          Lng: ${e.lngLat.lng.toFixed(4)}, 
          Lat: ${e.lngLat.lat.toFixed(4)}, 
          Zoom: ${map.getZoom().toFixed(2)}
        `;
      }
    });

    // Error handling
    map.on('error', (e) => {
      console.error('Map error:', e.error);
      addDebug(`Map error: ${e.error?.message || JSON.stringify(e.error)}`);
    });

    // Once the map is loaded, add the data sources and layers
    map.on('load', () => {
      addDebug("Map base style loaded successfully");

      // Inspect the vector tile structure to debug the source-layer name
      const inspectVectorTile = async () => {
        try {
          addDebug("Inspecting vector tile structure...");
          
          // Use a more targeted tile that might have data (Africa)
          const url = `${martinUrlBase}/public.recent_conflicts/4/8/8.pbf`;
          
          const response = await fetch(url);
          if (!response.ok) {
            addDebug(`❌ Failed to fetch tile: ${response.status}`);
            return;
          }
          
          const arrayBuffer = await response.arrayBuffer();
          
          // Use maplibregl's own VectorTile parser (if available)
          try {
            // This is a more direct diagnostic approach
            addDebug(`Vector tile size: ${arrayBuffer.byteLength} bytes`);
            
            // Log the first few bytes for inspection
            const dataView = new DataView(arrayBuffer);
            let hexDump = "First 16 bytes: ";
            for (let i = 0; i < Math.min(16, arrayBuffer.byteLength); i++) {
              hexDump += dataView.getUint8(i).toString(16).padStart(2, '0') + ' ';
            }
            addDebug(hexDump);
            
            // This would help determine if the tile seems valid
            addDebug("Vector tile seems valid, now trying to render");
          } catch (e) {
            addDebug(`Error inspecting tile: ${e.message}`);
          }
        } catch (e) {
          addDebug(`Error in tile inspection: ${e.message}`);
        }
      };
      
      // Test multiple tile requests to find data
      const testDirectFetch = async () => {
        try {
          // Try to fetch tiles from various areas that might have conflict data
          const urls = [
            // Africa tiles
            `${martinUrlBase}/public.recent_conflicts/4/8/8.pbf`,
            // Middle East tiles 
            `${martinUrlBase}/public.recent_conflicts/5/19/12.pbf`,
            // Try another area in Africa
            `${martinUrlBase}/public.recent_conflicts/5/17/16.pbf`,
          ];
          
          for (const url of urls) {
            addDebug(`Testing direct fetch to: ${url}`);
            try {
              const response = await fetch(url);
              const status = response.status;
              const contentType = response.headers.get('content-type');
              
              if (response.ok) {
                const blob = await response.blob();
                addDebug(`✅ Successful response from ${url}: Status ${status}, Type: ${contentType}, Size: ${blob.size} bytes`);
              } else {
                addDebug(`❌ Error response from ${url}: Status ${status}`);
              }
            } catch (err) {
              addDebug(`❌ Fetch error for ${url}: ${err.message}`);
            }
          }
        } catch (err) {
          addDebug(`Error in test fetch: ${err.message}`);
        }
      };
      
      // Run the direct fetch test
      testDirectFetch();

      // Add vector tile sources, but with restrictions on zoom levels to manage tile size
      try {
        // Recent conflicts source - only use this for higher zoom levels since it's smaller
        map.addSource("recent-conflicts", {
          type: "vector",
          tiles: [`${martinUrlBase}/public.recent_conflicts/{z}/{x}/{y}.pbf`],
          minzoom: 4,  // Set higher minimum zoom to avoid loading too much data
          maxzoom: 15
        });

        // Add a way to diagnose vector tile loading
        map.on('sourcedata', (e) => {
          if (e.isSourceLoaded && e.sourceId && typeof e.tile === 'object') {
            addDebug(`Source ${e.sourceId} loaded tile: ${JSON.stringify(e.tile || {})}`);
            
            // Try to get the source layer names directly from the maplibre tile
            if (e.sourceId === 'recent-conflicts') {
              try {
                const layers = map.getStyle().layers;
                const sourceLayers = layers
                  .filter(layer => layer.source === 'recent-conflicts')
                  .map(layer => layer['source-layer']);
                
                if (sourceLayers.length > 0) {
                  addDebug(`Source layers for recent-conflicts: ${sourceLayers.join(', ')}`);
                }
              } catch (err) {
                // Ignore errors
              }
            }
          }
        });
        
        // Add other sources with appropriate zoom constraints
        map.addSource("battles", {
          type: "vector", 
          tiles: [`${martinUrlBase}/public.battles/{z}/{x}/{y}.pbf`],
          minzoom: 4,
          maxzoom: 15
        });

        map.addSource("violence", {
          type: "vector",
          tiles: [`${martinUrlBase}/public.violence_against_civilians/{z}/{x}/{y}.pbf`],
          minzoom: 4,
          maxzoom: 15
        });

        map.addSource("high-fatality", {
          type: "vector",
          tiles: [`${martinUrlBase}/public.high_fatality_events/{z}/{x}/{y}.pbf`],
          // High fatality events could be visible at slightly lower zoom since there are fewer of them
          minzoom: 3,
          maxzoom: 15
        });

        addDebug("All vector sources added successfully");
      } catch (error) {
        console.error("Error adding vector sources:", error);
        addDebug(`Error adding sources: ${error.message}`);
      }

      // Add conflict layers
      try {
        // Recent conflicts layer
                  // Run the vector tile inspector
          inspectVectorTile();
          
          // Based on the vector tile inspection, Martin is using fully qualified names
          // including schema prefix as the source-layer name
          map.addLayer({
          id: "recent-conflicts-layer",
          type: "circle",
          source: "recent-conflicts",
          "source-layer": "public.recent_conflicts", // Include schema prefix
          minzoom: 4,  // Increased to match source minzoom
          paint: {
            "circle-radius": [
              "interpolate", ["linear"], ["zoom"],
              3, 1.5,  // Start smaller at low zoom
              8, ["interpolate", ["linear"], ["get", "fatalities"],
                 0, 3,
                 10, 5,
                 100, 10]
            ],
            "circle-color": [
              "match",
              ["get", "event_type"],
              "Battle", "#ff4d4d",
              "Explosions/Remote violence", "#ff9900",
              "Violence against civilians", "#cc0000",
              "Protests", "#ffcc00",
              "Riots", "#ff6600",
              "Strategic developments", "#9966ff",
              "#808080" // default color
            ],
            "circle-opacity": 0.7,
            "circle-stroke-width": 0.5,
            "circle-stroke-color": "#ffffff"
          },
          layout: {
            "visibility": "visible"
          }
        });

        // Battles layer
        map.addLayer({
          id: "battles-layer",
          type: "circle",
          source: "battles",
          "source-layer": "public.battles",
          minzoom: 4,
          paint: {
            "circle-radius": [
              "interpolate", ["linear"], ["zoom"],
              3, 1.5,
              8, ["interpolate", ["linear"], ["get", "fatalities"],
                 0, 3,
                 10, 5,
                 100, 10]
            ],
            "circle-color": "#ff4d4d",
            "circle-opacity": 0.7,
            "circle-stroke-width": 0.5,
            "circle-stroke-color": "#ffffff"
          },
          layout: {
            "visibility": "none"
          }
        });

        // Violence layer
        map.addLayer({
          id: "violence-layer",
          type: "circle",
          source: "violence",
          "source-layer": "public.violence_against_civilians",
          minzoom: 4,
          paint: {
            "circle-radius": [
              "interpolate", ["linear"], ["zoom"],
              3, 1.5,
              8, ["interpolate", ["linear"], ["get", "fatalities"],
                 0, 3,
                 10, 5,
                 100, 10]
            ],
            "circle-color": "#cc0000",
            "circle-opacity": 0.7,
            "circle-stroke-width": 0.5,
            "circle-stroke-color": "#ffffff"
          },
          layout: {
            "visibility": "none"
          }
        });

        // High fatality layer
        map.addLayer({
          id: "high-fatality-layer",
          type: "circle",
          source: "high-fatality",
          "source-layer": "public.high_fatality_events",
          minzoom: 3,
          paint: {
            "circle-radius": [
              "interpolate", ["linear"], ["zoom"],
              3, 2,
              8, ["interpolate", ["linear"], ["get", "fatalities"],
                 10, 5,
                 50, 8,
                 100, 12]
            ],
            "circle-color": [
              "interpolate", ["linear"], ["get", "fatalities"],
              10, "#ffcc00",
              50, "#ff6600",
              100, "#ff0000"
            ],
            "circle-opacity": 0.7,
            "circle-stroke-width": 0.5,
            "circle-stroke-color": "#ffffff"
          },
          layout: {
            "visibility": "none"
          }
        });
        
        addDebug("Added conflict layers");
      } catch (error) {
        addDebug(`Error adding conflict layers: ${error.message}`);
      }

      // For all conflict layers
      const conflictLayers = [
        "recent-conflicts-layer",
        "battles-layer",
        "violence-layer",
        "high-fatality-layer"
      ];

      conflictLayers.forEach(layerId => {
        map.on("click", layerId, (e) => {
          if (e.features && e.features.length > 0) {
            const props = e.features[0].properties;
            const eventDate = props.event_date ? new Date(props.event_date).toLocaleDateString() : "Unknown";
            
            addDebug(`Conflict event clicked: ${props.location || "Unknown location"}`);
            
            new maplibregl.Popup()
              .setLngLat(e.lngLat)
              .setHTML(`
                <div class="popup-content">
                  <h3>${props.location || "Unknown location"}</h3>
                  <p><b>Type:</b> ${props.event_type || props.sub_event_type || "Unknown"}</p>
                  <p><b>Date:</b> ${eventDate}</p>
                  <p><b>Fatalities:</b> ${props.fatalities || 0}</p>
                  <p><b>Actors:</b> ${props.actor1 || "Unknown"}${props.actor2 ? ` vs ${props.actor2}` : ''}</p>
                </div>
              `)
              .addTo(map);
          }
        });

        // Cursor styling
        map.on("mouseenter", layerId, () => {
          map.getCanvas().style.cursor = "pointer";
        });
        
        map.on("mouseleave", layerId, () => {
          map.getCanvas().style.cursor = "";
        });
      });

      // Check for features at current view
      const checkForFeatures = () => {
        try {
          const sources = ["recent-conflicts", "battles", "violence", "high-fatality"];
          const zoom = map.getZoom();
          addDebug(`Checking for features at zoom level ${zoom.toFixed(2)}`);
          
          let foundFeatures = false;
          
          sources.forEach(sourceId => {
            if (map.getSource(sourceId)) {
              // Determine appropriate minimum zoom for this source
              const minZoom = sourceId === "high-fatality" ? 3 : 4;
              
              // First check if the zoom level is appropriate for this source
              if (zoom < minZoom) {
                addDebug(`ℹ️ Current zoom (${zoom.toFixed(2)}) too low for ${sourceId} (min zoom: ${minZoom})`);
                return;
              }
              
              // Determine the correct source-layer name (including schema)
              const sourceLayerName = sourceId === "recent-conflicts" ? "public.recent_conflicts" :
                                     sourceId === "battles" ? "public.battles" :
                                     sourceId === "violence" ? "public.violence_against_civilians" :
                                     "public.high_fatality_events";
              
              // Check rendered features first
              const features = map.queryRenderedFeatures({ layers: [sourceId + "-layer"] });
              if (features && features.length > 0) {
                foundFeatures = true;
                addDebug(`✅ Layer ${sourceId}-layer has ${features.length} rendered features`);
              } else {
                // If no rendered features, check if any source features are available
                try {
                  const sourceFeatures = map.querySourceFeatures(sourceId, {
                    sourceLayer: sourceLayerName
                  });
                  if (sourceFeatures && sourceFeatures.length > 0) {
                    addDebug(`ℹ️ Source ${sourceId} has ${sourceFeatures.length} features loaded but none rendered`);
                    // The data is there but not rendering - could be due to:
                    // 1. Layer visibility setting
                    // 2. Style rules filtering them out
                    // 3. Features outside current viewport
                    
                    // Check layer visibility
                    const layerId = sourceId + "-layer";
                    const visibility = map.getLayoutProperty(layerId, 'visibility');
                    addDebug(`  - Layer ${layerId} visibility: ${visibility}`);
                    
                    // Sample some features to check their properties
                    const sampleCount = Math.min(3, sourceFeatures.length);
                    addDebug(`  - Sample of ${sampleCount} features from source:`);
                    for (let i = 0; i < sampleCount; i++) {
                      const feature = sourceFeatures[i];
                      addDebug(`    Feature ${i+1}: ${JSON.stringify(feature.properties).substr(0, 100)}...`);
                    }
                  } else {
                    addDebug(`⚠️ Source ${sourceId} has no features loaded for current view`);
                    // This could mean:
                    // 1. No data exists for this area
                    // 2. Tile loading error
                    // 3. Invalid source configuration
                  }
                } catch (err) {
                  addDebug(`Error querying source features: ${err.message}`);
                }
              }
            }
          });
          
          // Continue checking if no features found and zoom level is appropriate
          if (!foundFeatures && zoom >= 3) {
            setTimeout(checkForFeatures, 5000);
          }
        } catch (e) {
          addDebug(`Error checking features: ${e.message}`);
        }
      };
      
      // Start checking for features after a delay
      setTimeout(checkForFeatures, 2000);
    });

    // Store the map reference
    mapRef.current = map;

    // Cleanup function
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [containerId]);

  // Function to update layer visibility
  const updateLayerVisibility = () => {
    if (!mapRef.current) return;

    const map = mapRef.current;

    try {
      // Check if layers are available
      if (!map.getLayer('recent-conflicts-layer')) {
        addDebug("Layers not fully loaded yet, retrying later...");
        setTimeout(updateLayerVisibility, 1000);
        return;
      }
      
      // Hide all event layers first
      map.setLayoutProperty("recent-conflicts-layer", "visibility", "none");
      map.setLayoutProperty("battles-layer", "visibility", "none");
      map.setLayoutProperty("violence-layer", "visibility", "none");
      map.setLayoutProperty("high-fatality-layer", "visibility", "none");

      // Show only the selected layer
      switch (selectedFilter) {
        case "all":
          map.setLayoutProperty("recent-conflicts-layer", "visibility", "visible");
          break;
        case "battles":
          map.setLayoutProperty("battles-layer", "visibility", "visible");
          break;
        case "violence":
          map.setLayoutProperty("violence-layer", "visibility", "visible");
          break;
        case "high-fatality":
          map.setLayoutProperty("high-fatality-layer", "visibility", "visible");
          break;
        default:
          map.setLayoutProperty("recent-conflicts-layer", "visibility", "visible");
      }
      addDebug(`Layer visibility updated to: ${selectedFilter}`);
    } catch (err) {
      console.warn("Unable to update layer visibility:", err);
      addDebug(`Error updating visibility: ${err.message}`);
    }
  };

  // Update layer visibility when filter changes
  useEffect(() => {
    if (!mapRef.current) return;
    
    const map = mapRef.current;
    
    // Check if the map is fully loaded
    if (!map.loaded()) {
      const checkMapLoaded = setInterval(() => {
        if (map.loaded()) {
          clearInterval(checkMapLoaded);
          updateLayerVisibility();
        }
      }, 200);
      return;
    }

    updateLayerVisibility();
  }, [selectedFilter]);
  
  // Function to test Martin tile server directly
  const testMartinServer = async () => {
    try {
      setTileTestResults("Testing Martin server (this may take a moment)...");
      
      // Test with a variety of zoom levels and coordinates that might contain data
      const testUrls = [
        // Africa (zoom 4)
        `${tileServerUrl}/public.recent_conflicts/4/8/8.pbf`,
        // Middle East (zoom 5)
        `${tileServerUrl}/public.recent_conflicts/5/19/12.pbf`,
        // Test battles in Africa (zoom 4)
        `${tileServerUrl}/public.battles/4/8/8.pbf`,
        // Test high fatality at zoom 3 (should have fewer events)
        `${tileServerUrl}/public.high_fatality_events/3/4/4.pbf`
      ];
      
      let results = "";
      
      for (const url of testUrls) {
        try {
          const startTime = Date.now();
          const response = await fetch(url);
          const elapsed = Date.now() - startTime;
          
          if (response.ok) {
            const blob = await response.blob();
            results += `✅ ${url}: Status ${response.status}, Size: ${blob.size} bytes, Time: ${elapsed}ms\n`;
          } else {
            results += `❌ ${url}: Status ${response.status}, Time: ${elapsed}ms\n`;
          }
        } catch (err) {
          results += `❌ ${url}: Error - ${err.message}\n`;
        }
      }
      
      setTileTestResults(results);
    } catch (err) {
      setTileTestResults(`Error testing tile server: ${err.message}`);
    }
  };

  // Function to zoom to specific regions for testing
  const zoomToRegion = (region: string) => {
    if (!mapRef.current) return;
    
    let center: [number, number];
    let zoom: number;
    
    switch (region) {
      case "africa":
        center = [20, 0];
        zoom = 3.5; // Slightly higher zoom level to see data
        break;
      case "europe":
        center = [10, 50];
        zoom = 4;
        break;
      case "asia":
        center = [100, 30];
        zoom = 3.5;
        break;
      case "americas":
        center = [-80, 0];
        zoom = 3.5;
        break;
      case "middle-east":
        center = [45, 30];
        zoom = 4.5; // Higher zoom for more detail
        break;
      default:
        center = [0, 0];
        zoom = 2;
    }
    
    mapRef.current.flyTo({
      center,
      zoom,
      essential: true,
      duration: 1000
    });
  };

  // Function to force reload data at current view
  const reloadData = () => {
    if (!mapRef.current) return;
    
    addDebug("Manually forcing data reload...");
    
    // Get current view state
    const map = mapRef.current;
    const currentZoom = map.getZoom();
    const currentCenter = map.getCenter();
    
    // Force a slight movement to trigger tile reload
    map.flyTo({
      center: [currentCenter.lng + 0.0001, currentCenter.lat + 0.0001],
      zoom: currentZoom + 0.01,
      duration: 10,
      essential: true
    });
    
    // Then flyTo back to refresh the view
    setTimeout(() => {
      map.flyTo({
        center: [currentCenter.lng, currentCenter.lat],
        zoom: currentZoom,
        duration: 10,
        essential: true
      });
      
      // Check features after reload
      setTimeout(() => {
        try {
          const sources = ["recent-conflicts", "battles", "violence", "high-fatality"];
          sources.forEach(sourceId => {
            if (map.getSource(sourceId)) {
              const features = map.queryRenderedFeatures({ layers: [sourceId + "-layer"] });
              addDebug(`After reload: ${sourceId}-layer has ${features?.length || 0} rendered features`);
            }
          });
        } catch (e) {
          // Ignore errors
        }
      }, 500);
    }, 100);
  };

  return (
    <div className="relative w-full" style={{height: mapHeight, minHeight: "600px"}}>
      {/* Map container with fallback content */}
      <div 
        id={containerId} 
        className="w-full h-full relative" 
        style={{
          border: "1px solid #ccc",
          backgroundColor: "#f0f0f0"
        }}
      >
        <div className="absolute inset-0 flex items-center justify-center z-0 pointer-events-none">
          <p className="text-gray-500">Map should appear here...</p>
        </div>
      </div>
      
      {/* Coordinates display */}
      <div 
        id="coords" 
        className="absolute top-4 right-4 bg-white p-2 rounded shadow-lg z-10 text-xs"
      >
        Lng: 0.0000, Lat: 0.0000, Zoom: 0.00
      </div>
      
      {/* Filter controls */}
      <div className="absolute top-4 left-4 bg-white dark:bg-gray-800 p-2 rounded shadow-lg z-10">
        <div className="text-sm font-semibold mb-2">Event Types</div>
        <div className="flex flex-col space-y-1">
          <label className="flex items-center">
            <input
              type="radio"
              name="filter"
              value="all"
              checked={selectedFilter === "all"}
              onChange={() => setSelectedFilter("all")}
              className="mr-2"
            />
            <span>All Conflicts (Recent)</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              name="filter"
              value="battles"
              checked={selectedFilter === "battles"}
              onChange={() => setSelectedFilter("battles")}
              className="mr-2"
            />
            <span>Battles</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              name="filter"
              value="violence"
              checked={selectedFilter === "violence"}
              onChange={() => setSelectedFilter("violence")}
              className="mr-2"
            />
            <span>Violence against Civilians</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              name="filter"
              value="high-fatality"
              checked={selectedFilter === "high-fatality"}
              onChange={() => setSelectedFilter("high-fatality")}
              className="mr-2"
            />
            <span>High Fatality Events</span>
          </label>
        </div>
      </div>
      
      {/* Navigation helpers */}
      <div className="absolute bottom-20 left-4 bg-white p-2 rounded shadow-lg z-10">
        <div className="text-sm font-semibold mb-2">View Controls</div>
        <div className="grid grid-cols-2 gap-2">
          <button 
            className="bg-blue-500 hover:bg-blue-700 text-white text-xs font-bold py-1 px-2 rounded"
            onClick={() => zoomToRegion("world")}
          >
            World View
          </button>
          <button 
            className="bg-blue-500 hover:bg-blue-700 text-white text-xs font-bold py-1 px-2 rounded"
            onClick={() => zoomToRegion("africa")}
          >
            Africa
          </button>
          <button 
            className="bg-blue-500 hover:bg-blue-700 text-white text-xs font-bold py-1 px-2 rounded"
            onClick={() => zoomToRegion("middle-east")}
          >
            Middle East
          </button>
          <button 
            className="bg-blue-500 hover:bg-blue-700 text-white text-xs font-bold py-1 px-2 rounded"
            onClick={() => zoomToRegion("asia")}
          >
            Asia
          </button>
          {/* Add specific conflict hotspots for testing */}
          <button 
            className="bg-red-500 hover:bg-red-700 text-white text-xs font-bold py-1 px-2 rounded"
            onClick={() => zoomToRegion("somalia")}
          >
            Somalia
          </button>
          <button 
            className="bg-red-500 hover:bg-red-700 text-white text-xs font-bold py-1 px-2 rounded"
            onClick={() => zoomToRegion("syria")}
          >
            Syria
          </button>
        </div>
      </div>
      
      {/* Test buttons */}
      <div className="absolute bottom-4 left-4 bg-white p-2 rounded shadow-lg z-10">
        <div className="flex flex-col space-y-2">
          <div className="text-xs font-bold mb-1">Note: Data only visible at zoom level 4+ in conflict areas</div>
          <button 
            className="bg-red-500 hover:bg-red-700 text-white text-xs font-bold py-1 px-2 rounded"
            onClick={testMartinServer}
          >
            Test Martin Server
          </button>
          <button 
            className="bg-green-500 hover:bg-green-700 text-white text-xs font-bold py-1 px-2 rounded"
            onClick={reloadData}
          >
            Force Reload Data
          </button>
          <button 
            className="bg-purple-500 hover:bg-purple-700 text-white text-xs font-bold py-1 px-2 rounded"
            onClick={() => {
              if (mapRef.current) {
                // Try to add a simple marker to test rendering
                addDebug("Adding test marker at current center...");
                const center = mapRef.current.getCenter();
                new maplibregl.Marker({color: "#FF0000"})
                  .setLngLat([center.lng, center.lat])
                  .addTo(mapRef.current);
              }
            }}
          >
            Add Test Marker
          </button>
        </div>
        {tileTestResults && (
          <div className="mt-2 text-xs whitespace-pre-wrap max-h-32 overflow-auto">
            {tileTestResults}
          </div>
        )}
      </div>
      
      {/* Debug info panel */}
      <div className="absolute bottom-4 right-4 bg-white p-2 rounded shadow-lg z-10 max-w-sm max-h-80 overflow-auto text-xs">
        <div className="font-bold mb-1">Debug Info:</div>
        <div>Martin URL: {tileServerUrl}</div>
        <pre className="whitespace-pre-wrap">{debugInfo}</pre>
      </div>
    </div>
  );
};

export default VectorTileLayer;