import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import * as THREE from 'three';

const AvatarRenderer = forwardRef(({
  avatarUrl,
  animationState = 'idle',
  onLoad = () => {},
  onError = () => {},
  lipSyncData = null,
  isVisible = true
}, ref) => {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const avatarRef = useRef(null);
  const mixerRef = useRef(null);
  const clockRef = useRef(new THREE.Clock());
  const animationFrameRef = useRef(null);
  const lightsRef = useRef([]);
  
  // Animation state
  const [currentAction, setCurrentAction] = useState(null);
  const [animations, setAnimations] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);

  // Morph targets for lip sync
  const morphTargetsRef = useRef({});
  const lipSyncTimeoutRef = useRef(null);

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    updateLipSync: (lipSyncData) => {
      updateMouthMorphTargets(lipSyncData);
    },
    changeAnimation: (animationType) => {
      playAnimation(animationType);
    },
    getAvatarObject: () => avatarRef.current,
    resetAvatar: () => {
      resetAvatarPosition();
    }
  }));

  // Initialize Three.js scene
  const initScene = () => {
    if (!mountRef.current) return;

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    scene.background.setHex(0x000000);
    scene.background = null; // Transparent background
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 1.6, 3);
    camera.lookAt(0, 1.6, 0);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      alpha: true,
      preserveDrawingBuffer: true 
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // Enable tone mapping for better lighting
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting setup
    setupLighting(scene);

    // Start render loop
    animate();

    console.log('✅ Three.js scene initialized');
  };

  // Setup lighting for avatar
  const setupLighting = (scene) => {
    // Clear existing lights
    lightsRef.current.forEach(light => scene.remove(light));
    lightsRef.current = [];

    // Ambient light for general illumination
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);
    lightsRef.current.push(ambientLight);

    // Main directional light (key light)
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.0);
    keyLight.position.set(2, 3, 3);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 10;
    scene.add(keyLight);
    lightsRef.current.push(keyLight);

    // Fill light (softer, from the side)
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
    fillLight.position.set(-2, 2, 2);
    scene.add(fillLight);
    lightsRef.current.push(fillLight);

    // Rim light (behind avatar for edge lighting)
    const rimLight = new THREE.DirectionalLight(0xffffff, 0.2);
    rimLight.position.set(0, 2, -3);
    scene.add(rimLight);
    lightsRef.current.push(rimLight);
  };

  // Load Ready Player Me avatar
  const loadAvatar = async (url) => {
    if (!sceneRef.current || !url) return;

    setIsLoading(true);
    setLoadError(null);

    try {
      console.log('🔄 Loading avatar from:', url);

      // Dynamic import of GLTFLoader to reduce bundle size
      const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
      const loader = new GLTFLoader();

      // Load with timeout
      const loadPromise = new Promise((resolve, reject) => {
        loader.load(
          url,
          (gltf) => resolve(gltf),
          (progress) => {
            const percent = (progress.loaded / progress.total * 100);
            console.log(`📥 Loading progress: ${percent.toFixed(1)}%`);
          },
          (error) => reject(error)
        );
      });

      // Add timeout
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Avatar loading timeout')), 30000)
      );

      const gltf = await Promise.race([loadPromise, timeoutPromise]);

      // Remove existing avatar
      if (avatarRef.current) {
        sceneRef.current.remove(avatarRef.current);
      }

      // Process the loaded avatar
      const avatar = gltf.scene;
      avatar.scale.set(1, 1, 1);
      avatar.position.set(0, 0, 0);

      // Enable shadows
      avatar.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          
          // Ensure materials are properly set up
          if (child.material) {
            child.material.side = THREE.FrontSide;
          }
        }
      });

      // Setup animations if available
      if (gltf.animations && gltf.animations.length > 0) {
        const mixer = new THREE.AnimationMixer(avatar);
        mixerRef.current = mixer;

        const animationsMap = {};
        gltf.animations.forEach((clip) => {
          const action = mixer.clipAction(clip);
          animationsMap[clip.name] = action;
          console.log(`🎭 Animation found: ${clip.name}`);
        });

        setAnimations(animationsMap);
      }

      // Setup morph targets for lip sync
      setupMorphTargets(avatar);

      // Add to scene
      sceneRef.current.add(avatar);
      avatarRef.current = avatar;

      // Position camera for better view
      adjustCameraForAvatar(avatar);

      setIsLoading(false);
      console.log('✅ Avatar loaded successfully');
      onLoad();

    } catch (error) {
      const errorMessage = error.message || 'Failed to load avatar';
      console.error('❌ Avatar loading failed:', errorMessage);
      setLoadError(errorMessage);
      setIsLoading(false);
      onError(errorMessage);
    }
  };

  // Setup morph targets for Ready Player Me models
  const setupMorphTargets = (avatar) => {
    avatar.traverse((child) => {
      if (child.isMesh && child.morphTargetDictionary) {
        console.log('🎭 Found morph targets:', Object.keys(child.morphTargetDictionary));
        
        // Common Ready Player Me viseme targets
        const visemeMapping = {
          'A': ['viseme_aa', 'mouthOpen'],
          'E': ['viseme_E', 'mouthSmile'],
          'I': ['viseme_I', 'mouthFrown'],
          'O': ['viseme_O', 'mouthRound'],
          'U': ['viseme_U', 'mouthPucker'],
          'silence': ['mouthClose', 'viseme_sil']
        };

        const foundTargets = {};
        Object.entries(visemeMapping).forEach(([phoneme, targets]) => {
          targets.forEach(target => {
            if (child.morphTargetDictionary[target] !== undefined) {
              foundTargets[phoneme] = child.morphTargetDictionary[target];
              return;
            }
          });
        });

        if (Object.keys(foundTargets).length > 0) {
          morphTargetsRef.current[child.uuid] = {
            mesh: child,
            targets: foundTargets
          };
          console.log(`✅ Lip sync targets mapped for ${child.name}:`, foundTargets);
        }
      }
    });
  };

  // Update mouth morph targets based on lip sync data
  const updateMouthMorphTargets = (lipSyncData) => {
    if (!lipSyncData || Object.keys(morphTargetsRef.current).length === 0) return;

    Object.values(morphTargetsRef.current).forEach(({ mesh, targets }) => {
      // Reset all morph targets
      Object.values(targets).forEach(targetIndex => {
        if (mesh.morphTargetInfluences && mesh.morphTargetInfluences[targetIndex] !== undefined) {
          mesh.morphTargetInfluences[targetIndex] = 0;
        }
      });

      // Apply new values based on lip sync data
      if (lipSyncData.phoneme && targets[lipSyncData.phoneme] !== undefined) {
        const targetIndex = targets[lipSyncData.phoneme];
        const intensity = Math.max(0, Math.min(1, lipSyncData.intensity || 0.5));
        
        if (mesh.morphTargetInfluences && mesh.morphTargetInfluences[targetIndex] !== undefined) {
          mesh.morphTargetInfluences[targetIndex] = intensity;
        }
      }
    });

    // Auto-reset after a short delay if no new data comes in
    if (lipSyncTimeoutRef.current) clearTimeout(lipSyncTimeoutRef.current);
    lipSyncTimeoutRef.current = setTimeout(() => {
      Object.values(morphTargetsRef.current).forEach(({ mesh, targets }) => {
        Object.values(targets).forEach(targetIndex => {
          if (mesh.morphTargetInfluences && mesh.morphTargetInfluences[targetIndex] !== undefined) {
            mesh.morphTargetInfluences[targetIndex] = 0;
          }
        });
      });
    }, 200);
  };

  // Adjust camera position based on avatar size
  const adjustCameraForAvatar = (avatar) => {
    if (!cameraRef.current) return;

    const box = new THREE.Box3().setFromObject(avatar);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    // Position camera to frame the avatar nicely
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = cameraRef.current.fov * (Math.PI / 180);
    let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
    
    cameraZ *= 1.5; // Add some padding
    cameraRef.current.position.set(0, center.y + size.y * 0.1, cameraZ);
    cameraRef.current.lookAt(center.x, center.y + size.y * 0.1, center.z);
  };

  // Play animation based on state
  const playAnimation = (animationType) => {
    if (!mixerRef.current || !animations) return;

    // Stop current animation
    if (currentAction) {
      currentAction.fadeOut(0.3);
    }

    // Map animation states to actual animation names
    const animationMap = {
      'idle': ['Idle', 'idle', 'T-Pose', 'TPose'],
      'listening': ['Listening', 'listening', 'Idle', 'idle'],
      'speaking': ['Speaking', 'speaking', 'Talk', 'talk'],
      'connecting': ['Wave', 'wave', 'Hello', 'hello', 'Idle']
    };

    const possibleAnimations = animationMap[animationType] || ['Idle'];
    let actionToPlay = null;

    // Find the first available animation
    for (const animName of possibleAnimations) {
      if (animations[animName]) {
        actionToPlay = animations[animName];
        break;
      }
    }

    if (actionToPlay) {
      actionToPlay.reset();
      actionToPlay.fadeIn(0.3);
      actionToPlay.play();
      setCurrentAction(actionToPlay);
      console.log(`🎭 Playing animation: ${animationType}`);
    } else {
      console.log(`⚠️ No animation found for state: ${animationType}`);
    }
  };

  // Reset avatar to default position
  const resetAvatarPosition = () => {
    if (avatarRef.current) {
      avatarRef.current.position.set(0, 0, 0);
      avatarRef.current.rotation.set(0, 0, 0);
      avatarRef.current.scale.set(1, 1, 1);
    }
  };

  // Animation loop
  const animate = () => {
    if (!rendererRef.current || !sceneRef.current || !cameraRef.current) return;

    // Update animations
    if (mixerRef.current) {
      const delta = clockRef.current.getDelta();
      mixerRef.current.update(delta);
    }

    // Add subtle idle movements
    if (avatarRef.current && animationState === 'idle') {
      const time = clockRef.current.elapsedTime;
      // Subtle breathing motion
      avatarRef.current.position.y = Math.sin(time * 0.5) * 0.01;
      // Subtle head rotation
      if (avatarRef.current.children[0]) {
        avatarRef.current.children[0].rotation.y = Math.sin(time * 0.3) * 0.02;
      }
    }

    // Render the scene
    rendererRef.current.render(sceneRef.current, cameraRef.current);

    // Continue the loop
    animationFrameRef.current = requestAnimationFrame(animate);
  };

  // Handle window resize
  const handleResize = () => {
    if (!mountRef.current || !rendererRef.current || !cameraRef.current) return;

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    cameraRef.current.aspect = width / height;
    cameraRef.current.updateProjectionMatrix();
    rendererRef.current.setSize(width, height);
  };

  // Initialize scene on mount
  useEffect(() => {
    initScene();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      
      // Cleanup
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      
      if (lipSyncTimeoutRef.current) {
        clearTimeout(lipSyncTimeoutRef.current);
      }
      
      if (rendererRef.current && mountRef.current) {
        mountRef.current.removeChild(rendererRef.current.domElement);
        rendererRef.current.dispose();
      }
    };
  }, []);

  // Load avatar when URL changes
  useEffect(() => {
    if (avatarUrl && sceneRef.current) {
      loadAvatar(avatarUrl);
    }
  }, [avatarUrl]);

  // Handle animation state changes
  useEffect(() => {
    if (animationState && animations) {
      playAnimation(animationState);
    }
  }, [animationState, animations]);

  // Handle visibility changes
  useEffect(() => {
    if (mountRef.current) {
      mountRef.current.style.display = isVisible ? 'block' : 'none';
    }
  }, [isVisible]);

  return (
    <div 
      ref={mountRef} 
      style={{ 
        width: '100%', 
        height: '100%', 
        position: 'relative',
        overflow: 'hidden'
      }} 
    />
  );
});

AvatarRenderer.displayName = 'AvatarRenderer';

export default AvatarRenderer;