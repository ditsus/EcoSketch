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

const MapAreaSelector = ({ onAreaSelected, isSelecting, selectedArea, onClearSelection }) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const drawingManagerRef = useRef(null);
  const selectedShapeRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

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
      shape
    };

    onAreaSelected(areaData);
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