import React, { useState } from 'react';
import styled from 'styled-components';
import MapAreaSelector from './components/MapAreaSelector';
import AreaInfo from './components/AreaInfo';

const AppContainer = styled.div`
  display: flex;
  height: 100vh;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
`;

const MapContainer = styled.div`
  flex: 1;
  position: relative;
`;

const Sidebar = styled.div`
  width: 350px;
  background: #f8f9fa;
  border-left: 1px solid #e9ecef;
  padding: 20px;
  overflow-y: auto;
`;

const Header = styled.div`
  background: #007bff;
  color: white;
  padding: 15px 20px;
  font-size: 18px;
  font-weight: 600;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
`;

function App() {
  const [selectedArea, setSelectedArea] = useState(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [clearMapSelection, setClearMapSelection] = useState(null);

  const handleAreaSelected = (area) => {
    setSelectedArea(area);
    setIsSelecting(false);
  };

  const startSelection = () => {
    // Clear any existing selection first
    if (selectedArea) {
      setSelectedArea(null);
      // Clear the shape from the map
      if (clearMapSelection) {
        clearMapSelection();
      }
    }
    setIsSelecting(true);
  };

  const clearSelection = () => {
    setSelectedArea(null);
    setIsSelecting(false);
    // Clear the shape from the map
    if (clearMapSelection) {
      clearMapSelection();
    }
  };

  const handleClearMapSelection = (clearFunction) => {
    setClearMapSelection(() => clearFunction);
  };

  return (
    <AppContainer>
      <MapContainer>
        <Header>
          HackThe6ix Map Area Selector
        </Header>
        <MapAreaSelector
          onAreaSelected={handleAreaSelected}
          isSelecting={isSelecting}
          selectedArea={selectedArea}
          onClearSelection={handleClearMapSelection}
        />
      </MapContainer>
      <Sidebar>
        <AreaInfo
          selectedArea={selectedArea}
          isSelecting={isSelecting}
          onStartSelection={startSelection}
          onClearSelection={clearSelection}
        />
      </Sidebar>
    </AppContainer>
  );
}

export default App; 