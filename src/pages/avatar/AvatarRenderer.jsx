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
  const morphTargetSmoothingRef = useRef({});

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

      // Dynamic import of GLTFLoader
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

      // Enable shadows and optimize materials
      avatar.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          
          // Ensure materials are properly set up
          if (child.material) {
            child.material.side = THREE.FrontSide;
            // Enable morph targets if available
            if (child.morphTargetInfluences) {
              child.material.morphTargets = true;
            }
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
        
        // Enhanced Ready Player Me viseme mapping
        const visemeMapping = {
          'A': ['viseme_aa', 'mouthOpen', 'jawOpen'],
          'E': ['viseme_E', 'mouthSmile_L', 'mouthSmile_R'],
          'I': ['viseme_I', 'mouthClose', 'mouthPress_L', 'mouthPress_R'],
          'O': ['viseme_O', 'mouthFunnel', 'mouthRound'],
          'U': ['viseme_U', 'mouthPucker'],
          'silence': ['mouthClose', 'viseme_sil'],
          // Consonant mappings
          'M': ['mouthClose', 'viseme_PP'],
          'B': ['mouthClose', 'viseme_PP'],
          'S': ['mouthSmile_L', 'mouthSmile_R', 'viseme_SS']
        };

        const foundTargets = {};
        Object.entries(visemeMapping).forEach(([phoneme, targets]) => {
          for (const target of targets) {
            if (child.morphTargetDictionary[target] !== undefined) {
              foundTargets[phoneme] = child.morphTargetDictionary[target];
              break;
            }
          }
        });

        if (Object.keys(foundTargets).length > 0) {
          morphTargetsRef.current[child.uuid] = {
            mesh: child,
            targets: foundTargets
          };
          
          // Initialize smoothing values
          morphTargetSmoothingRef.current[child.uuid] = {};
          Object.keys(foundTargets).forEach(phoneme => {
            morphTargetSmoothingRef.current[child.uuid][phoneme] = 0;
          });
          
          console.log(`✅ Lip sync targets mapped for ${child.name}:`, foundTargets);
        }
      }
    });
  };

  // Enhanced mouth morph targets update with smoothing
  const updateMouthMorphTargets = (lipSyncData) => {
    if (!lipSyncData || Object.keys(morphTargetsRef.current).length === 0) return;

    const { phoneme, volume, intensity = 0.5 } = lipSyncData;
    const targetIntensity = Math.max(0, Math.min(1, intensity * volume));

    Object.entries(morphTargetsRef.current).forEach(([meshId, { mesh, targets }]) => {
      if (!mesh.morphTargetInfluences) return;

      const smoothing = morphTargetSmoothingRef.current[meshId];
      
      // Update all phoneme targets with smoothing
      Object.entries(targets).forEach(([targetPhoneme, targetIndex]) => {
        let targetValue = 0;
        
        if (targetPhoneme === phoneme && volume > 0.02) {
          targetValue = targetIntensity;
        } else if (targetPhoneme === 'silence' && volume <= 0.02) {
          targetValue = 0.3; // Slight mouth closure for silence
        }

        // Apply smoothing
        const currentValue = smoothing[targetPhoneme] || 0;
        const smoothedValue = currentValue + (targetValue - currentValue) * 0.3;
        smoothing[targetPhoneme] = smoothedValue;

        // Apply to mesh
        if (mesh.morphTargetInfluences[targetIndex] !== undefined) {
          mesh.morphTargetInfluences[targetIndex] = smoothedValue;
        }
      });
    });

    // Auto-reset after silence
    if (lipSyncTimeoutRef.current) clearTimeout(lipSyncTimeoutRef.current);
    lipSyncTimeoutRef.current = setTimeout(() => {
      Object.entries(morphTargetsRef.current).forEach(([meshId, { mesh, targets }]) => {
        if (!mesh.morphTargetInfluences) return;
        
        Object.entries(targets).forEach(([targetPhoneme, targetIndex]) => {
          if (targetPhoneme !== 'silence') {
            const current = mesh.morphTargetInfluences[targetIndex] || 0;
            mesh.morphTargetInfluences[targetIndex] = current * 0.9; // Gradual fade
          }
        });
      });
    }, 100);
  };

  // Adjust camera position based on avatar size
  const adjustCameraForAvatar = (avatar) => {
    if (!cameraRef.current) return;

    const box = new THREE.Box3().setFromObject(avatar);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    // Position camera to frame the avatar nicely (focus on head/torso)
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = cameraRef.current.fov * (Math.PI / 180);
    let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
    
    cameraZ *= 1.2; // Closer for better face visibility
    const targetY = center.y + size.y * 0.2; // Focus on upper body/head
    
    cameraRef.current.position.set(0, targetY, cameraZ);
    cameraRef.current.lookAt(center.x, targetY, center.z);
  };

  // Enhanced animation system
  const playAnimation = (animationType) => {
    if (!mixerRef.current || !animations) return;

    // Stop current animation
    if (currentAction) {
      currentAction.fadeOut(0.5);
    }

    // Enhanced animation mapping
    const animationMap = {
      'idle': ['Idle', 'idle', 'breathing', 'T-Pose', 'TPose'],
      'listening': ['Listening', 'listening', 'attentive', 'Idle', 'idle'],
      'speaking': ['Speaking', 'speaking', 'Talk', 'talk', 'gesture'],
      'connecting': ['Wave', 'wave', 'Hello', 'hello', 'greeting', 'Idle'],
      'error': ['Confused', 'confused', 'shrug', 'Idle']
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
      actionToPlay.fadeIn(0.5);
      actionToPlay.setLoop(THREE.LoopRepeat);
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

  // Enhanced animation loop with lip sync and subtle movements
  const animate = () => {
    if (!rendererRef.current || !sceneRef.current || !cameraRef.current) return;

    const delta = clockRef.current.getDelta();
    const elapsedTime = clockRef.current.elapsedTime;

    // Update animations
    if (mixerRef.current) {
      mixerRef.current.update(delta);
    }

    // Add subtle idle movements when not speaking
    if (avatarRef.current) {
      if (animationState === 'idle' || animationState === 'listening') {
        // Subtle breathing motion
        const breathingOffset = Math.sin(elapsedTime * 0.8) * 0.008;
        avatarRef.current.position.y = breathingOffset;
        
        // Very subtle head movements
        avatarRef.current.rotation.y = Math.sin(elapsedTime * 0.3) * 0.015;
        avatarRef.current.rotation.x = Math.sin(elapsedTime * 0.4) * 0.008;
      } else if (animationState === 'speaking') {
        // Slight head bobbing while speaking
        const speakingOffset = Math.sin(elapsedTime * 2) * 0.005;
        avatarRef.current.position.y = speakingOffset;
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
      
      if (rendererRef.current && mountRef.current && mountRef.current.contains(rendererRef.current.domElement)) {
        mountRef.current.removeChild(rendererRef.current.domElement);
      }
      
      if (rendererRef.current) {
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

  // Enhanced lip sync data handling
  useEffect(() => {
    if (lipSyncData && Object.keys(morphTargetsRef.current).length > 0) {
      updateMouthMorphTargets(lipSyncData);
    }
  }, [lipSyncData]);

  return (
    <div 
      ref={mountRef} 
      style={{ 
        width: '100%', 
        height: '100%', 
        position: 'relative',
        overflow: 'hidden',
        borderRadius: '12px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }} 
    />
  );
});

AvatarRenderer.displayName = 'AvatarRenderer';

export default AvatarRenderer;