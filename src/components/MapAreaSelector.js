import React, { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import styled from 'styled-components';

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



const MapAreaSelector = ({ onAreaSelected, isSelecting, selectedArea, onClearSelection }) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const drawingManagerRef = useRef(null);
  const selectedShapeRef = useRef(null);
  const uhiPolygonsRef = useRef([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showUhiGrid, setShowUhiGrid] = useState(true);

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

        // Initialize drawing manager
        const drawingManager = new google.maps.drawing.DrawingManager({
          drawingMode: null,
          drawingControl: false,
          drawingControlOptions: {
            position: google.maps.ControlPosition.TOP_CENTER,
            drawingModes: [
              google.maps.drawing.OverlayType.POLYGON,
              google.maps.drawing.OverlayType.RECTANGLE,
              google.maps.drawing.OverlayType.CIRCLE
            ]
          },
          polygonOptions: {
            fillColor: '#007bff',
            fillOpacity: 0.3,
            strokeWeight: 2,
            strokeColor: '#007bff',
            clickable: true,
            editable: true,
            zIndex: 1
          },
          rectangleOptions: {
            fillColor: '#28a745',
            fillOpacity: 0.3,
            strokeWeight: 2,
            strokeColor: '#28a745',
            clickable: true,
            editable: true,
            zIndex: 1
          },
          circleOptions: {
            fillColor: '#ffc107',
            fillOpacity: 0.3,
            strokeWeight: 2,
            strokeColor: '#ffc107',
            clickable: true,
            editable: true,
            zIndex: 1
          }
        });

        drawingManager.setMap(map);
        drawingManagerRef.current = drawingManager;

        // Listen for shape completion
        google.maps.event.addListener(drawingManager, 'polygoncomplete', (polygon) => {
          handleShapeComplete(polygon, 'polygon');
        });

        google.maps.event.addListener(drawingManager, 'rectanglecomplete', (rectangle) => {
          handleShapeComplete(rectangle, 'rectangle');
        });

        google.maps.event.addListener(drawingManager, 'circlecomplete', (circle) => {
          handleShapeComplete(circle, 'circle');
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
    if (mapInstanceRef.current && drawingManagerRef.current) {
      if (isSelecting) {
        // Clear any existing selection when starting new selection
        if (selectedShapeRef.current) {
          selectedShapeRef.current.setMap(null);
          selectedShapeRef.current = null;
        }
        // Enable drawing mode
        drawingManagerRef.current.setDrawingMode(google.maps.drawing.OverlayType.POLYGON);
      } else {
        // Disable drawing mode
        drawingManagerRef.current.setDrawingMode(null);
      }
    }
  }, [isSelecting]);

  const handleShapeComplete = (shape, type) => {
    // Clear previous selection
    if (selectedShapeRef.current) {
      selectedShapeRef.current.setMap(null);
    }

    selectedShapeRef.current = shape;

    // Calculate area and bounds
    let area = 0;
    let bounds = null;
    let coordinates = [];

    if (type === 'polygon') {
      const path = shape.getPath();
      coordinates = path.getArray().map(latLng => ({
        lat: latLng.lat(),
        lng: latLng.lng()
      }));
      area = google.maps.geometry.spherical.computeArea(path);
      bounds = new google.maps.LatLngBounds();
      path.forEach(latLng => bounds.extend(latLng));
    } else if (type === 'rectangle') {
      bounds = shape.getBounds();
      const ne = bounds.getNorthEast();
      const sw = bounds.getSouthWest();
      coordinates = [
        { lat: ne.lat(), lng: sw.lng() },
        { lat: ne.lat(), lng: ne.lng() },
        { lat: sw.lat(), lng: ne.lng() },
        { lat: sw.lat(), lng: sw.lng() }
      ];
      area = google.maps.geometry.spherical.computeArea([
        ne, { lat: ne.lat(), lng: sw.lng() }, sw, { lat: sw.lat(), lng: ne.lng() }
      ]);
    } else if (type === 'circle') {
      const center = shape.getCenter();
      const radius = shape.getRadius();
      coordinates = [{ lat: center.lat(), lng: center.lng() }];
      area = Math.PI * radius * radius;
      bounds = new google.maps.LatLngBounds();
      bounds.extend(center);
    }

    // Convert area to square kilometers
    const areaKm2 = area / 1000000;

    // Calculate average UHI intensity within the selected area
    const averageUhi = calculateAverageUhiIntensity(shape, type);

    const areaData = {
      type,
      coordinates,
      area: areaKm2,
      bounds: bounds ? {
        north: bounds.getNorthEast().lat(),
        south: bounds.getSouthWest().lat(),
        east: bounds.getNorthEast().lng(),
        west: bounds.getSouthWest().lng()
      } : null,
      shape,
      averageUhi
    };

    onAreaSelected(areaData);
  };

  // Calculate average UHI intensity within a selected area
  const calculateAverageUhiIntensity = (shape, type) => {
    const gridData = generateUhiGrid();
    let totalIntensity = 0;
    let overlappingCells = 0;

    gridData.forEach(cell => {
      // Check if the cell overlaps with the selected area
      const cellPolygon = new google.maps.Polygon({
        paths: cell.paths
      });

      if (google.maps.geometry.poly.containsLocation) {
        // For each vertex of the cell, check if it's inside the selected area
        let cellInside = false;
        cell.paths.forEach(vertex => {
          const latLng = new google.maps.LatLng(vertex.lat, vertex.lng);
          if (google.maps.geometry.poly.containsLocation(latLng, shape)) {
            cellInside = true;
          }
        });

        if (cellInside) {
          totalIntensity += cell.intensity;
          overlappingCells++;
        }
      }
    });

    // If no overlapping cells found, try a different approach for small selections
    if (overlappingCells === 0) {
      // For very small selections, find the nearest grid cell
      const shapeCenter = getShapeCenter(shape, type);
      if (shapeCenter) {
        const nearestCell = findNearestGridCell(shapeCenter, gridData);
        if (nearestCell) {
          return nearestCell.intensity.toFixed(1);
        }
      }
    }

    return overlappingCells > 0 ? (totalIntensity / overlappingCells).toFixed(1) : 0;
  };

  // Get the center point of a shape
  const getShapeCenter = (shape, type) => {
    if (type === 'circle') {
      return shape.getCenter();
    } else if (type === 'rectangle') {
      const bounds = shape.getBounds();
      return new google.maps.LatLng(
        (bounds.getNorthEast().lat() + bounds.getSouthWest().lat()) / 2,
        (bounds.getNorthEast().lng() + bounds.getSouthWest().lng()) / 2
      );
    } else if (type === 'polygon') {
      const path = shape.getPath();
      let totalLat = 0, totalLng = 0;
      const numPoints = path.getLength();
      
      for (let i = 0; i < numPoints; i++) {
        const point = path.getAt(i);
        totalLat += point.lat();
        totalLng += point.lng();
      }
      
      return new google.maps.LatLng(totalLat / numPoints, totalLng / numPoints);
    }
    return null;
  };

  // Find the nearest grid cell to a point
  const findNearestGridCell = (center, gridData) => {
    let nearestCell = null;
    let minDistance = Infinity;

    gridData.forEach(cell => {
      const cellCenter = {
        lat: (cell.paths[0].lat + cell.paths[2].lat) / 2,
        lng: (cell.paths[0].lng + cell.paths[2].lng) / 2
      };
      
      const distance = Math.sqrt(
        Math.pow(center.lat() - cellCenter.lat, 2) + 
        Math.pow(center.lng() - cellCenter.lng, 2)
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
    // Clear any incomplete drawings
    if (drawingManagerRef.current) {
      drawingManagerRef.current.setDrawingMode(null);
    }
  };

  // Expose clear function to parent component
  useEffect(() => {
    if (onClearSelection) {
      onClearSelection(clearCurrentSelection);
    }
  }, [onClearSelection]);

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
  }, [onAreaSelected]);

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
          active={showUhiGrid}
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
          Click and drag to draw a polygon, rectangle, or circle
        </SelectionOverlay>
      )}
      
      {selectedArea && (
        <SelectionOverlay style={{ top: 'auto', bottom: '10px', left: '10px' }}>
          Press ESC to clear selection
        </SelectionOverlay>
      )}
      
      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
    </MapContainer>
  );
};

export default MapAreaSelector; 