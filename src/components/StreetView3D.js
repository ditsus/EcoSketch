import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import * as THREE from 'three';
import { GoogleGenerativeAI } from '@google/generative-ai';

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
  const [geminiData, setGeminiData] = useState(null);

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
          60,
          canvasRef.current.clientWidth / canvasRef.current.clientHeight,
          0.1,
          1000
        );
        camera.position.set(8, 6, 8);
        camera.lookAt(0, 0, 0);
        
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
        
        setLoadingMessage('Fetching Street View image...');
        
        // Get street view image and convert to base64
        const base64Image = await getStreetViewImage(selectedArea);
        
        setLoadingMessage('Analyzing image with Gemini AI...');
        
        // Analyze with Gemini and get the response
        const geminiResponse = await analyzeWithGemini(selectedArea, base64Image);
        
        setLoadingMessage('Generating 3D model based on AI analysis...');
        
        // Generate 3D model based on Gemini analysis
        await generate3DModel(scene, selectedArea, geminiResponse);
        
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

  const generate3DModel = async (scene, area, geminiData) => {
    // Clear existing objects except ground and lights
    scene.children = scene.children.filter(child => 
      child.geometry && child.geometry.type === 'PlaneGeometry' || 
      child.type === 'AmbientLight' || 
      child.type === 'DirectionalLight'
    );
    
    if (!geminiData) {
      // Fallback model if no Gemini data
      const buildingGeometry = new THREE.BoxGeometry(2, 4, 2);
      const buildingMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
      const building = new THREE.Mesh(buildingGeometry, buildingMaterial);
      building.position.set(0, 2, 0);
      building.castShadow = true;
      scene.add(building);
      return;
    }

    // Generate road if detected
    if (geminiData.has_road) {
      const roadGeometry = new THREE.PlaneGeometry(12, 2);
      const roadMaterial = new THREE.MeshLambertMaterial({ color: 0x2C2C2C });
      const road = new THREE.Mesh(roadGeometry, roadMaterial);
      road.rotation.x = -Math.PI / 2;
      road.position.set(0, 0.01, 0);
      scene.add(road);
      
      // Add road markings (center line)
      const markingGeometry = new THREE.PlaneGeometry(0.15, 1.8);
      const markingMaterial = new THREE.MeshLambertMaterial({ color: 0xFFFFFF });
      const marking = new THREE.Mesh(markingGeometry, markingMaterial);
      marking.rotation.x = -Math.PI / 2;
      marking.position.set(0, 0.02, 0);
      scene.add(marking);
      
      // Add side lines
      const sideMarking1 = new THREE.Mesh(markingGeometry, markingMaterial);
      sideMarking1.rotation.x = -Math.PI / 2;
      sideMarking1.position.set(-0.8, 0.02, 0);
      scene.add(sideMarking1);
      
      const sideMarking2 = new THREE.Mesh(markingGeometry, markingMaterial);
      sideMarking2.rotation.x = -Math.PI / 2;
      sideMarking2.position.set(0.8, 0.02, 0);
      scene.add(sideMarking2);
    }

    // Generate sidewalk if detected
    if (geminiData.has_sidewalk) {
      const sidewalkGeometry = new THREE.PlaneGeometry(1.5, 12);
      const sidewalkMaterial = new THREE.MeshLambertMaterial({ color: 0xD3D3D3 });
      const sidewalk = new THREE.Mesh(sidewalkGeometry, sidewalkMaterial);
      sidewalk.rotation.x = -Math.PI / 2;
      sidewalk.position.set(-2.5, 0.01, 0);
      scene.add(sidewalk);
      
      const sidewalk2 = new THREE.Mesh(sidewalkGeometry, sidewalkMaterial);
      sidewalk2.rotation.x = -Math.PI / 2;
      sidewalk2.position.set(2.5, 0.01, 0);
      scene.add(sidewalk2);
    }

    // Generate buildings based on Gemini data
    if (geminiData.has_building) {
      const buildingCount = geminiData.building_count || 1;
      const buildingColors = [0x8B4513, 0x696969, 0x708090, 0x556B2F, 0x2F4F4F];
      
      for (let i = 0; i < buildingCount; i++) {
        const height = 3 + Math.random() * 4; // 3-7 units tall
        const width = 1.5 + Math.random() * 1; // 1.5-2.5 units wide
        const depth = 1.5 + Math.random() * 1; // 1.5-2.5 units deep
        
        const buildingGeometry = new THREE.BoxGeometry(width, height, depth);
        const buildingMaterial = new THREE.MeshLambertMaterial({ 
          color: buildingColors[i % buildingColors.length]
        });
        const building = new THREE.Mesh(buildingGeometry, buildingMaterial);
        building.position.set(-4 + i * 3, height / 2, -3);
        building.castShadow = true;
        scene.add(building);
        
        // Add windows to buildings
        const windowGeometry = new THREE.PlaneGeometry(0.3, 0.4);
        const windowMaterial = new THREE.MeshLambertMaterial({ color: 0x87CEEB });
        
        // Front windows
        for (let j = 0; j < Math.floor(height / 1.5); j++) {
          for (let k = 0; k < 2; k++) {
            const window = new THREE.Mesh(windowGeometry, windowMaterial);
            window.position.set(
              -4 + i * 3 + (k - 0.5) * 0.4, 
              1 + j * 1.5, 
              -3 + depth / 2 + 0.01
            );
            scene.add(window);
          }
        }
      }
    }

    // Generate trees based on Gemini data
    if (geminiData.add_trees) {
      const treeCount = geminiData.tree_count || 2;
      const treeColors = [0x228B22, 0x32CD32, 0x006400, 0x228B22];
      
      for (let i = 0; i < treeCount; i++) {
        // Tree trunk
        const trunkGeometry = new THREE.CylinderGeometry(0.15, 0.2, 2.5);
        const trunkMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.position.set(-6 + i * 2.5, 1.25, 3);
        trunk.castShadow = true;
        scene.add(trunk);
        
        // Tree leaves (multiple spheres for more realistic look)
        const leafColor = treeColors[i % treeColors.length];
        const leavesMaterial = new THREE.MeshLambertMaterial({ color: leafColor });
        
        // Main foliage
        const leavesGeometry = new THREE.SphereGeometry(1, 8, 8);
        const leaves = new THREE.Mesh(leavesGeometry, leavesMaterial);
        leaves.position.set(-6 + i * 2.5, 3.5, 3);
        leaves.castShadow = true;
        scene.add(leaves);
        
        // Additional foliage layers
        const leaves2 = new THREE.Mesh(leavesGeometry, leavesMaterial);
        leaves2.position.set(-6 + i * 2.5 + 0.3, 3.8, 3 + 0.2);
        leaves2.scale.set(0.8, 0.8, 0.8);
        leaves2.castShadow = true;
        scene.add(leaves2);
      }
    }

    // Add suggested improvements if recommended
    if (geminiData.suggested_changes && geminiData.suggested_changes.toLowerCase().includes('tree')) {
      // Add additional trees as suggested improvements (in different locations)
      for (let i = 0; i < 3; i++) {
        const trunkGeometry = new THREE.CylinderGeometry(0.15, 0.2, 2.5);
        const trunkMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.position.set(4 + i * 2, 1.25, -2);
        trunk.castShadow = true;
        scene.add(trunk);
        
        const leavesGeometry = new THREE.SphereGeometry(1, 8, 8);
        const leavesMaterial = new THREE.MeshLambertMaterial({ color: 0x32CD32 });
        const leaves = new THREE.Mesh(leavesGeometry, leavesMaterial);
        leaves.position.set(4 + i * 2, 3.5, -2);
        leaves.castShadow = true;
        scene.add(leaves);
      }
    }

    // Add some decorative elements
    // Street lights
    for (let i = 0; i < 2; i++) {
      const poleGeometry = new THREE.CylinderGeometry(0.05, 0.05, 4);
      const poleMaterial = new THREE.MeshLambertMaterial({ color: 0x696969 });
      const pole = new THREE.Mesh(poleGeometry, poleMaterial);
      pole.position.set(-3 + i * 6, 2, 1.5);
      pole.castShadow = true;
      scene.add(pole);
      
      const lightGeometry = new THREE.SphereGeometry(0.2, 8, 8);
      const lightMaterial = new THREE.MeshLambertMaterial({ color: 0xFFFF00 });
      const light = new THREE.Mesh(lightGeometry, lightMaterial);
      light.position.set(-3 + i * 6, 4.2, 1.5);
      light.castShadow = true;
      scene.add(light);
    }
  };

  const getStreetViewImage = async (area) => {
    try {
      const { lat, lng } = area.coordinates[0];
      const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
      const url = `https://maps.googleapis.com/maps/api/streetview?size=400x200&location=${lat},${lng}&key=${apiKey}`;
      setStreetViewUrl(url);
      
      // Convert image to base64 for Gemini
      const base64Image = await convertImageToBase64(url);
      return base64Image;
    } catch (error) {
      console.error('Error getting street view:', error);
      return null;
    }
  };

  const convertImageToBase64 = (imageUrl) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          const dataURL = canvas.toDataURL('image/jpeg');
          resolve(dataURL);
        } catch (error) {
          console.error('Error converting image to base64:', error);
          reject(error);
        }
      };
      img.onerror = (error) => {
        console.error('Error loading image:', error);
        reject(error);
      };
      img.src = imageUrl;
    });
  };

  const analyzeWithGemini = async (area, base64Image) => {
    try {
      setLoadingMessage('Analyzing image with Gemini AI...');
      
      // Check if Gemini API key is available
      if (!process.env.REACT_APP_GEMINI_API_KEY) {
        throw new Error('Gemini API key not found. Please set REACT_APP_GEMINI_API_KEY in your environment variables.');
      }
      
      // Initialize Gemini
      const genAI = new GoogleGenerativeAI(process.env.REACT_APP_GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const prompt = `Analyze this urban street image and describe what's present. Return a JSON object with the following structure:
      {
        "has_road": boolean,
        "has_sidewalk": boolean,
        "has_building": boolean,
        "add_trees": boolean,
        "building_count": number,
        "tree_count": number,
        "road_type": string,
        "suggested_changes": string,
        "analysis": string
      }
      
      Focus on urban heat island reduction opportunities. If you see concrete/asphalt with no trees, suggest adding trees. If you see buildings without green roofs, suggest rooftop gardens.`;

      // Ensure we have a valid base64 image
      if (!base64Image || typeof base64Image !== 'string') {
        throw new Error('Invalid base64 image data');
      }
      
      const base64Data = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;
      
      const imagePart = {
        inlineData: {
          data: base64Data,
          mimeType: "image/jpeg"
        }
      };

      const result = await model.generateContent([prompt, imagePart]);
      const response = await result.response;
      const text = response.text();
      
      // Parse JSON response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const geminiResponse = JSON.parse(jsonMatch[0]);
        setGeminiData(geminiResponse);
        
        const analysis = `Location Analysis for ${area.point?.areaName || 'Selected Point'}:
        
🌡️ UHI Intensity: ${area.point?.uhiIntensity || 'N/A'}°C hotter than rural average

🏗️ Urban Elements Detected:
${geminiResponse.has_road ? '• Road present' : '• No road detected'}
${geminiResponse.has_sidewalk ? '• Sidewalk present' : '• No sidewalk detected'}
${geminiResponse.has_building ? `• ${geminiResponse.building_count || 1} building(s) present` : '• No buildings detected'}
${geminiResponse.add_trees ? `• ${geminiResponse.tree_count || 0} tree(s) present` : '• No trees detected'}

🌱 AI Recommendations:
${geminiResponse.suggested_changes || 'No specific recommendations available'}

📊 Analysis:
${geminiResponse.analysis || 'Analysis not available'}`;

        setGeminiAnalysis(analysis);
        return geminiResponse;
      } else {
        throw new Error('No JSON found in Gemini response');
      }
    } catch (error) {
      console.error('Error analyzing with Gemini:', error);
      setGeminiAnalysis('Analysis unavailable at this time. Error: ' + error.message);
      return null;
    }
  };

  const animate = () => {
    if (!sceneRef.current || !cameraRef.current || !rendererRef.current) return;
    
    requestAnimationFrame(animate);
    
    // Gentle camera rotation around the scene
    const time = Date.now() * 0.0005;
    const radius = 12;
    cameraRef.current.position.x = Math.cos(time) * radius;
    cameraRef.current.position.z = Math.sin(time) * radius;
    cameraRef.current.position.y = 6 + Math.sin(time * 2) * 1;
    cameraRef.current.lookAt(0, 2, 0);
    
    // Subtle tree swaying animation
    sceneRef.current.children.forEach(child => {
      if (child.geometry && 
          child.geometry.type === 'SphereGeometry' && 
          child.material && 
          child.material.color && 
          (child.material.color.getHex() === 0x228B22 || 
           child.material.color.getHex() === 0x32CD32 ||
           child.material.color.getHex() === 0x006400)) {
        child.rotation.z = Math.sin(time * 3 + child.position.x) * 0.1;
      }
    });
    
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
            
            {geminiData && (
              <InfoSection>
                <InfoTitle>📊 Raw AI Data</InfoTitle>
                <InfoText style={{ 
                  fontFamily: 'monospace', 
                  fontSize: '11px',
                  backgroundColor: '#f8f9fa',
                  padding: '8px',
                  borderRadius: '4px',
                  overflow: 'auto'
                }}>
                  {JSON.stringify(geminiData, null, 2)}
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