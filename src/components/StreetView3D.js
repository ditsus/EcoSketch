import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
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
        
        // Add OrbitControls for user camera control
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true; // Smooth camera movement
        controls.dampingFactor = 0.05;
        controls.screenSpacePanning = false;
        controls.minDistance = 3; // Minimum zoom distance
        controls.maxDistance = 50; // Maximum zoom distance
        controls.maxPolarAngle = Math.PI / 2; // Prevent going below ground
        controls.target.set(0, 2, 0); // Look at center of scene
        
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
        controlsRef.current = controls;
        
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

    // Helper function to get building color from description
    const getBuildingColor = (colorDesc) => {
      const colorMap = {
        'red': 0x8B0000, 'brick': 0x8B0000, 'brown': 0x8B4513, 'tan': 0xD2B48C,
        'gray': 0x696969, 'grey': 0x696969, 'white': 0xFFFFFF, 'cream': 0xF5F5DC,
        'blue': 0x4169E1, 'green': 0x228B22, 'yellow': 0xFFD700, 'orange': 0xFFA500,
        'black': 0x000000, 'dark': 0x2F4F4F, 'light': 0xD3D3D3
      };
      
      for (const [key, color] of Object.entries(colorMap)) {
        if (colorDesc.toLowerCase().includes(key)) {
          return color;
        }
      }
      return 0x8B4513; // Default brown
    };

    // Helper function to get building height from description
    const getBuildingHeight = (heightDesc) => {
      const heightMap = {
        'low': 2 + Math.random() * 1,      // 2-3 units
        'medium': 3 + Math.random() * 2,   // 3-5 units
        'high': 5 + Math.random() * 3,     // 5-8 units
        'tall': 8 + Math.random() * 4      // 8-12 units
      };
      
      for (const [key, height] of Object.entries(heightMap)) {
        if (heightDesc.toLowerCase().includes(key)) {
          return height;
        }
      }
      return 3 + Math.random() * 2; // Default medium
    };

    // Generate road based on detailed data
    if (geminiData.has_road) {
      const roadWidth = geminiData.road_width === 'wide' ? 3 : geminiData.road_width === 'narrow' ? 1.5 : 2;
      const roadLanes = geminiData.road_lanes || 2;
      
      const roadGeometry = new THREE.PlaneGeometry(12, roadWidth);
      const roadMaterial = new THREE.MeshLambertMaterial({ color: 0x2C2C2C });
      const road = new THREE.Mesh(roadGeometry, roadMaterial);
      road.rotation.x = -Math.PI / 2;
      road.position.set(0, 0.01, 0);
      scene.add(road);
      
      // Add lane markings based on number of lanes
      if (roadLanes >= 2) {
        const markingGeometry = new THREE.PlaneGeometry(0.15, roadWidth * 0.8);
        const markingMaterial = new THREE.MeshLambertMaterial({ color: 0xFFFFFF });
        
        // Center line
        const centerMarking = new THREE.Mesh(markingGeometry, markingMaterial);
        centerMarking.rotation.x = -Math.PI / 2;
        centerMarking.position.set(0, 0.02, 0);
        scene.add(centerMarking);
        
        // Side lines
        const sideMarking1 = new THREE.Mesh(markingGeometry, markingMaterial);
        sideMarking1.rotation.x = -Math.PI / 2;
        sideMarking1.position.set(-roadWidth * 0.4, 0.02, 0);
        scene.add(sideMarking1);
        
        const sideMarking2 = new THREE.Mesh(markingGeometry, markingMaterial);
        sideMarking2.rotation.x = -Math.PI / 2;
        sideMarking2.position.set(roadWidth * 0.4, 0.02, 0);
        scene.add(sideMarking2);
      }
    }

    // Generate sidewalk based on detailed data
    if (geminiData.has_sidewalk) {
      const sidewalkWidth = geminiData.sidewalk_width === 'wide' ? 2 : geminiData.sidewalk_width === 'narrow' ? 1 : 1.5;
      const sidewalkGeometry = new THREE.PlaneGeometry(sidewalkWidth, 12);
      const sidewalkMaterial = new THREE.MeshLambertMaterial({ color: 0xD3D3D3 });
      
      const sidewalk = new THREE.Mesh(sidewalkGeometry, sidewalkMaterial);
      sidewalk.rotation.x = -Math.PI / 2;
      sidewalk.position.set(-2.5 - sidewalkWidth * 0.5, 0.01, 0);
      scene.add(sidewalk);
      
      const sidewalk2 = new THREE.Mesh(sidewalkGeometry, sidewalkMaterial);
      sidewalk2.rotation.x = -Math.PI / 2;
      sidewalk2.position.set(2.5 + sidewalkWidth * 0.5, 0.01, 0);
      scene.add(sidewalk2);
    }

    // Generate buildings based on detailed building data
    if (geminiData.has_building && geminiData.building_details) {
      geminiData.building_details.forEach((building, index) => {
        const height = getBuildingHeight(building.height);
        const width = building.style === 'apartment' ? 2.5 : 1.5 + Math.random() * 1;
        const depth = building.style === 'apartment' ? 2.5 : 1.5 + Math.random() * 1;
        const color = getBuildingColor(building.color);
        
        // Position based on building position description
        let xPos = 0;
        if (building.position === 'left') xPos = -4 - index * 2;
        else if (building.position === 'right') xPos = 4 + index * 2;
        else xPos = -2 + index * 3; // center
        
        const buildingGeometry = new THREE.BoxGeometry(width, height, depth);
        const buildingMaterial = new THREE.MeshLambertMaterial({ color });
        const buildingMesh = new THREE.Mesh(buildingGeometry, buildingMaterial);
        buildingMesh.position.set(xPos, height / 2, -3);
        buildingMesh.castShadow = true;
        scene.add(buildingMesh);
        
        // Add windows based on window description
        if (building.windows !== 'none') {
          const windowCount = building.windows === 'many' ? 3 : building.windows === 'few' ? 1 : 2;
          const windowGeometry = new THREE.PlaneGeometry(0.3, 0.4);
          const windowMaterial = new THREE.MeshLambertMaterial({ color: 0x87CEEB });
          
          for (let j = 0; j < Math.floor(height / 1.5); j++) {
            for (let k = 0; k < windowCount; k++) {
              const window = new THREE.Mesh(windowGeometry, windowMaterial);
              window.position.set(
                xPos + (k - (windowCount - 1) / 2) * 0.4, 
                1 + j * 1.5, 
                -3 + depth / 2 + 0.01
              );
              scene.add(window);
            }
          }
        }
        
        // Add roof based on roof type
        if (building.roof_type === 'pitched') {
          const roofGeometry = new THREE.ConeGeometry(width * 0.7, 1, 4);
          const roofMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
          const roof = new THREE.Mesh(roofGeometry, roofMaterial);
          roof.position.set(xPos, height + 0.5, -3);
          roof.castShadow = true;
          scene.add(roof);
        }
      });
    } else if (geminiData.has_building) {
      // Fallback for basic building data
      const buildingCount = geminiData.building_count || 1;
      for (let i = 0; i < buildingCount; i++) {
        const height = 3 + Math.random() * 4;
        const width = 1.5 + Math.random() * 1;
        const depth = 1.5 + Math.random() * 1;
        
        const buildingGeometry = new THREE.BoxGeometry(width, height, depth);
        const buildingMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
        const building = new THREE.Mesh(buildingGeometry, buildingMaterial);
        building.position.set(-4 + i * 3, height / 2, -3);
        building.castShadow = true;
        scene.add(building);
      }
    }

    // Generate trees based on detailed tree data
    if (geminiData.add_trees && geminiData.tree_details) {
      geminiData.tree_details.forEach((tree, index) => {
        const treeSize = tree.size === 'large' ? 1.5 : tree.size === 'small' ? 0.8 : 1.2;
        const treeType = tree.type || 'deciduous';
        const treeColor = treeType === 'evergreen' ? 0x006400 : treeType === 'palm' ? 0x228B22 : 0x32CD32;
        
        // Position based on tree position description
        let xPos = 0, zPos = 0;
        if (tree.position === 'sidewalk') {
          xPos = index % 2 === 0 ? -3 : 3;
          zPos = index * 2 - 4;
        } else if (tree.position === 'median') {
          xPos = 0;
          zPos = index * 2 - 4;
        } else {
          xPos = -6 + index * 2.5;
          zPos = 3;
        }
        
        // Tree trunk
        const trunkHeight = treeSize * 2.5;
        const trunkGeometry = new THREE.CylinderGeometry(0.15 * treeSize, 0.2 * treeSize, trunkHeight);
        const trunkMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.position.set(xPos, trunkHeight / 2, zPos);
        trunk.castShadow = true;
        scene.add(trunk);
        
        // Tree leaves
        const leavesGeometry = new THREE.SphereGeometry(treeSize, 8, 8);
        const leavesMaterial = new THREE.MeshLambertMaterial({ color: treeColor });
        const leaves = new THREE.Mesh(leavesGeometry, leavesMaterial);
        leaves.position.set(xPos, trunkHeight + treeSize * 0.5, zPos);
        leaves.castShadow = true;
        scene.add(leaves);
        
        // Additional foliage for larger trees
        if (treeSize > 1) {
          const leaves2 = new THREE.Mesh(leavesGeometry, leavesMaterial);
          leaves2.position.set(xPos + 0.3, trunkHeight + treeSize * 0.8, zPos + 0.2);
          leaves2.scale.set(0.8, 0.8, 0.8);
          leaves2.castShadow = true;
          scene.add(leaves2);
        }
      });
    } else if (geminiData.add_trees) {
      // Fallback for basic tree data
      const treeCount = geminiData.tree_count || 2;
      for (let i = 0; i < treeCount; i++) {
        const trunkGeometry = new THREE.CylinderGeometry(0.15, 0.2, 2.5);
        const trunkMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.position.set(-6 + i * 2.5, 1.25, 3);
        trunk.castShadow = true;
        scene.add(trunk);
        
        const leavesGeometry = new THREE.SphereGeometry(1, 8, 8);
        const leavesMaterial = new THREE.MeshLambertMaterial({ color: 0x228B22 });
        const leaves = new THREE.Mesh(leavesGeometry, leavesMaterial);
        leaves.position.set(-6 + i * 2.5, 3.5, 3);
        leaves.castShadow = true;
        scene.add(leaves);
      }
    }

    // Add street features based on detailed data
    if (geminiData.street_features) {
      geminiData.street_features.forEach((feature, index) => {
        if (feature === 'street_lights') {
          const poleGeometry = new THREE.CylinderGeometry(0.05, 0.05, 4);
          const poleMaterial = new THREE.MeshLambertMaterial({ color: 0x696969 });
          const pole = new THREE.Mesh(poleGeometry, poleMaterial);
          pole.position.set(-3 + index * 6, 2, 1.5);
          pole.castShadow = true;
          scene.add(pole);
          
          const lightGeometry = new THREE.SphereGeometry(0.2, 8, 8);
          const lightMaterial = new THREE.MeshLambertMaterial({ color: 0xFFFF00 });
          const light = new THREE.Mesh(lightGeometry, lightMaterial);
          light.position.set(-3 + index * 6, 4.2, 1.5);
          light.castShadow = true;
          scene.add(light);
        } else if (feature === 'parking_meters') {
          const meterGeometry = new THREE.BoxGeometry(0.1, 1.5, 0.1);
          const meterMaterial = new THREE.MeshLambertMaterial({ color: 0x4169E1 });
          const meter = new THREE.Mesh(meterGeometry, meterMaterial);
          meter.position.set(-2 + index * 2, 0.75, 1.2);
          meter.castShadow = true;
          scene.add(meter);
        } else if (feature === 'benches') {
          const benchGeometry = new THREE.BoxGeometry(1.5, 0.3, 0.5);
          const benchMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
          const bench = new THREE.Mesh(benchGeometry, benchMaterial);
          bench.position.set(-2 + index * 3, 0.15, 1.5);
          bench.castShadow = true;
          scene.add(bench);
        }
      });
    }

    // Add suggested improvements
    if (geminiData.suggested_changes && geminiData.suggested_changes.toLowerCase().includes('tree')) {
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

      const prompt = `Analyze this urban street image in detail and return a comprehensive JSON object describing the scene for 3D model generation:

      {
        "has_road": boolean,
        "has_sidewalk": boolean,
        "has_building": boolean,
        "add_trees": boolean,
        "building_count": number,
        "tree_count": number,
        "road_type": string,
        "road_width": string,
        "road_lanes": number,
        "sidewalk_width": string,
        "building_details": [
          {
            "position": "left|right|center",
            "height": "low|medium|high|tall",
            "style": "residential|commercial|industrial|apartment",
            "color": "description",
            "windows": "many|few|none",
            "roof_type": "flat|pitched|modern"
          }
        ],
        "tree_details": [
          {
            "position": "sidewalk|median|yard",
            "size": "small|medium|large",
            "type": "deciduous|evergreen|palm",
            "density": "sparse|moderate|dense"
          }
        ],
        "street_features": ["street_lights", "parking_meters", "benches", "bike_lanes", "bus_stops"],
        "building_materials": ["brick", "concrete", "glass", "wood", "metal"],
        "suggested_changes": string,
        "analysis": string,
        "scene_composition": "description of overall layout and positioning"
      }
      
      Be very specific about building positions, heights, styles, and materials. Describe the exact layout as if you're creating a 3D model. Focus on urban heat island reduction opportunities.`;

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
      
            // Parse JSON response - handle both single and double quotes
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        let jsonString = jsonMatch[0];
        
        // Convert single quotes to double quotes for valid JSON
        jsonString = jsonString.replace(/'/g, '"');
        
        // Handle unquoted property names
        jsonString = jsonString.replace(/(\w+):/g, '"$1":');
        
        try {
          const geminiResponse = JSON.parse(jsonString);
          setGeminiData(geminiResponse);
          
          const analysis = `Location Analysis for ${area.point?.areaName || 'Selected Point'}:
          
🌡️ UHI Intensity: ${area.point?.uhiIntensity || 'N/A'}°C hotter than rural average

🏗️ Urban Elements Detected:
${geminiResponse.has_road ? `• Road: ${geminiResponse.road_type || 'standard'} (${geminiResponse.road_lanes || 2} lanes)` : '• No road detected'}
${geminiResponse.has_sidewalk ? `• Sidewalk: ${geminiResponse.sidewalk_width || 'standard'} width` : '• No sidewalk detected'}
${geminiResponse.has_building ? `• ${geminiResponse.building_count || 1} building(s) present` : '• No buildings detected'}
${geminiResponse.add_trees ? `• ${geminiResponse.tree_count || 0} tree(s) present` : '• No trees detected'}

${geminiResponse.building_details ? `🏢 Building Details:
${geminiResponse.building_details.map((b, i) => 
  `  ${i+1}. ${b.style} building (${b.height}, ${b.color}, ${b.windows} windows)`
).join('\n')}` : ''}

${geminiResponse.tree_details ? `🌳 Tree Details:
${geminiResponse.tree_details.map((t, i) => 
  `  ${i+1}. ${t.size} ${t.type} tree in ${t.position}`
).join('\n')}` : ''}

${geminiResponse.street_features ? `🛣️ Street Features:
• ${geminiResponse.street_features.join(', ')}` : ''}

${geminiResponse.scene_composition ? `🎨 Scene Layout:
${geminiResponse.scene_composition}` : ''}

🌱 AI Recommendations:
${geminiResponse.suggested_changes || 'No specific recommendations available'}

📊 Analysis:
${geminiResponse.analysis || 'Analysis not available'}`;

          setGeminiAnalysis(analysis);
          return geminiResponse;
        } catch (parseError) {
          console.error('Error parsing JSON from Gemini:', parseError);
          console.log('Raw JSON string:', jsonString);
          throw new Error('Invalid JSON format in Gemini response');
        }
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
    if (!sceneRef.current || !cameraRef.current || !rendererRef.current || !controlsRef.current) return;
    
    requestAnimationFrame(animate);
    
    // Update controls
    controlsRef.current.update();
    
    // Subtle tree swaying animation
    const time = Date.now() * 0.0005;
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
    if (!canvasRef.current || !cameraRef.current || !rendererRef.current || !controlsRef.current) return;
    
    const width = canvasRef.current.clientWidth;
    const height = canvasRef.current.clientHeight;
    
    cameraRef.current.aspect = width / height;
    cameraRef.current.updateProjectionMatrix();
    rendererRef.current.setSize(width, height);
    controlsRef.current.update();
  };

  useEffect(() => {
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      // Clean up controls
      if (controlsRef.current) {
        controlsRef.current.dispose();
      }
    };
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
            
            <InfoSection>
              <InfoTitle>🎮 Camera Controls</InfoTitle>
              <InfoText>
                <strong>Mouse:</strong> Click and drag to rotate view
              </InfoText>
              <InfoText>
                <strong>Scroll:</strong> Zoom in/out
              </InfoText>
              <InfoText>
                <strong>Right-click:</strong> Pan view
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