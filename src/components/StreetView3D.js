import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Object types for the scene editor
const OBJECT_TYPES = {
  HOUSE: 'house',
  ROAD: 'road',
  TREE: 'tree',
  SIDEWALK: 'sidewalk',
  STREET_LIGHT: 'street_light',
  BENCH: 'bench'
};

// Object configurations
const OBJECT_CONFIGS = {
  [OBJECT_TYPES.HOUSE]: {
    geometry: new THREE.BoxGeometry(2, 3, 2),
    material: new THREE.MeshLambertMaterial({ color: 0x8B4513 }),
    defaultPosition: [0, 1.5, 0],
    name: 'House',
    rotatable: false
  },
  [OBJECT_TYPES.ROAD]: {
    geometry: new THREE.PlaneGeometry(8, 2),
    material: new THREE.MeshLambertMaterial({ color: 0x2C2C2C }),
    defaultPosition: [0, 0.01, 0],
    rotation: [-Math.PI / 2, 0, 0],
    name: 'Road',
    rotatable: true
  },
  [OBJECT_TYPES.TREE]: {
    geometry: new THREE.CylinderGeometry(0.2, 0.3, 3),
    material: new THREE.MeshLambertMaterial({ color: 0x8B4513 }),
    defaultPosition: [0, 1.5, 0],
    name: 'Tree Trunk',
    rotatable: false
  },
  [OBJECT_TYPES.SIDEWALK]: {
    geometry: new THREE.PlaneGeometry(1.5, 8),
    material: new THREE.MeshLambertMaterial({ color: 0xD3D3D3 }),
    defaultPosition: [0, 0.02, 0],
    rotation: [-Math.PI / 2, 0, 0],
    name: 'Sidewalk',
    rotatable: true
  },
  [OBJECT_TYPES.STREET_LIGHT]: {
    geometry: new THREE.CylinderGeometry(0.1, 0.1, 4),
    material: new THREE.MeshLambertMaterial({ color: 0x696969 }),
    defaultPosition: [0, 2, 0],
    name: 'Street Light',
    rotatable: false
  },
  [OBJECT_TYPES.BENCH]: {
    geometry: new THREE.BoxGeometry(1.5, 0.3, 0.5),
    material: new THREE.MeshLambertMaterial({ color: 0x8B4513 }),
    defaultPosition: [0, 0.15, 0],
    name: 'Bench',
    rotatable: false
  }
};

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
  cursor: ${props => props.editMode ? 'crosshair' : 'default'};
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

const EditorSection = styled.div`
  margin-bottom: 20px;
  padding: 15px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
`;

const EditorTitle = styled.h3`
  margin: 0 0 15px 0;
  color: #333;
  font-size: 16px;
  font-weight: 600;
`;

const ButtonGroup = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 15px;
`;

const AddButton = styled.button`
  background: #28a745;
  color: white;
  border: none;
  border-radius: 6px;
  padding: 8px 12px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 4px;

  &:hover {
    background: #218838;
  }
`;

const RemoveButton = styled.button`
  background: #dc3545;
  color: white;
  border: none;
  border-radius: 6px;
  padding: 8px 12px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: #c82333;
  }
`;

const ObjectList = styled.div`
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid #e9ecef;
  border-radius: 4px;
  background: #f8f9fa;
`;

const ObjectItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  border-bottom: 1px solid #e9ecef;
  background: white;
  cursor: pointer;
  transition: background 0.2s ease;

  &:hover {
    background: #f8f9fa;
  }

  &:last-child {
    border-bottom: none;
  }

  &.selected {
    background: #007bff;
    color: white;
  }
`;

const ObjectName = styled.span`
  font-size: 12px;
  font-weight: 500;
`;

const ObjectPosition = styled.span`
  font-size: 10px;
  color: #666;
  margin-left: 8px;
`;

const ControlPanel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 10px;
`;

const ModeToggle = styled.button`
  background: ${props => props.active ? '#007bff' : '#6c757d'};
  color: white;
  border: none;
  border-radius: 6px;
  padding: 8px 16px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-bottom: 10px;

  &:hover {
    background: ${props => props.active ? '#0056b3' : '#5a6268'};
  }
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
  
  // Editor state
  const [sceneObjects, setSceneObjects] = useState([]);
  const [selectedObject, setSelectedObject] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragPlane] = useState(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));
  const [raycaster] = useState(new THREE.Raycaster());
  const [mouse] = useState(new THREE.Vector2());
  
  // Gizmo state
  const [gizmoGroup, setGizmoGroup] = useState(null);
  const [isRotating, setIsRotating] = useState(false);
  const [rotationAxis, setRotationAxis] = useState(null);

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
        
        // Disable controls when in edit mode
        controls.enabled = !isEditMode;
        
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

    // Clear scene objects list
    setSceneObjects([]);
    setSelectedObject(null);
    
    // Collect all objects to add at once
    const newSceneObjects = [];
    
    if (!geminiData) {
      // Fallback model if no Gemini data
      const buildingGeometry = new THREE.BoxGeometry(2, 4, 2);
      const buildingMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
      const building = new THREE.Mesh(buildingGeometry, buildingMaterial);
      building.position.set(0, 2, 0);
      building.castShadow = true;
      building.userData = { objectId: 'fallback-building' };
      scene.add(building);
      
      // Add to scene objects list
      newSceneObjects.push({
        id: 'fallback-building',
        type: 'ai-building',
        name: 'AI Building',
        mesh: building,
        position: [0, 2, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        rotatable: false
      });
      setSceneObjects(newSceneObjects);
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
      road.userData = { objectId: 'ai-road' };
      scene.add(road);
      
      // Add road to scene objects
      newSceneObjects.push({
        id: 'ai-road',
        type: 'ai-road',
        name: 'AI Road',
        mesh: road,
        position: [0, 0.01, 0],
        rotation: [-Math.PI / 2, 0, 0],
        scale: [1, 1, 1],
        rotatable: true
      });
      
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
      sidewalk.userData = { objectId: 'ai-sidewalk-1' };
      scene.add(sidewalk);
      
      const sidewalk2 = new THREE.Mesh(sidewalkGeometry, sidewalkMaterial);
      sidewalk2.rotation.x = -Math.PI / 2;
      sidewalk2.position.set(2.5 + sidewalkWidth * 0.5, 0.01, 0);
      sidewalk2.userData = { objectId: 'ai-sidewalk-2' };
      scene.add(sidewalk2);
      
      // Add sidewalks to scene objects
      newSceneObjects.push(
        {
          id: 'ai-sidewalk-1',
          type: 'ai-sidewalk',
          name: 'AI Sidewalk 1',
          mesh: sidewalk,
          position: [-2.5 - sidewalkWidth * 0.5, 0.01, 0],
          rotation: [-Math.PI / 2, 0, 0],
          scale: [1, 1, 1],
          rotatable: true
        },
        {
          id: 'ai-sidewalk-2',
          type: 'ai-sidewalk',
          name: 'AI Sidewalk 2',
          mesh: sidewalk2,
          position: [2.5 + sidewalkWidth * 0.5, 0.01, 0],
          rotation: [-Math.PI / 2, 0, 0],
          scale: [1, 1, 1],
          rotatable: true
        }
      );
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
        buildingMesh.userData = { objectId: `ai-building-${index}` };
        scene.add(buildingMesh);
        
        // Add building to scene objects
        newSceneObjects.push({
          id: `ai-building-${index}`,
          type: 'ai-building',
          name: `AI Building ${index + 1}`,
          mesh: buildingMesh,
          position: [xPos, height / 2, -3],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
          rotatable: false
        });
        
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
        building.userData = { objectId: `ai-building-fallback-${i}` };
        scene.add(building);
        
        // Add fallback building to scene objects
        newSceneObjects.push({
          id: `ai-building-fallback-${i}`,
          type: 'ai-building',
          name: `AI Building ${i + 1}`,
          mesh: building,
          position: [-4 + i * 3, height / 2, -3],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
          rotatable: false
        });
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
        trunk.userData = { objectId: `ai-tree-${index}` };
        scene.add(trunk);
        
        // Tree leaves
        const leavesGeometry = new THREE.SphereGeometry(treeSize, 8, 8);
        const leavesMaterial = new THREE.MeshLambertMaterial({ color: treeColor });
        const leaves = new THREE.Mesh(leavesGeometry, leavesMaterial);
        leaves.position.set(xPos, trunkHeight + treeSize * 0.5, zPos);
        leaves.castShadow = true;
        leaves.userData = { objectId: `ai-tree-${index}`, isLeaves: true };
        scene.add(leaves);
        
        // Add tree to scene objects
        newSceneObjects.push({
          id: `ai-tree-${index}`,
          type: 'ai-tree',
          name: `AI Tree ${index + 1}`,
          mesh: trunk,
          leaves: leaves,
          position: [xPos, trunkHeight / 2, zPos],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
          rotatable: false
        });
        
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
        trunk.userData = { objectId: `ai-tree-fallback-${i}` };
        scene.add(trunk);
        
        const leavesGeometry = new THREE.SphereGeometry(1, 8, 8);
        const leavesMaterial = new THREE.MeshLambertMaterial({ color: 0x228B22 });
        const leaves = new THREE.Mesh(leavesGeometry, leavesMaterial);
        leaves.position.set(-6 + i * 2.5, 3.5, 3);
        leaves.castShadow = true;
        leaves.userData = { objectId: `ai-tree-fallback-${i}`, isLeaves: true };
        scene.add(leaves);
        
        // Add fallback tree to scene objects
        newSceneObjects.push({
          id: `ai-tree-fallback-${i}`,
          type: 'ai-tree',
          name: `AI Tree ${i + 1}`,
          mesh: trunk,
          leaves: leaves,
          position: [-6 + i * 2.5, 1.25, 3],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
          rotatable: false
        });
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
          pole.userData = { objectId: `ai-street-light-${index}` };
          scene.add(pole);
          
          const lightGeometry = new THREE.SphereGeometry(0.2, 8, 8);
          const lightMaterial = new THREE.MeshLambertMaterial({ color: 0xFFFF00 });
          const light = new THREE.Mesh(lightGeometry, lightMaterial);
          light.position.set(-3 + index * 6, 4.2, 1.5);
          light.castShadow = true;
          light.userData = { objectId: `ai-street-light-${index}`, isLight: true };
          scene.add(light);
          
          // Add street light to scene objects
          newSceneObjects.push({
            id: `ai-street-light-${index}`,
            type: 'ai-street-light',
            name: `AI Street Light ${index + 1}`,
            mesh: pole,
            light: light,
            position: [-3 + index * 6, 2, 1.5],
            rotation: [0, 0, 0],
            scale: [1, 1, 1],
            rotatable: false
          });
        } else if (feature === 'parking_meters') {
          const meterGeometry = new THREE.BoxGeometry(0.1, 1.5, 0.1);
          const meterMaterial = new THREE.MeshLambertMaterial({ color: 0x4169E1 });
          const meter = new THREE.Mesh(meterGeometry, meterMaterial);
          meter.position.set(-2 + index * 2, 0.75, 1.2);
          meter.castShadow = true;
          meter.userData = { objectId: `ai-parking-meter-${index}` };
          scene.add(meter);
          
          // Add parking meter to scene objects
          newSceneObjects.push({
            id: `ai-parking-meter-${index}`,
            type: 'ai-parking-meter',
            name: `AI Parking Meter ${index + 1}`,
            mesh: meter,
            position: [-2 + index * 2, 0.75, 1.2],
            rotation: [0, 0, 0],
            scale: [1, 1, 1],
            rotatable: false
          });
        } else if (feature === 'benches') {
          const benchGeometry = new THREE.BoxGeometry(1.5, 0.3, 0.5);
          const benchMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
          const bench = new THREE.Mesh(benchGeometry, benchMaterial);
          bench.position.set(-2 + index * 3, 0.15, 1.5);
          bench.castShadow = true;
          bench.userData = { objectId: `ai-bench-${index}` };
          scene.add(bench);
          
          // Add bench to scene objects
          newSceneObjects.push({
            id: `ai-bench-${index}`,
            type: 'ai-bench',
            name: `AI Bench ${index + 1}`,
            mesh: bench,
            position: [-2 + index * 3, 0.15, 1.5],
            rotation: [0, 0, 0],
            scale: [1, 1, 1],
            rotatable: false
          });
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
        trunk.userData = { objectId: `ai-suggested-tree-${i}` };
        scene.add(trunk);
        
        const leavesGeometry = new THREE.SphereGeometry(1, 8, 8);
        const leavesMaterial = new THREE.MeshLambertMaterial({ color: 0x32CD32 });
        const leaves = new THREE.Mesh(leavesGeometry, leavesMaterial);
        leaves.position.set(4 + i * 2, 3.5, -2);
        leaves.castShadow = true;
        leaves.userData = { objectId: `ai-suggested-tree-${i}`, isLeaves: true };
        scene.add(leaves);
        
        // Add suggested tree to scene objects
        newSceneObjects.push({
          id: `ai-suggested-tree-${i}`,
          type: 'ai-suggested-tree',
          name: `AI Suggested Tree ${i + 1}`,
          mesh: trunk,
          leaves: leaves,
          position: [4 + i * 2, 1.25, -2],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
          rotatable: false
        });
      }
    }
    
    // Set all collected objects at once
    console.log('Generated scene objects:', newSceneObjects);
    setSceneObjects(newSceneObjects);
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
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });

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

  // Editor functions
  const addObject = (objectType) => {
    const config = OBJECT_CONFIGS[objectType];
    if (!config) return;

    const object = {
      id: Date.now() + Math.random(),
      type: objectType,
      name: config.name,
      mesh: null,
      position: [...config.defaultPosition],
      rotation: config.rotation ? [...config.rotation] : [0, 0, 0],
      scale: [1, 1, 1],
      rotatable: config.rotatable || false
    };

    // Create the mesh
    const geometry = config.geometry.clone();
    const material = config.material.clone();
    object.mesh = new THREE.Mesh(geometry, material);
    object.mesh.position.set(...object.position);
    object.mesh.rotation.set(...object.rotation);
    object.mesh.castShadow = true;
    object.mesh.receiveShadow = true;
    object.mesh.userData = { objectId: object.id };

    // Add to scene
    sceneRef.current.add(object.mesh);

    // Add tree leaves if it's a tree
    if (objectType === OBJECT_TYPES.TREE) {
      const leavesGeometry = new THREE.SphereGeometry(0.8, 8, 8);
      const leavesMaterial = new THREE.MeshLambertMaterial({ color: 0x228B22 });
      const leaves = new THREE.Mesh(leavesGeometry, leavesMaterial);
      leaves.position.set(object.position[0], object.position[1] + 2.5, object.position[2]);
      leaves.castShadow = true;
      leaves.userData = { objectId: object.id, isLeaves: true };
      sceneRef.current.add(leaves);
      object.leaves = leaves;
    }

    setSceneObjects(prev => [...prev, object]);
    setSelectedObject(object);
  };

  const removeObject = (objectId) => {
    const object = sceneObjects.find(obj => obj.id === objectId);
    if (!object) return;

    // Remove from scene
    if (object.mesh) {
      sceneRef.current.remove(object.mesh);
    }
    if (object.leaves) {
      sceneRef.current.remove(object.leaves);
    }
    if (object.light) {
      sceneRef.current.remove(object.light);
    }

    setSceneObjects(prev => prev.filter(obj => obj.id !== objectId));
    if (selectedObject?.id === objectId) {
      setSelectedObject(null);
    }
  };

  const updateObjectPosition = (objectId, x, y, z) => {
    const object = sceneObjects.find(obj => obj.id === objectId);
    if (!object) return;

    object.position = [x, y, z];
    if (object.mesh) {
      object.mesh.position.set(x, y, z);
    }
    
    // Handle special object types
    if (object.leaves) {
      object.leaves.position.set(x, y + 2.5, z);
    }
    if (object.light) {
      object.light.position.set(x, y + 2.2, z);
    }

    setSceneObjects(prev => [...prev]); // Trigger re-render
  };

  const updateObjectRotation = (objectId, x, y, z) => {
    const object = sceneObjects.find(obj => obj.id === objectId);
    if (!object) return;

    object.rotation = [x, y, z];
    if (object.mesh) {
      object.mesh.rotation.set(x, y, z);
    }
    
    // Handle special object types
    if (object.leaves) {
      object.leaves.rotation.set(x, y, z);
    }
    if (object.light) {
      object.light.rotation.set(x, y, z);
    }

    setSceneObjects(prev => [...prev]); // Trigger re-render
  };

  const updateObjectHighlight = (object, isSelected) => {
    if (!object.mesh) return;

    if (isSelected) {
      // Create highlight material
      const highlightMaterial = object.mesh.material.clone();
      highlightMaterial.emissive = new THREE.Color(0x444444);
      highlightMaterial.emissiveIntensity = 0.3;
      object.mesh.material = highlightMaterial;
    } else {
      // Restore original material based on object type
      if (object.type.startsWith('ai-')) {
        // For AI-generated objects, restore their original materials
        if (object.type === 'ai-road') {
          object.mesh.material = new THREE.MeshLambertMaterial({ color: 0x2C2C2C });
        } else if (object.type === 'ai-sidewalk') {
          object.mesh.material = new THREE.MeshLambertMaterial({ color: 0xD3D3D3 });
        } else if (object.type === 'ai-building') {
          object.mesh.material = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
        } else if (object.type === 'ai-tree' || object.type === 'ai-suggested-tree') {
          object.mesh.material = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
        } else if (object.type === 'ai-street-light') {
          object.mesh.material = new THREE.MeshLambertMaterial({ color: 0x696969 });
        } else if (object.type === 'ai-parking-meter') {
          object.mesh.material = new THREE.MeshLambertMaterial({ color: 0x4169E1 });
        } else if (object.type === 'ai-bench') {
          object.mesh.material = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
        }
      } else {
        // For user-added objects, use config
        const config = OBJECT_CONFIGS[object.type];
        if (config) {
          object.mesh.material = config.material.clone();
          object.mesh.material.castShadow = true;
          object.mesh.material.receiveShadow = true;
        }
      }
    }

    // Handle special object types
    if (object.leaves) {
      if (isSelected) {
        const leavesHighlightMaterial = object.leaves.material.clone();
        leavesHighlightMaterial.emissive = new THREE.Color(0x444444);
        leavesHighlightMaterial.emissiveIntensity = 0.3;
        object.leaves.material = leavesHighlightMaterial;
      } else {
        const leavesMaterial = new THREE.MeshLambertMaterial({ color: 0x228B22 });
        object.leaves.material = leavesMaterial;
        object.leaves.castShadow = true;
      }
    }
    
    if (object.light) {
      if (isSelected) {
        const lightHighlightMaterial = object.light.material.clone();
        lightHighlightMaterial.emissive = new THREE.Color(0x444444);
        lightHighlightMaterial.emissiveIntensity = 0.3;
        object.light.material = lightHighlightMaterial;
      } else {
        const lightMaterial = new THREE.MeshLambertMaterial({ color: 0xFFFF00 });
        object.light.material = lightMaterial;
        object.light.castShadow = true;
      }
    }
  };

  const handleMouseDown = (event) => {
    if (!sceneRef.current || !cameraRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, cameraRef.current);
    const intersects = raycaster.intersectObjects(sceneRef.current.children, true);

    console.log('Mouse click intersects:', intersects.map(i => ({
      object: i.object.name || i.object.type,
      userData: i.object.userData,
      objectId: i.object.userData?.objectId
    })));

    if (intersects.length > 0) {
      const intersectedObject = intersects[0].object;
      
      // Check if clicked on gizmo
      if (intersectedObject.userData.type === 'translation' || intersectedObject.userData.type === 'rotation') {
        if (isEditMode && selectedObject) {
          setIsDragging(true);
          if (intersectedObject.userData.type === 'rotation') {
            setRotationAxis(intersectedObject.userData.axis);
            setIsRotating(true);
          } else {
            setRotationAxis(intersectedObject.userData.axis);
            setIsRotating(false);
          }
        }
        return;
      }
      
      const objectId = intersectedObject.userData.objectId;
      
      console.log('Looking for object with ID:', objectId);
      console.log('Available scene objects:', sceneObjects.map(obj => ({ id: obj.id, name: obj.name, type: obj.type })));
      
      if (objectId) {
        const object = sceneObjects.find(obj => obj.id === objectId);
        if (object) {
          setSelectedObject(object);
          // NO direct dragging - only gizmo movement allowed
        }
      } else {
        // Clicked on something that's not an editable object
        setSelectedObject(null);
      }
    } else {
      // Clicked on empty space
      setSelectedObject(null);
    }
  };

  const handleMouseMove = (event) => {
    if (!isEditMode || !isDragging || !selectedObject || !sceneRef.current || !cameraRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    if (isRotating && rotationAxis) {
      // Handle rotation
      const deltaX = event.movementX || 0;
      const deltaY = event.movementY || 0;
      const rotationSpeed = 0.01;
      
      const currentRotation = [...selectedObject.rotation];
      
      if (rotationAxis === 'x') {
        currentRotation[0] += deltaY * rotationSpeed;
      } else if (rotationAxis === 'y') {
        currentRotation[1] += deltaX * rotationSpeed;
      } else if (rotationAxis === 'z') {
        currentRotation[2] += deltaX * rotationSpeed;
      }
      
      updateObjectRotation(selectedObject.id, currentRotation[0], currentRotation[1], currentRotation[2]);
    } else if (rotationAxis && !isRotating) {
      // Handle gizmo translation (axis-constrained movement) - improved
      const deltaX = event.movementX || 0;
      const deltaY = event.movementY || 0;
      const movementSpeed = 0.08; // Increased for better responsiveness
      
      const currentPosition = [...selectedObject.position];
      
      if (rotationAxis === 'x') {
        currentPosition[0] += deltaX * movementSpeed;
      } else if (rotationAxis === 'y') {
        currentPosition[1] -= deltaY * movementSpeed;
      } else if (rotationAxis === 'z') {
        currentPosition[2] += deltaY * movementSpeed;
      }
      
      updateObjectPosition(selectedObject.id, currentPosition[0], currentPosition[1], currentPosition[2]);
    }
    // Removed free translation - only gizmo movement allowed
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsRotating(false);
    setRotationAxis(null);
  };

  const toggleEditMode = () => {
    const newEditMode = !isEditMode;
    setIsEditMode(newEditMode);
    
    if (!newEditMode) {
      // Disable edit mode - clear selection and stop any dragging
      setSelectedObject(null);
      setIsDragging(false);
      setIsRotating(false);
      setRotationAxis(null);
    }
  };

  const createGizmo = (object) => {
    if (!object || !object.mesh) return null;

    const gizmo = new THREE.Group();
    const objectConfig = OBJECT_CONFIGS[object.type];
    
    // Only show rotation gizmo for rotatable objects
    if (objectConfig && objectConfig.rotatable) {
      // Y-axis rotation ring (green)
      const yRingGeometry = new THREE.RingGeometry(1.5, 1.7, 32);
      const yRingMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x00ff00, 
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.7
      });
      const yRing = new THREE.Mesh(yRingGeometry, yRingMaterial);
      yRing.rotation.x = Math.PI / 2;
      yRing.userData = { axis: 'y', type: 'rotation' };
      gizmo.add(yRing);

      // X-axis rotation ring (red)
      const xRingGeometry = new THREE.RingGeometry(1.5, 1.7, 32);
      const xRingMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xff0000, 
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.7
      });
      const xRing = new THREE.Mesh(xRingGeometry, xRingMaterial);
      xRing.rotation.z = Math.PI / 2;
      xRing.userData = { axis: 'x', type: 'rotation' };
      gizmo.add(xRing);

      // Z-axis rotation ring (blue)
      const zRingGeometry = new THREE.RingGeometry(1.5, 1.7, 32);
      const zRingMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x0000ff, 
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.7
      });
      const zRing = new THREE.Mesh(zRingGeometry, zRingMaterial);
      zRing.userData = { axis: 'z', type: 'rotation' };
      gizmo.add(zRing);
    }

    // Movement arrows for all objects
    const arrowLength = 1.5;
    const arrowHeadLength = 0.3;
    const arrowHeadWidth = 0.2;

    // X-axis arrow (red)
    const xArrow = new THREE.ArrowHelper(
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(0, 0, 0),
      arrowLength,
      0xff0000,
      arrowHeadLength,
      arrowHeadWidth
    );
    xArrow.userData = { axis: 'x', type: 'translation' };
    gizmo.add(xArrow);

    // Add invisible clickable cylinder for X arrow
    const xCylinder = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.1, arrowLength, 8),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })
    );
    xCylinder.rotation.z = Math.PI / 2;
    xCylinder.position.x = arrowLength / 2;
    xCylinder.userData = { axis: 'x', type: 'translation' };
    gizmo.add(xCylinder);

    // Y-axis arrow (green)
    const yArrow = new THREE.ArrowHelper(
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(0, 0, 0),
      arrowLength,
      0x00ff00,
      arrowHeadLength,
      arrowHeadWidth
    );
    yArrow.userData = { axis: 'y', type: 'translation' };
    gizmo.add(yArrow);

    // Add invisible clickable cylinder for Y arrow
    const yCylinder = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.1, arrowLength, 8),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })
    );
    yCylinder.position.y = arrowLength / 2;
    yCylinder.userData = { axis: 'y', type: 'translation' };
    gizmo.add(yCylinder);

    // Z-axis arrow (blue)
    const zArrow = new THREE.ArrowHelper(
      new THREE.Vector3(0, 0, 1),
      new THREE.Vector3(0, 0, 0),
      arrowLength,
      0x0000ff,
      arrowHeadLength,
      arrowHeadWidth
    );
    zArrow.userData = { axis: 'z', type: 'translation' };
    gizmo.add(zArrow);

    // Add invisible clickable cylinder for Z arrow
    const zCylinder = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.1, arrowLength, 8),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })
    );
    zCylinder.rotation.x = Math.PI / 2;
    zCylinder.position.z = arrowLength / 2;
    zCylinder.userData = { axis: 'z', type: 'translation' };
    gizmo.add(zCylinder);

    return gizmo;
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Backspace' && selectedObject) {
      event.preventDefault();
      removeObject(selectedObject.id);
    }
  };

  useEffect(() => {
    window.addEventListener('resize', handleResize);
    window.addEventListener('keydown', handleKeyDown);
    
    // Add mouse event listeners for editor
    if (canvasRef.current) {
      canvasRef.current.addEventListener('mousedown', handleMouseDown);
      canvasRef.current.addEventListener('mousemove', handleMouseMove);
      canvasRef.current.addEventListener('mouseup', handleMouseUp);
    }
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
      // Clean up controls
      if (controlsRef.current) {
        controlsRef.current.dispose();
      }
      // Clean up mouse event listeners
      if (canvasRef.current) {
        canvasRef.current.removeEventListener('mousedown', handleMouseDown);
        canvasRef.current.removeEventListener('mousemove', handleMouseMove);
        canvasRef.current.removeEventListener('mouseup', handleMouseUp);
      }
    };
  }, [isEditMode, isDragging, selectedObject]);

  // Update controls when edit mode changes
  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.enabled = !isEditMode;
    }
  }, [isEditMode]);

  // Update object highlights and gizmo when selection changes
  useEffect(() => {
    // Remove existing gizmo
    if (gizmoGroup && sceneRef.current) {
      sceneRef.current.remove(gizmoGroup);
      setGizmoGroup(null);
    }

    sceneObjects.forEach(object => {
      const isSelected = selectedObject?.id === object.id;
      updateObjectHighlight(object, isSelected);
    });

    // Add gizmo for selected object ONLY when edit mode is ON
    if (selectedObject && isEditMode && sceneRef.current) {
      const gizmo = createGizmo(selectedObject);
      if (gizmo) {
        gizmo.position.copy(selectedObject.mesh.position);
        sceneRef.current.add(gizmo);
        setGizmoGroup(gizmo);
      }
    }
  }, [selectedObject, sceneObjects, isEditMode]);

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
            <Canvas ref={canvasRef} editMode={isEditMode} />
            {loading && (
              <LoadingOverlay>
                <div>{loadingMessage}</div>
              </LoadingOverlay>
            )}
          </LeftPanel>
          
          <RightPanel>
            <EditorSection>
              <EditorTitle>🎨 Scene Editor</EditorTitle>
              <ModeToggle active={isEditMode} onClick={toggleEditMode}>
                {isEditMode ? '🖱️ Edit Mode ON' : '🖱️ Edit Mode OFF'}
              </ModeToggle>
              
              <ButtonGroup>
                <AddButton onClick={() => addObject(OBJECT_TYPES.HOUSE)}>
                  🏠 Add House
                </AddButton>
                <AddButton onClick={() => addObject(OBJECT_TYPES.ROAD)}>
                  🛣️ Add Road
                </AddButton>
                <AddButton onClick={() => addObject(OBJECT_TYPES.TREE)}>
                  🌳 Add Tree
                </AddButton>
                <AddButton onClick={() => addObject(OBJECT_TYPES.SIDEWALK)}>
                  🚶 Add Sidewalk
                </AddButton>
                <AddButton onClick={() => addObject(OBJECT_TYPES.STREET_LIGHT)}>
                  💡 Add Street Light
                </AddButton>
                <AddButton onClick={() => addObject(OBJECT_TYPES.BENCH)}>
                  🪑 Add Bench
                </AddButton>
              </ButtonGroup>

              {sceneObjects.length > 0 && (
                <>
                  <EditorTitle>📋 Scene Objects</EditorTitle>
                  <ObjectList>
                    {sceneObjects.map((obj) => (
                      <ObjectItem
                        key={obj.id}
                        className={selectedObject?.id === obj.id ? 'selected' : ''}
                        onClick={() => setSelectedObject(obj)}
                      >
                        <div>
                          <ObjectName>{obj.name}</ObjectName>
                          <ObjectPosition>
                            ({obj.position[0].toFixed(1)}, {obj.position[1].toFixed(1)}, {obj.position[2].toFixed(1)})
                          </ObjectPosition>
                        </div>
                        <RemoveButton onClick={(e) => {
                          e.stopPropagation();
                          removeObject(obj.id);
                        }}>
                          ✕
                        </RemoveButton>
                      </ObjectItem>
                    ))}
                  </ObjectList>
                </>
              )}

              {selectedObject && (
                <ControlPanel>
                  <EditorTitle>🎯 Selected: {selectedObject.name}</EditorTitle>
                  <InfoText style={{ fontSize: '11px', color: '#666', marginBottom: '10px' }}>
                    • Use colored arrows to move (in edit mode)
                  </InfoText>
                  {selectedObject.rotatable && (
                    <InfoText style={{ fontSize: '11px', color: '#007bff', marginBottom: '10px' }}>
                      • Use colored rings to rotate
                    </InfoText>
                  )}
                  <InfoText style={{ fontSize: '11px', color: '#dc3545', marginBottom: '10px' }}>
                    • Press Backspace to delete
                  </InfoText>
                </ControlPanel>
              )}
            </EditorSection>

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
              {!isEditMode && (
                <>
                  <InfoText style={{ color: '#28a745', fontWeight: 'bold', marginTop: '10px' }}>
                    🎯 Object Selection:
                  </InfoText>
                  <InfoText style={{ fontSize: '12px' }}>
                    • Click objects to select them (highlighted)
                  </InfoText>
                  <InfoText style={{ fontSize: '12px' }}>
                    • Press Backspace to delete selected object
                  </InfoText>
                  <InfoText style={{ fontSize: '12px' }}>
                    • Enable Edit Mode to move and rotate objects
                  </InfoText>
                </>
              )}
              {isEditMode && (
                <>
                  <InfoText style={{ color: '#007bff', fontWeight: 'bold', marginTop: '10px' }}>
                    ✏️ Edit Mode Active:
                  </InfoText>
                  <InfoText style={{ fontSize: '12px' }}>
                    • Click objects to select them
                  </InfoText>
                  <InfoText style={{ fontSize: '12px' }}>
                    • Use colored arrows to move along axes
                  </InfoText>
                  <InfoText style={{ fontSize: '12px' }}>
                    • Use colored rings to rotate (roads/sidewalks)
                  </InfoText>
                  <InfoText style={{ fontSize: '12px' }}>
                    • Press Backspace to delete selected object
                  </InfoText>
                </>
              )}
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