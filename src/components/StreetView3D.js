import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import * as THREE from 'three';

const Modal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
`;

const ModalContent = styled.div`
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 1200px;
  height: 80%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e9ecef;
  background: #f8f9fa;
`;

const Title = styled.h2`
  margin: 0;
  color: #333;
  font-size: 20px;
  font-weight: 600;
`;

const CloseButton = styled.button`
  background: #dc3545;
  color: white;
  border: none;
  border-radius: 6px;
  padding: 8px 16px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: #c82333;
  }
`;

const Content = styled.div`
  display: flex;
  flex: 1;
  overflow: hidden;
`;

const LeftPanel = styled.div`
  flex: 1;
  position: relative;
  background: #000;
`;

const RightPanel = styled.div`
  width: 400px;
  background: #f8f9fa;
  padding: 20px;
  overflow-y: auto;
  border-left: 1px solid #e9ecef;
`;

const Canvas = styled.canvas`
  width: 100%;
  height: 100%;
`;

const LoadingOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 18px;
  z-index: 1000;
`;

const InfoSection = styled.div`
  margin-bottom: 20px;
  padding: 15px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
`;

const InfoTitle = styled.h3`
  margin: 0 0 10px 0;
  color: #333;
  font-size: 16px;
  font-weight: 600;
`;

const InfoText = styled.p`
  margin: 0;
  color: #666;
  font-size: 14px;
  line-height: 1.5;
`;

const StreetViewImage = styled.img`
  width: 100%;
  height: 200px;
  object-fit: cover;
  border-radius: 8px;
  margin-bottom: 15px;
`;

const StreetView3D = ({ selectedArea, onClose }) => {
  const canvasRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  
  const [loading, setLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('Initializing 3D scene...');
  const [streetViewUrl, setStreetViewUrl] = useState('');
  const [geminiAnalysis, setGeminiAnalysis] = useState('');

  useEffect(() => {
    if (!selectedArea) return;

    const initScene = async () => {
      try {
        setLoadingMessage('Setting up 3D environment...');
        
        // Initialize Three.js scene
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x87CEEB); // Sky blue background
        
        // Set up camera
        const camera = new THREE.PerspectiveCamera(
          75,
          canvasRef.current.clientWidth / canvasRef.current.clientHeight,
          0.1,
          1000
        );
        camera.position.set(0, 5, 10);
        
        // Set up renderer
        const renderer = new THREE.WebGLRenderer({ 
          canvas: canvasRef.current,
          antialias: true 
        });
        renderer.setSize(canvasRef.current.clientWidth, canvasRef.current.clientHeight);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        // Add lights
        const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
        scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 10, 5);
        directionalLight.castShadow = true;
        scene.add(directionalLight);
        
        // Add ground
        const groundGeometry = new THREE.PlaneGeometry(20, 20);
        const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x90EE90 });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        scene.add(ground);
        
        // Store references
        sceneRef.current = scene;
        cameraRef.current = camera;
        rendererRef.current = renderer;
        
        setLoadingMessage('Generating 3D model with Gemini...');
        
        // Generate 3D model based on location
        await generate3DModel(scene, selectedArea);
        
        // Get street view image
        await getStreetViewImage(selectedArea);
        
        // Analyze with Gemini
        await analyzeWithGemini(selectedArea);
        
        setLoading(false);
        
        // Start render loop
        animate();
        
      } catch (error) {
        console.error('Error initializing 3D scene:', error);
        setLoadingMessage('Error initializing scene. Please try again.');
      }
    };

    initScene();

    return () => {
      // Cleanup
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
    };
  }, [selectedArea]);

  const generate3DModel = async (scene, area) => {
    // Create a simple 3D model based on the selected point
    // This would typically call Gemini API to generate more complex models
    
    // For now, create a simple building representation
    const buildingGeometry = new THREE.BoxGeometry(2, 4, 2);
    const buildingMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
    const building = new THREE.Mesh(buildingGeometry, buildingMaterial);
    building.position.set(0, 2, 0);
    building.castShadow = true;
    scene.add(building);
    
    // Add some trees
    for (let i = 0; i < 3; i++) {
      const treeGeometry = new THREE.CylinderGeometry(0.2, 0.3, 3);
      const treeMaterial = new THREE.MeshLambertMaterial({ color: 0x228B22 });
      const tree = new THREE.Mesh(treeGeometry, treeMaterial);
      tree.position.set(-3 + i * 3, 1.5, -2);
      tree.castShadow = true;
      scene.add(tree);
    }
  };

  const getStreetViewImage = async (area) => {
    try {
      const { lat, lng } = area.coordinates[0];
      const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
      const url = `https://maps.googleapis.com/maps/api/streetview?size=400x200&location=${lat},${lng}&key=${apiKey}`;
      setStreetViewUrl(url);
    } catch (error) {
      console.error('Error getting street view:', error);
    }
  };

  const analyzeWithGemini = async (area) => {
    try {
      // This would call the Gemini API to analyze the location
      // For now, provide a sample analysis
      const analysis = `Location Analysis for ${area.point?.areaName || 'Selected Point'}:
      
🌡️ UHI Intensity: ${area.point?.uhiIntensity || 'N/A'}°C hotter than rural average

🏗️ Urban Elements Detected:
• Commercial buildings
• Concrete surfaces
• Limited green space
• High traffic areas

🌱 Recommendations for Heat Reduction:
• Add rooftop gardens
• Plant street trees
• Use reflective materials
• Increase green infrastructure

This area shows typical urban heat island characteristics with high surface temperatures due to human activities and building materials.`;

      setGeminiAnalysis(analysis);
    } catch (error) {
      console.error('Error analyzing with Gemini:', error);
      setGeminiAnalysis('Analysis unavailable at this time.');
    }
  };

  const animate = () => {
    if (!sceneRef.current || !cameraRef.current || !rendererRef.current) return;
    
    requestAnimationFrame(animate);
    
    // Simple rotation animation
    if (sceneRef.current.children.length > 0) {
      const building = sceneRef.current.children.find(child => 
        child.geometry && child.geometry.type === 'BoxGeometry'
      );
      if (building) {
        building.rotation.y += 0.005;
      }
    }
    
    rendererRef.current.render(sceneRef.current, cameraRef.current);
  };

  const handleResize = () => {
    if (!canvasRef.current || !cameraRef.current || !rendererRef.current) return;
    
    const width = canvasRef.current.clientWidth;
    const height = canvasRef.current.clientHeight;
    
    cameraRef.current.aspect = width / height;
    cameraRef.current.updateProjectionMatrix();
    rendererRef.current.setSize(width, height);
  };

  useEffect(() => {
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!selectedArea) return null;

  return (
    <Modal>
      <ModalContent>
        <Header>
          <Title>🌳 3D Urban Analysis - {selectedArea.point?.areaName || 'Selected Location'}</Title>
          <CloseButton onClick={onClose}>✕ Close</CloseButton>
        </Header>
        
        <Content>
          <LeftPanel>
            <Canvas ref={canvasRef} />
            {loading && (
              <LoadingOverlay>
                <div>{loadingMessage}</div>
              </LoadingOverlay>
            )}
          </LeftPanel>
          
          <RightPanel>
            <InfoSection>
              <InfoTitle>📍 Location Details</InfoTitle>
              <InfoText>
                <strong>Coordinates:</strong> {selectedArea.coordinates[0].lat.toFixed(6)}, {selectedArea.coordinates[0].lng.toFixed(6)}
              </InfoText>
              <InfoText>
                <strong>UHI Intensity:</strong> {selectedArea.point?.uhiIntensity || 'N/A'}°C hotter than rural average
              </InfoText>
            </InfoSection>
            
            {streetViewUrl && (
              <InfoSection>
                <InfoTitle>🏙️ Street View</InfoTitle>
                <StreetViewImage src={streetViewUrl} alt="Street View" />
              </InfoSection>
            )}
            
            {geminiAnalysis && (
              <InfoSection>
                <InfoTitle>🤖 Gemini AI Analysis</InfoTitle>
                <InfoText style={{ whiteSpace: 'pre-line' }}>
                  {geminiAnalysis}
                </InfoText>
              </InfoSection>
            )}
          </RightPanel>
        </Content>
      </ModalContent>
    </Modal>
  );
};

export default StreetView3D; 