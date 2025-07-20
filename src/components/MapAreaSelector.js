import React, { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import styled from 'styled-components';
import StreetView3D from './StreetView3D';

const MapContainer = styled.div`
  width: 100%;
  height: calc(100vh - 60px);
  position: relative;
`;

const LoadingOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  font-size: 18px;
  color: #333;
`;

const SelectionOverlay = styled.div`
  position: absolute;
  top: 10px;
  left: 10px;
  background: rgba(0, 123, 255, 0.9);
  color: white;
  padding: 10px 15px;
  border-radius: 5px;
  font-size: 14px;
  z-index: 1000;
  pointer-events: none;
`;

const HeatmapToggle = styled.div`
  position: absolute;
  top: 10px;
  right: 10px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  padding: 12px;
  z-index: 1000;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  font-weight: 500;
`;

const ToggleButton = styled.button`
  background: ${props => props.active ? '#007bff' : '#6c757d'};
  color: white;
  border: none;
  border-radius: 4px;
  padding: 6px 12px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${props => props.active ? '#0056b3' : '#545b62'};
    transform: translateY(-1px);
  }
`;

const UhiLegend = styled.div`
  position: absolute;
  bottom: 20px;
  left: 20px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 8px;
  padding: 15px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  z-index: 1000;
  min-width: 180px;
`;

const LegendTitle = styled.h4`
  margin: 0 0 10px 0;
  color: #333;
  font-size: 14px;
  font-weight: 600;
`;

const LegendItem = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 6px;
  font-size: 11px;
`;

const LegendColor = styled.div`
  width: 16px;
  height: 16px;
  border-radius: 2px;
  margin-right: 8px;
`;

const StatisticsPanel = styled.div`
  position: absolute;
  top: 80px;
  right: 10px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  padding: 15px;
  z-index: 1000;
  min-width: 220px;
  max-width: 280px;
  border-left: 4px solid #007bff;
`;

const StatsTitle = styled.h3`
  margin: 0 0 12px 0;
  color: #333;
  font-size: 16px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 12px;
`;

const StatItem = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px;
  background: #f8f9fa;
  border-radius: 6px;
  border: 1px solid #e9ecef;
`;

const StatValue = styled.span`
  font-size: 18px;
  font-weight: 700;
  color: #007bff;
`;

const StatLabel = styled.span`
  font-size: 11px;
  color: #6c757d;
  text-align: center;
  margin-top: 2px;
`;

const CellCount = styled.div`
  background: #e3f2fd;
  padding: 8px 12px;
  border-radius: 6px;
  text-align: center;
  font-size: 13px;
  color: #1976d2;
  font-weight: 500;
`;

const ResetButton = styled.button`
  background: #dc3545;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 12px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  width: 100%;
  margin-top: 8px;

  &:hover {
    background: #c82333;
    transform: translateY(-1px);
  }
`;

const View3DButton = styled.button`
  background: #28a745;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 12px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  width: 100%;
  margin-top: 8px;

  &:hover {
    background: #218838;
    transform: translateY(-1px);
  }
`;



const MapAreaSelector = ({ onAreaSelected, isSelecting, selectedArea, onClearSelection }) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);

  const selectedShapeRef = useRef(null);
  const uhiPolygonsRef = useRef([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showUhiGrid, setShowUhiGrid] = useState(true);
  const [selectedAreaStats, setSelectedAreaStats] = useState(null);
  const [show3DVisualization, setShow3DVisualization] = useState(false);

  // Color function for UHI intensity
  const getColor = (weight) => {
    return weight > 9 ? '#800026' :
           weight > 8 ? '#BD0026' :
           weight > 7 ? '#E31A1C' :
           weight > 6 ? '#FC4E2A' :
           weight > 5 ? '#FD8D3C' :
           weight > 4 ? '#FEB24C' :
           weight > 3 ? '#FED976' :
           weight > 2 ? '#FFEDA0' :
           weight > 1 ? '#FFFFCC' :
                        '#FFFFFF';
  };

  // Generate UHI grid data for Toronto
  const generateUhiGrid = () => {
    const gridData = [];
    
    // Define the bounds of Greater Toronto Area
    const northBound = 43.85; // North York
    const southBound = 43.58; // Lake Ontario
    const eastBound = -79.15; // Scarborough
    const westBound = -79.55; // Etobicoke
    
    // Grid cell size (approximately 0.02 degrees = ~2km)
    const cellSize = 0.02;
    
    // Generate grid cells covering the entire GTA
    for (let lat = southBound; lat < northBound; lat += cellSize) {
      for (let lng = westBound; lng < eastBound; lng += cellSize) {
        const cellCenter = { lat: lat + cellSize/2, lng: lng + cellSize/2 };
        
        // Calculate UHI intensity based on location
        const intensity = calculateUhiIntensity(cellCenter);
        
        if (intensity > 0) { // Only add cells with some UHI effect
          gridData.push({
            paths: [
              { lat: lat, lng: lng },
              { lat: lat, lng: lng + cellSize },
              { lat: lat + cellSize, lng: lng + cellSize },
              { lat: lat + cellSize, lng: lng }
            ],
            intensity: intensity,
            name: getAreaName(cellCenter)
          });
        }
      }
    }

    return gridData;
  };

  // Calculate UHI intensity based on location
  const calculateUhiIntensity = (center) => {
    const { lat, lng } = center;
    
    // Downtown Toronto - High UHI intensity
    if (lat >= 43.64 && lat <= 43.66 && lng >= -79.40 && lng <= -79.37) {
      return 5.5; // Financial District
    }
    if (lat >= 43.64 && lat <= 43.66 && lng >= -79.37 && lng <= -79.34) {
      return 5.2; // Downtown Core
    }
    if (lat >= 43.64 && lat <= 43.66 && lng >= -79.40 && lng <= -79.37) {
      return 4.8; // Entertainment District
    }
    
    // Midtown areas
    if (lat >= 43.66 && lat <= 43.68 && lng >= -79.40 && lng <= -79.37) {
      return 4.2; // Yorkville
    }
    if (lat >= 43.66 && lat <= 43.68 && lng >= -79.37 && lng <= -79.34) {
      return 3.9; // Midtown
    }
    
    // North York
    if (lat >= 43.68 && lat <= 43.75 && lng >= -79.45 && lng <= -79.35) {
      return 3.0 + Math.random() * 1.5; // 3.0-4.5°C
    }
    
    // Scarborough
    if (lat >= 43.64 && lat <= 43.75 && lng >= -79.25 && lng <= -79.15) {
      return 2.5 + Math.random() * 1.0; // 2.5-3.5°C
    }
    
    // Etobicoke
    if (lat >= 43.64 && lat <= 43.75 && lng >= -79.55 && lng <= -79.45) {
      return 2.0 + Math.random() * 1.5; // 2.0-3.5°C
    }
    
    // East York
    if (lat >= 43.64 && lat <= 43.68 && lng >= -79.34 && lng <= -79.25) {
      return 2.8 + Math.random() * 0.8; // 2.8-3.6°C
    }
    
    // Waterfront areas - Lower UHI
    if (lat >= 43.58 && lat <= 43.64 && lng >= -79.40 && lng <= -79.25) {
      return 0.5 + Math.random() * 1.0; // 0.5-1.5°C
    }
    
    // Parks and green spaces
    if (lat >= 43.66 && lat <= 43.68 && lng >= -79.40 && lng <= -79.35) {
      return 1.5 + Math.random() * 0.8; // 1.5-2.3°C
    }
    
    // Suburban areas - Moderate UHI
    if (lat >= 43.75 && lat <= 43.85 && lng >= -79.55 && lng <= -79.15) {
      return 1.8 + Math.random() * 1.2; // 1.8-3.0°C
    }
    
    // Default for other areas
    return 1.0 + Math.random() * 1.5; // 1.0-2.5°C
  };

  // Get area name based on coordinates
  const getAreaName = (center) => {
    const { lat, lng } = center;
    
    if (lat >= 43.64 && lat <= 43.66 && lng >= -79.40 && lng <= -79.37) return "Financial District";
    if (lat >= 43.64 && lat <= 43.66 && lng >= -79.37 && lng <= -79.34) return "Downtown Core";
    if (lat >= 43.64 && lat <= 43.66 && lng >= -79.40 && lng <= -79.37) return "Entertainment District";
    if (lat >= 43.66 && lat <= 43.68 && lng >= -79.40 && lng <= -79.37) return "Yorkville";
    if (lat >= 43.66 && lat <= 43.68 && lng >= -79.37 && lng <= -79.34) return "Midtown";
    if (lat >= 43.68 && lat <= 43.75 && lng >= -79.45 && lng <= -79.35) return "North York";
    if (lat >= 43.64 && lat <= 43.75 && lng >= -79.25 && lng <= -79.15) return "Scarborough";
    if (lat >= 43.64 && lat <= 43.75 && lng >= -79.55 && lng <= -79.45) return "Etobicoke";
    if (lat >= 43.64 && lat <= 43.68 && lng >= -79.34 && lng <= -79.25) return "East York";
    if (lat >= 43.58 && lat <= 43.64 && lng >= -79.40 && lng <= -79.25) return "Waterfront";
    if (lat >= 43.75 && lat <= 43.85 && lng >= -79.55 && lng <= -79.15) return "Suburban GTA";
    
    return "Toronto Area";
  };



  useEffect(() => {
    const initMap = async () => {
      try {
        const loader = new Loader({
          apiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY || 'YOUR_API_KEY_HERE',
          version: 'weekly',
          libraries: ['drawing', 'geometry']
        });

        const google = await loader.load();
        
        // Initialize map centered on Toronto
        const map = new google.maps.Map(mapRef.current, {
          center: { lat: 43.6532, lng: -79.3832 }, // Toronto coordinates
          zoom: 12,
          mapTypeId: google.maps.MapTypeId.ROADMAP,
          streetViewControl: false,
          fullscreenControl: true,
          mapTypeControl: true,
          zoomControl: true
        });

        mapInstanceRef.current = map;

        // Create UHI grid polygons
        const gridData = generateUhiGrid();
        const polygons = [];

        gridData.forEach((cell, index) => {
          const polygon = new google.maps.Polygon({
            paths: cell.paths,
            strokeWeight: 0,
            fillColor: getColor(cell.intensity),
            fillOpacity: 0.4,
            clickable: false, // Make polygons non-clickable so clicks pass through to map
            map: map,
            title: `${cell.name}: Feels ${cell.intensity.toFixed(1)}°C hotter than rural average`
          });

          // Add hover event for popup
          polygon.addListener('mouseover', () => {
            polygon.setOptions({ fillOpacity: 0.6 });
          });

          polygon.addListener('mouseout', () => {
            polygon.setOptions({ fillOpacity: 0.4 });
          });

          polygons.push(polygon);
        });

        uhiPolygonsRef.current = polygons;

        // Add click listener for single point selection - ALWAYS handle clicks
        map.addListener('click', (event) => {
          console.log('=== MAP CLICK EVENT ===', isSelecting, event.latLng.lat(), event.latLng.lng());
          // Always handle click for testing
          handlePointClick(event.latLng);
        });

        setIsLoading(false);
      } catch (err) {
        setError('Failed to load Google Maps. Please check your API key.');
        setIsLoading(false);
      }
    };

    initMap();
  }, []);

  // Toggle UHI grid visibility
  useEffect(() => {
    if (uhiPolygonsRef.current) {
      uhiPolygonsRef.current.forEach(polygon => {
        if (showUhiGrid) {
          polygon.setMap(mapInstanceRef.current);
        } else {
          polygon.setMap(null);
        }
      });
    }
  }, [showUhiGrid]);

  useEffect(() => {
    if (mapInstanceRef.current && isSelecting) {
      // Clear any existing selection when starting new selection
      if (selectedShapeRef.current) {
        selectedShapeRef.current.setMap(null);
        selectedShapeRef.current = null;
      }
      setSelectedAreaStats(null);
    }
  }, [isSelecting]);

  const handlePointClick = (latLng) => {
    console.log('=== POINT CLICK HANDLED ===', latLng.lat(), latLng.lng());
    
    // Clear previous selection
    if (selectedShapeRef.current) {
      selectedShapeRef.current.setMap(null);
    }

    try {
      // Create a simple marker for the selected point
      const marker = new google.maps.Marker({
        position: latLng,
        map: mapInstanceRef.current,
        title: 'Selected Point',
        label: '📍',
        animation: google.maps.Animation.DROP
      });

      selectedShapeRef.current = marker;
      console.log('Marker created successfully');

      // Get UHI data for this point
      const gridData = generateUhiGrid();
      const nearestCell = findNearestGridCell(latLng, gridData);
      
      const pointData = {
        lat: latLng.lat(),
        lng: latLng.lng(),
        uhiIntensity: nearestCell ? nearestCell.intensity.toFixed(1) : '0.0',
        areaName: nearestCell ? nearestCell.name : 'Unknown Area'
      };

      // Create simple statistics for the point
      const statistics = {
        average: pointData.uhiIntensity,
        maximum: pointData.uhiIntensity,
        minimum: pointData.uhiIntensity,
        cellCount: 1
      };

      setSelectedAreaStats(statistics);
      console.log('Point data set:', pointData);

      // Call the callback with point data
      onAreaSelected({
        type: 'point',
        coordinates: [{ lat: latLng.lat(), lng: latLng.lng() }],
        point: pointData,
        statistics: statistics
      });
    } catch (error) {
      console.error('Error in handlePointClick:', error);
    }
  };



  // Find the nearest grid cell to a point
  const findNearestGridCell = (latLng, gridData) => {
    let nearestCell = null;
    let minDistance = Infinity;

    gridData.forEach(cell => {
      const cellCenter = {
        lat: (cell.paths[0].lat + cell.paths[2].lat) / 2,
        lng: (cell.paths[0].lng + cell.paths[2].lng) / 2
      };
      
      const distance = Math.sqrt(
        Math.pow(latLng.lat() - cellCenter.lat, 2) + 
        Math.pow(latLng.lng() - cellCenter.lng, 2)
      );
      
      if (distance < minDistance) {
        minDistance = distance;
        nearestCell = cell;
      }
    });

    return nearestCell;
  };



  const clearCurrentSelection = () => {
    if (selectedShapeRef.current) {
      selectedShapeRef.current.setMap(null);
      selectedShapeRef.current = null;
    }
    setSelectedAreaStats(null);
    setShow3DVisualization(false);
  };

  // Expose clear function to parent component
  useEffect(() => {
    if (onClearSelection) {
      onClearSelection(clearCurrentSelection);
    }
  }, []); // Remove onClearSelection dependency to prevent infinite loop

  // Add keyboard shortcut for clearing selection (Escape key)
  useEffect(() => {
    const handleKeyPress = (event) => {
      if (event.key === 'Escape' && selectedShapeRef.current) {
        clearCurrentSelection();
        // Notify parent component
        if (onAreaSelected) {
          onAreaSelected(null);
        }
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, []); // Remove onAreaSelected dependency to prevent infinite loop

  if (error) {
    return (
      <MapContainer>
        <LoadingOverlay>
          <div style={{ textAlign: 'center' }}>
            <h3>Error</h3>
            <p>{error}</p>
            <p>Please add your Google Maps API key to the environment variables.</p>
          </div>
        </LoadingOverlay>
      </MapContainer>
    );
  }

  return (
    <MapContainer>
      {isLoading && (
        <LoadingOverlay>
          <div>Loading Google Maps...</div>
        </LoadingOverlay>
      )}
      
      <HeatmapToggle>
        <span>🌡️ UHI Grid:</span>
        <ToggleButton 
          active={showUhiGrid ? "true" : "false"}
          onClick={() => setShowUhiGrid(!showUhiGrid)}
        >
          {showUhiGrid ? 'ON' : 'OFF'}
        </ToggleButton>
      </HeatmapToggle>

      {showUhiGrid && (
        <UhiLegend>
          <LegendTitle>🌡️ UHI Intensity (°C)</LegendTitle>
          <LegendItem>
            <LegendColor style={{ background: '#FFFFFF' }}></LegendColor>
            <span>0-1°C hotter</span>
          </LegendItem>
          <LegendItem>
            <LegendColor style={{ background: '#FFFFCC' }}></LegendColor>
            <span>1-2°C hotter</span>
          </LegendItem>
          <LegendItem>
            <LegendColor style={{ background: '#FFEDA0' }}></LegendColor>
            <span>2-3°C hotter</span>
          </LegendItem>
          <LegendItem>
            <LegendColor style={{ background: '#FED976' }}></LegendColor>
            <span>3-4°C hotter</span>
          </LegendItem>
          <LegendItem>
            <LegendColor style={{ background: '#FEB24C' }}></LegendColor>
            <span>4-5°C hotter</span>
          </LegendItem>
          <LegendItem>
            <LegendColor style={{ background: '#FD8D3C' }}></LegendColor>
            <span>5-6°C hotter</span>
          </LegendItem>
          <LegendItem>
            <LegendColor style={{ background: '#FC4E2A' }}></LegendColor>
            <span>6-7°C hotter</span>
          </LegendItem>
          <LegendItem>
            <LegendColor style={{ background: '#E31A1C' }}></LegendColor>
            <span>7-8°C hotter</span>
          </LegendItem>
          <LegendItem>
            <LegendColor style={{ background: '#BD0026' }}></LegendColor>
            <span>8-9°C hotter</span>
          </LegendItem>
          <LegendItem>
            <LegendColor style={{ background: '#800026' }}></LegendColor>
            <span>9-10°C hotter</span>
          </LegendItem>
        </UhiLegend>
      )}
      
      {isSelecting && (
        <SelectionOverlay>
          Click anywhere on the map to select a point
        </SelectionOverlay>
      )}
      
      {selectedArea && (
        <SelectionOverlay style={{ top: 'auto', bottom: '10px', left: '10px' }}>
          Press ESC to clear selection
        </SelectionOverlay>
      )}

      {selectedAreaStats && (
        <StatisticsPanel>
          <StatsTitle>
            📊 Selected Area Stats
          </StatsTitle>
          <StatsGrid>
            <StatItem>
              <StatValue>{selectedAreaStats.average}°C</StatValue>
              <StatLabel>Average UHI</StatLabel>
            </StatItem>
            <StatItem>
              <StatValue>{selectedAreaStats.maximum}°C</StatValue>
              <StatLabel>Maximum UHI</StatLabel>
            </StatItem>
            <StatItem>
              <StatValue>{selectedAreaStats.minimum}°C</StatValue>
              <StatLabel>Minimum UHI</StatLabel>
            </StatItem>
            <StatItem>
              <StatValue>{selectedAreaStats.cellCount}</StatValue>
              <StatLabel>Grid Cells</StatLabel>
            </StatItem>
          </StatsGrid>
          <CellCount>
            📍 {selectedAreaStats.cellCount} grid cells included in selection
          </CellCount>
          <View3DButton onClick={() => setShow3DVisualization(true)}>
            🌳 View 3D Model
          </View3DButton>
          <ResetButton onClick={clearCurrentSelection}>
            🗑️ Clear Selection
          </ResetButton>
        </StatisticsPanel>
      )}
      
      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />

      {show3DVisualization && selectedArea && (
        <StreetView3D 
          selectedArea={selectedArea} 
          onClose={() => setShow3DVisualization(false)} 
        />
      )}
    </MapContainer>
  );
};

export default MapAreaSelector; 