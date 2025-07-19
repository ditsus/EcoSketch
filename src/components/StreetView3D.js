import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three-stdlib';
import { GoogleGenerativeAI } from '@google/generative-ai';
import styled from 'styled-components';

const Container = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: #000;
  z-index: 2000;
  display: flex;
  flex-direction: column;
`;

const Header = styled.div`
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 15px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  z-index: 2001;
`;

const CloseButton = styled.button`
  background: #dc3545;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 16px;
  cursor: pointer;
  font-size: 14px;
  
  &:hover {
    background: #c82333;
  }
`;

const Controls = styled.div`
  display: flex;
  gap: 10px;
`;

const ActionButton = styled.button`
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 16px;
  cursor: pointer;
  font-size: 14px;
  
  &:hover {
    background: #0056b3;
  }
  
  &:disabled {
    background: #6c757d;
    cursor: not-allowed;
  }
`;

const Canvas = styled.div`
  flex: 1;
  position: relative;
`;

const LoadingOverlay = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 20px;
  border-radius: 8px;
  text-align: center;
  z-index: 2002;
`;

const AISuggestion = styled.div`
  position: absolute;
  bottom: 20px;
  left: 20px;
  right: 20px;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 15px;
  border-radius: 8px;
  z-index: 2001;
  max-height: 150px;
  overflow-y: auto;
`;

const ControlsInfo = styled.div`
  position: absolute;
  top: 80px;
  left: 20px;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 12px;
  border-radius: 8px;
  z-index: 2001;
  font-size: 12px;
  max-width: 200px;
`;

const ResetCameraButton = styled.button`
  position: absolute;
  top: 200px;
  left: 20px;
  background: rgba(0, 123, 255, 0.8);
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 12px;
  font-size: 12px;
  cursor: pointer;
  z-index: 2001;
  
  &:hover {
    background: rgba(0, 123, 255, 1);
  }
`;

const StreetView3D = ({ selectedArea, onClose }) => {
  const canvasRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('Initializing 3D scene...');
  const [aiSuggestion, setAiSuggestion] = useState('');
  const [currentLocation, setCurrentLocation] = useState(null);

  // Initialize Gemini AI
  const genAI = new GoogleGenerativeAI(process.env.REACT_APP_GEMINI_API_KEY || 'YOUR_GEMINI_API_KEY');

  // Generate random point within selected area
  const generateRandomPoint = (bounds) => {
    const lat = bounds.south + Math.random() * (bounds.north - bounds.south);
    const lng = bounds.west + Math.random() * (bounds.east - bounds.west);
    return { lat, lng };
  };

  // Fetch Street View image
  const fetchStreetViewImage = async (lat, lng) => {
    const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || 'YOUR_API_KEY_HERE';
    const url = `https://maps.googleapis.com/maps/api/streetview?size=640x640&location=${lat},${lng}&key=${apiKey}`;
    
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch Street View');
      
      const blob = await response.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Error fetching Street View:', error);
      throw error;
    }
  };

  // Analyze image with Gemini AI
  const analyzeImageWithAI = async (imageDataUrl) => {
    try {
      setLoadingMessage('Analyzing image with AI...');
      
      const model = genAI.getGenerativeModel({ model: "gemini-pro-vision" });
      
      // Convert base64 to Uint8Array
      const base64Data = imageDataUrl.split(',')[1];
      const imageBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
      
      const prompt = `Analyze this urban street scene. What elements are present: road, sidewalk, buildings, trees, bushes, greenery? Suggest realistic improvements to reduce heat island effect. Return JSON:

{
  "has_road": true,
  "has_sidewalk": true,
  "has_building": true,
  "add_trees": true,
  "add_bushes": true,
  "suggested_changes": "Add shade trees along the sidewalk and bushes near buildings."
}`;

      const result = await model.generateContent([prompt, { inlineData: { data: base64Data, mimeType: "image/jpeg" } }]);
      const response = await result.response;
      const text = response.text();
      
      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        console.log('AI Analysis Result:', parsed);
        return parsed;
      } else {
        // Fallback if JSON parsing fails
        console.log('AI Analysis failed, using fallback');
        return {
          has_road: true,
          has_sidewalk: true,
          has_building: true,
          add_trees: true,
          add_bushes: true,
          suggested_changes: "Add more greenery and shade trees to reduce urban heat island effect."
        };
      }
    } catch (error) {
      console.error('Error analyzing image:', error);
      // Return default values if AI analysis fails
      return {
        has_road: true,
        has_sidewalk: true,
        has_building: true,
        add_trees: true,
        add_bushes: true,
        suggested_changes: "Add more greenery and shade trees to reduce urban heat island effect."
      };
    }
  };

  // Initialize Three.js scene
  const initThreeJS = () => {
    const canvas = canvasRef.current;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB); // Sky blue background
    
    // Camera
    const camera = new THREE.PerspectiveCamera(75, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
    camera.position.set(0, 5, 10);
    camera.lookAt(0, 0, 0);
    
    // Renderer
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);
    
    // Ground plane
    const groundGeometry = new THREE.PlaneGeometry(20, 20);
    const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x90EE90 });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
    
    // Add OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; // Add smooth damping
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.minDistance = 3; // Minimum zoom distance
    controls.maxDistance = 20; // Maximum zoom distance
    controls.maxPolarAngle = Math.PI / 2; // Prevent going below ground
    controls.enablePan = true; // Enable panning
    controls.enableZoom = true; // Enable zooming
    controls.enableRotate = true; // Enable rotation
    
    // Enable touch controls for mobile
    controls.enableTouch = true;
    controls.touches = {
      ONE: THREE.TOUCH.ROTATE,
      TWO: THREE.TOUCH.DOLLY_PAN
    };
    
    sceneRef.current = scene;
    cameraRef.current = camera;
    rendererRef.current = renderer;
    controlsRef.current = controls;
    
    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      controls.update(); // Update controls in animation loop
      renderer.render(scene, camera);
    };
    animate();
  };

  // Build 3D model based on AI analysis
  const build3DModel = (aiAnalysis) => {
    const scene = sceneRef.current;
    if (!scene) return;
    
    console.log('Building 3D model with AI analysis:', aiAnalysis);
    
    // Clear existing model elements (except ground and lights)
    const objectsToRemove = [];
    scene.children.forEach(child => {
      if (child.type === 'Mesh' && child.geometry.type !== 'PlaneGeometry') {
        objectsToRemove.push(child);
      }
    });
    objectsToRemove.forEach(obj => scene.remove(obj));
    
    // Road
    if (aiAnalysis.has_road) {
      const roadWidth = 6 + Math.random() * 4; // 6-10 units wide
      const roadGeometry = new THREE.BoxGeometry(roadWidth, 0.1, 2);
      const roadMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
      const road = new THREE.Mesh(roadGeometry, roadMaterial);
      road.position.set(0, 0.05, 0);
      road.castShadow = true;
      road.receiveShadow = true;
      scene.add(road);
      
      // Road markings (center line)
      const markingGeometry = new THREE.BoxGeometry(roadWidth, 0.11, 0.1);
      const markingMaterial = new THREE.MeshLambertMaterial({ color: 0xFFFFFF });
      const marking = new THREE.Mesh(markingGeometry, markingMaterial);
      marking.position.set(0, 0.06, 0);
      scene.add(marking);
      
      // Additional road markings (dashed lines)
      if (Math.random() > 0.5) {
        for (let i = 0; i < 3; i++) {
          const dashGeometry = new THREE.BoxGeometry(1, 0.11, 0.1);
          const dashMaterial = new THREE.MeshLambertMaterial({ color: 0xFFFFFF });
          const dash = new THREE.Mesh(dashGeometry, dashMaterial);
          dash.position.set(-2 + i * 2, 0.06, 0);
          scene.add(dash);
        }
      }
    }
    
    // Sidewalk
    if (aiAnalysis.has_sidewalk) {
      const sidewalkGeometry = new THREE.BoxGeometry(2, 0.1, 8);
      const sidewalkMaterial = new THREE.MeshLambertMaterial({ color: 0xCCCCCC });
      const sidewalk = new THREE.Mesh(sidewalkGeometry, sidewalkMaterial);
      sidewalk.position.set(-5, 0.05, 0);
      sidewalk.castShadow = true;
      sidewalk.receiveShadow = true;
      scene.add(sidewalk);
      
      const sidewalk2 = new THREE.Mesh(sidewalkGeometry, sidewalkMaterial);
      sidewalk2.position.set(5, 0.05, 0);
      sidewalk2.castShadow = true;
      sidewalk2.receiveShadow = true;
      scene.add(sidewalk2);
    }
    
    // Buildings
    if (aiAnalysis.has_building) {
      const buildingCount = Math.floor(Math.random() * 3) + 1; // 1-3 buildings
      const buildingColors = [0x8B4513, 0x696969, 0x2F4F4F, 0x708090];
      
      for (let i = 0; i < buildingCount; i++) {
        const height = 2 + Math.random() * 4; // 2-6 units tall
        const width = 2 + Math.random() * 2; // 2-4 units wide
        const depth = 2 + Math.random() * 2; // 2-4 units deep
        
        const buildingGeometry = new THREE.BoxGeometry(width, height, depth);
        const buildingMaterial = new THREE.MeshLambertMaterial({ 
          color: buildingColors[Math.floor(Math.random() * buildingColors.length)] 
        });
        const building = new THREE.Mesh(buildingGeometry, buildingMaterial);
        
        // Random positions along the street
        const xPos = -8 + Math.random() * 16; // -8 to 8
        building.position.set(xPos, height/2, -2 + Math.random() * 4);
        building.castShadow = true;
        building.receiveShadow = true;
        scene.add(building);
      }
    }
    
    // Trees
    if (aiAnalysis.add_trees) {
      const treeCount = Math.floor(Math.random() * 5) + 2; // 2-6 trees
      const treeColors = [0x228B22, 0x32CD32, 0x006400, 0x228B22];
      
      for (let i = 0; i < treeCount; i++) {
        // Tree trunk
        const trunkHeight = 1.5 + Math.random() * 1.5; // 1.5-3 units tall
        const trunkRadius = 0.1 + Math.random() * 0.2; // 0.1-0.3 radius
        const trunkGeometry = new THREE.CylinderGeometry(trunkRadius, trunkRadius * 1.2, trunkHeight);
        const trunkMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        
        // Random positions along sidewalks
        const xPos = -6 + Math.random() * 12; // -6 to 6
        const zPos = Math.random() > 0.5 ? 4 : -4; // Either side of road
        trunk.position.set(xPos, trunkHeight/2, zPos);
        trunk.castShadow = true;
        trunk.receiveShadow = true;
        scene.add(trunk);
        
        // Tree leaves
        const leafSize = 0.8 + Math.random() * 0.6; // 0.8-1.4 size
        const leavesGeometry = new THREE.SphereGeometry(leafSize, 8, 8);
        const leavesMaterial = new THREE.MeshLambertMaterial({ 
          color: treeColors[Math.floor(Math.random() * treeColors.length)] 
        });
        const leaves = new THREE.Mesh(leavesGeometry, leavesMaterial);
        leaves.position.set(xPos, trunkHeight + leafSize * 0.7, zPos);
        leaves.castShadow = true;
        leaves.receiveShadow = true;
        scene.add(leaves);
      }
    }
    
    // Bushes
    if (aiAnalysis.add_bushes) {
      const bushCount = Math.floor(Math.random() * 6) + 3; // 3-8 bushes
      const bushColors = [0x006400, 0x228B22, 0x32CD32, 0x556B2F];
      
      for (let i = 0; i < bushCount; i++) {
        const bushSize = 0.3 + Math.random() * 0.4; // 0.3-0.7 size
        const bushGeometry = new THREE.SphereGeometry(bushSize, 8, 8);
        const bushMaterial = new THREE.MeshLambertMaterial({ 
          color: bushColors[Math.floor(Math.random() * bushColors.length)] 
        });
        const bush = new THREE.Mesh(bushGeometry, bushMaterial);
        
        // Random positions around buildings and sidewalks
        const xPos = -8 + Math.random() * 16; // -8 to 8
        const zPos = -5 + Math.random() * 10; // -5 to 5
        bush.position.set(xPos, bushSize, zPos);
        bush.castShadow = true;
        bush.receiveShadow = true;
        scene.add(bush);
      }
    }
    
    // Add some decorative elements based on AI suggestions
    if (aiAnalysis.suggested_changes && aiAnalysis.suggested_changes.includes('shade')) {
      // Add awnings or canopies
      const awningGeometry = new THREE.BoxGeometry(2, 0.1, 1);
      const awningMaterial = new THREE.MeshLambertMaterial({ color: 0x8B0000 });
      const awning = new THREE.Mesh(awningGeometry, awningMaterial);
      awning.position.set(-3, 3, 2);
      awning.castShadow = true;
      scene.add(awning);
    }
    
    if (aiAnalysis.suggested_changes && aiAnalysis.suggested_changes.includes('green')) {
      // Add some grass patches
      for (let i = 0; i < 3; i++) {
        const grassGeometry = new THREE.PlaneGeometry(1, 1);
        const grassMaterial = new THREE.MeshLambertMaterial({ color: 0x90EE90 });
        const grass = new THREE.Mesh(grassGeometry, grassMaterial);
        grass.rotation.x = -Math.PI / 2;
        grass.position.set(-4 + i * 2, 0.01, 3);
        scene.add(grass);
      }
    }
    
    // Add some random street furniture
    if (Math.random() > 0.5) {
      // Street lamp
      const lampPostGeometry = new THREE.CylinderGeometry(0.1, 0.1, 3);
      const lampPostMaterial = new THREE.MeshLambertMaterial({ color: 0x696969 });
      const lampPost = new THREE.Mesh(lampPostGeometry, lampPostMaterial);
      lampPost.position.set(4, 1.5, 3);
      lampPost.castShadow = true;
      scene.add(lampPost);
      
      // Lamp light
      const lampGeometry = new THREE.SphereGeometry(0.3, 8, 8);
      const lampMaterial = new THREE.MeshLambertMaterial({ color: 0xFFFF00 });
      const lamp = new THREE.Mesh(lampGeometry, lampMaterial);
      lamp.position.set(4, 3, 3);
      scene.add(lamp);
    }
  };

  // Reset camera to default position
  const resetCamera = () => {
    if (cameraRef.current && controlsRef.current) {
      cameraRef.current.position.set(0, 5, 10);
      cameraRef.current.lookAt(0, 0, 0);
      controlsRef.current.reset();
    }
  };

  // Load new Street View and generate 3D model
  const loadNewView = async () => {
    if (!selectedArea?.bounds) return;
    
    setIsLoading(true);
    setLoadingMessage('Generating random location...');
    
    try {
      // Generate random point
      const randomPoint = generateRandomPoint(selectedArea.bounds);
      setCurrentLocation(randomPoint);
      
      setLoadingMessage('Fetching Street View image...');
      const imageDataUrl = await fetchStreetViewImage(randomPoint.lat, randomPoint.lng);
      
      setLoadingMessage('Analyzing with AI...');
      const aiAnalysis = await analyzeImageWithAI(imageDataUrl);
      
      setLoadingMessage('Building 3D model...');
      build3DModel(aiAnalysis);
      
      setAiSuggestion(aiAnalysis.suggested_changes);
      setIsLoading(false);
      
    } catch (error) {
      console.error('Error loading new view:', error);
      setLoadingMessage('Error loading view. Please try again.');
      setIsLoading(false);
    }
  };

  // Initialize on mount
  useEffect(() => {
    if (selectedArea?.bounds) {
      initThreeJS();
      loadNewView();
    }
    
    return () => {
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
    };
  }, [selectedArea]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (rendererRef.current && cameraRef.current && canvasRef.current) {
        const canvas = canvasRef.current;
        cameraRef.current.aspect = canvas.clientWidth / canvas.clientHeight;
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(canvas.clientWidth, canvas.clientHeight);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!selectedArea) return null;

  return (
    <Container>
      <Header>
        <h2>🌳 3D Urban Heat Island Reduction Model</h2>
        <Controls>
          <ActionButton onClick={loadNewView} disabled={isLoading}>
            🔄 Load Another View
          </ActionButton>
          <CloseButton onClick={onClose}>✕ Close</CloseButton>
        </Controls>
      </Header>
      
      <Canvas>
        <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />
        
        {isLoading && (
          <LoadingOverlay>
            <div>{loadingMessage}</div>
          </LoadingOverlay>
        )}
        
        <ControlsInfo>
          <strong>🎮 Controls:</strong><br/>
          • <strong>Mouse:</strong> Click & drag to rotate<br/>
          • <strong>Scroll:</strong> Zoom in/out<br/>
          • <strong>Right-click:</strong> Pan around<br/>
          • <strong>Mobile:</strong> Touch & drag to rotate, pinch to zoom
        </ControlsInfo>
        
        <ResetCameraButton onClick={resetCamera}>
          📷 Reset Camera
        </ResetCameraButton>
        
        {aiSuggestion && (
          <AISuggestion>
            <strong>🤖 AI Suggestion:</strong> {aiSuggestion}
          </AISuggestion>
        )}
      </Canvas>
    </Container>
  );
};

export default StreetView3D; 