import React, { useState } from 'react';
import styled from 'styled-components';

const Container = styled.div`
  height: 100%;
  display: flex;
  flex-direction: column;
`;

const Section = styled.div`
  margin-bottom: 25px;
  padding: 15px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
`;

const Title = styled.h3`
  margin: 0 0 15px 0;
  color: #333;
  font-size: 18px;
  font-weight: 600;
`;

const Button = styled.button`
  width: 100%;
  padding: 12px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-bottom: 10px;

  &.primary {
    background: #007bff;
    color: white;
    
    &:hover {
      background: #0056b3;
    }
    
    &:disabled {
      background: #6c757d;
      cursor: not-allowed;
    }
  }

  &.secondary {
    background: #6c757d;
    color: white;
    
    &:hover {
      background: #545b62;
    }
  }

  &.danger {
    background: #dc3545;
    color: white;
    
    &:hover {
      background: #c82333;
    }
  }
`;

const InfoGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 15px;
`;

const InfoItem = styled.div`
  padding: 8px;
  background: #f8f9fa;
  border-radius: 4px;
  font-size: 12px;
`;

const InfoLabel = styled.div`
  font-weight: 600;
  color: #495057;
  margin-bottom: 2px;
`;

const InfoValue = styled.div`
  color: #212529;
  font-family: 'Courier New', monospace;
`;

const CoordinatesList = styled.div`
  max-height: 150px;
  overflow-y: auto;
  background: #f8f9fa;
  border-radius: 4px;
  padding: 10px;
  font-family: 'Courier New', monospace;
  font-size: 11px;
  line-height: 1.4;
`;

const StatusIndicator = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 15px;
  padding: 10px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;

  &.selecting {
    background: #d1ecf1;
    color: #0c5460;
    border: 1px solid #bee5eb;
  }

  &.selected {
    background: #d4edda;
    color: #155724;
    border: 1px solid #c3e6cb;
  }

  &.idle {
    background: #f8f9fa;
    color: #6c757d;
    border: 1px solid #dee2e6;
  }
`;

const StatusDot = styled.div`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 8px;

  &.selecting {
    background: #17a2b8;
  }

  &.selected {
    background: #28a745;
  }

  &.idle {
    background: #6c757d;
  }
`;

const AreaInfo = ({ selectedArea, isSelecting, onStartSelection, onClearSelection }) => {
  const [showClearMessage, setShowClearMessage] = useState(false);
  const [showStartMessage, setShowStartMessage] = useState(false);

  const handleClearSelection = () => {
    onClearSelection();
    setShowClearMessage(true);
    setTimeout(() => setShowClearMessage(false), 2000);
  };

  const handleStartSelection = () => {
    onStartSelection();
    if (selectedArea) {
      setShowStartMessage(true);
      setTimeout(() => setShowStartMessage(false), 2000);
    }
  };
  const getStatusText = () => {
    if (isSelecting) return 'Selecting area...';
    if (selectedArea) return 'Area selected';
    return 'No area selected';
  };

  const getStatusClass = () => {
    if (isSelecting) return 'selecting';
    if (selectedArea) return 'selected';
    return 'idle';
  };

  const formatCoordinates = (coordinates) => {
    if (!coordinates || coordinates.length === 0) return 'No coordinates';
    
    return coordinates.map((coord, index) => 
      `${index + 1}. ${coord.lat.toFixed(6)}, ${coord.lng.toFixed(6)}`
    ).join('\n');
  };

  const formatArea = (area) => {
    if (area < 1) {
      return `${(area * 1000000).toFixed(2)} m²`;
    } else if (area < 100) {
      return `${area.toFixed(2)} km²`;
    } else {
      return `${area.toFixed(1)} km²`;
    }
  };

  return (
    <Container>
      <Section>
        <Title>Area Selection</Title>
        
        <StatusIndicator className={getStatusClass()}>
          <StatusDot className={getStatusClass()} />
          {getStatusText()}
        </StatusIndicator>

        <Button 
          className="primary" 
          onClick={handleStartSelection}
          disabled={isSelecting}
        >
          {isSelecting ? 'Selecting...' : selectedArea ? 'Start New Selection' : 'Start Area Selection'}
        </Button>

        {selectedArea && (
          <Button 
            className="danger" 
            onClick={handleClearSelection}
          >
            Clear Selection
          </Button>
        )}

        {showClearMessage && (
          <div style={{
            padding: '10px',
            marginTop: '10px',
            backgroundColor: '#d4edda',
            color: '#155724',
            borderRadius: '4px',
            fontSize: '14px',
            textAlign: 'center'
          }}>
            Area selection cleared!
          </div>
        )}

        {showStartMessage && (
          <div style={{
            padding: '10px',
            marginTop: '10px',
            backgroundColor: '#d1ecf1',
            color: '#0c5460',
            borderRadius: '4px',
            fontSize: '14px',
            textAlign: 'center'
          }}>
            Previous area cleared. Start drawing your new selection!
          </div>
        )}
      </Section>

      <Section>
        <Title>🌡️ UHI Grid</Title>
        <div style={{
          padding: '12px',
          backgroundColor: '#f8f9fa',
          borderRadius: '6px',
          fontSize: '13px',
          lineHeight: '1.4',
          color: '#495057'
        }}>
          <p><strong>Urban Heat Island (UHI)</strong> grid shows temperature intensity across Toronto.</p>
          <p style={{ marginTop: '8px' }}>
            <strong>White/Yellow areas:</strong> Cooler temperatures
          </p>
          <p style={{ marginTop: '4px' }}>
            <strong>Red areas:</strong> Hotter temperatures
          </p>
          <p style={{ marginTop: '8px', fontSize: '12px', color: '#6c757d' }}>
            Use the toggle button on the map to show/hide the UHI grid overlay.
          </p>
        </div>
      </Section>

      {selectedArea && (
        <>
          <Section>
            <Title>Area Details</Title>
            
            <InfoGrid>
              <InfoItem>
                <InfoLabel>Type</InfoLabel>
                <InfoValue>{selectedArea.type.charAt(0).toUpperCase() + selectedArea.type.slice(1)}</InfoValue>
              </InfoItem>
              <InfoItem>
                <InfoLabel>Area</InfoLabel>
                <InfoValue>{formatArea(selectedArea.area)}</InfoValue>
              </InfoItem>
            </InfoGrid>

            {selectedArea.averageUhi && selectedArea.averageUhi > 0 && (
              <div style={{
                padding: '10px',
                backgroundColor: '#fff3cd',
                border: '1px solid #ffeaa7',
                borderRadius: '4px',
                marginTop: '10px'
              }}>
                <InfoLabel style={{ color: '#856404', marginBottom: '5px' }}>
                  🌡️ Average UHI Intensity
                </InfoLabel>
                <InfoValue style={{ color: '#856404', fontSize: '16px', fontWeight: 'bold' }}>
                  {selectedArea.averageUhi}°C hotter than rural average
                </InfoValue>
              </div>
            )}

            {selectedArea.bounds && (
              <div>
                <InfoLabel>Bounds</InfoLabel>
                <InfoGrid>
                  <InfoItem>
                    <InfoLabel>North</InfoLabel>
                    <InfoValue>{selectedArea.bounds.north.toFixed(6)}</InfoValue>
                  </InfoItem>
                  <InfoItem>
                    <InfoLabel>South</InfoLabel>
                    <InfoValue>{selectedArea.bounds.south.toFixed(6)}</InfoValue>
                  </InfoItem>
                  <InfoItem>
                    <InfoLabel>East</InfoLabel>
                    <InfoValue>{selectedArea.bounds.east.toFixed(6)}</InfoValue>
                  </InfoItem>
                  <InfoItem>
                    <InfoLabel>West</InfoLabel>
                    <InfoValue>{selectedArea.bounds.west.toFixed(6)}</InfoValue>
                  </InfoItem>
                </InfoGrid>
              </div>
            )}
          </Section>

          <Section>
            <Title>Coordinates</Title>
            <CoordinatesList>
              {formatCoordinates(selectedArea.coordinates)}
            </CoordinatesList>
          </Section>

          <Section>
            <Title>Export Data</Title>
            <Button 
              className="secondary"
              onClick={() => {
                const dataStr = JSON.stringify(selectedArea, null, 2);
                const dataBlob = new Blob([dataStr], { type: 'application/json' });
                const url = URL.createObjectURL(dataBlob);
                const link = document.createElement('a');
                link.href = url;
                link.download = 'selected-area.json';
                link.click();
                URL.revokeObjectURL(url);
              }}
            >
              Download JSON
            </Button>
          </Section>
        </>
      )}
    </Container>
  );
};

export default AreaInfo; 