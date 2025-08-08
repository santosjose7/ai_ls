import React, { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';

const AudioAnalyzer = forwardRef(({
  audioStream = null,
  isActive = false,
  onLipSyncUpdate = () => {},
  sensitivity = 1.0,
  smoothing = 0.8,
  minVolume = 0.01,
  maxVolume = 1.0
}, ref) => {
  
  const audioContextRef = useRef(null);
  const analyzerRef = useRef(null);
  const sourceRef = useRef(null);
  const animationFrameRef = useRef(null);
  const dataArrayRef = useRef(null);
  const smoothedVolumeRef = useRef(0);
  const outputSourceRef = useRef(null);
  const inputSourceRef = useRef(null);
  const activeSourceRef = useRef(null);   
  
  // Phoneme detection state
  const frequencyBinsRef = useRef({});
  const phonemeHistoryRef = useRef([]);
  const lastPhonemeRef = useRef('silence');
  const phonemeTimeoutRef = useRef(null);


  // Connect output audio (AI speaking)
const connectAudioOutput = (outputStream) => {
  if (!outputStream || !audioContextRef.current || !analyzerRef.current) return false;

  try {
    if (outputSourceRef.current) {
      outputSourceRef.current.disconnect();
    }
    const source = audioContextRef.current.createMediaStreamSource(outputStream);
    outputSourceRef.current = source;
    console.log('✅ Audio output connected for lip sync');
    return true;
  } catch (error) {
    console.error('❌ Failed to connect audio output:', error);
    return false;
  }
};

// Set which audio source is active for analysis
const setActiveAudioSource = (sourceType) => {
  if (activeSourceRef.current) {
    activeSourceRef.current.disconnect();
  }

  if (sourceType === 'output' && outputSourceRef.current) {
    outputSourceRef.current.connect(analyzerRef.current);
    activeSourceRef.current = outputSourceRef.current;
    console.log('🎤 Analyzing AI speech output');
  } else if (sourceType === 'input' && inputSourceRef.current) {
    inputSourceRef.current.connect(analyzerRef.current);
    activeSourceRef.current = inputSourceRef.current;
    console.log('🎤 Analyzing user input');
  }
};

//
  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    getVolume: () => smoothedVolumeRef.current,
    getCurrentPhoneme: () => lastPhonemeRef.current,
    startAnalysis: () => startAudioAnalysis(),
    stopAnalysis: () => stopAudioAnalysis(),
    getFrequencyData: () => dataArrayRef.current ? Array.from(dataArrayRef.current) : [],
    connectAudioOutput: (outputStream) => connectAudioOutput(outputStream),
    setActiveSource: (sourceType) => setActiveAudioSource(sourceType)
  }));

  // Initialize audio context and analyzer
  const initAudioContext = () => {
    try {
      // Create or resume audio context
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }

      if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }



      
      // Create analyzer node
      const analyzer = audioContextRef.current.createAnalyser();
      analyzer.fftSize = 256; // Smaller FFT for better performance
      analyzer.smoothingTimeConstant = smoothing;
      analyzer.minDecibels = -90;
      analyzer.maxDecibels = -10;

      analyzerRef.current = analyzer;
      dataArrayRef.current = new Uint8Array(analyzer.frequencyBinCount);

      // Setup frequency bins for phoneme detection
      setupFrequencyBins();

      console.log('✅ Audio context initialized');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize audio context:', error);
      return false;
    }
  };

  // Setup frequency bins for basic phoneme detection
  const setupFrequencyBins = () => {
    if (!analyzerRef.current || !audioContextRef.current) return;

    const sampleRate = audioContextRef.current.sampleRate;
    const nyquist = sampleRate / 2;
    const binSize = nyquist / analyzerRef.current.frequencyBinCount;

    // Define frequency ranges for common phonemes (simplified)
    frequencyBinsRef.current = {
      // Low frequencies (vowel formants)
      'A': { start: Math.floor(700 / binSize), end: Math.floor(1100 / binSize) },  // 'ah' sound
      'E': { start: Math.floor(400 / binSize), end: Math.floor(600 / binSize) },   // 'eh' sound
      'I': { start: Math.floor(300 / binSize), end: Math.floor(400 / binSize) },   // 'ih' sound
      'O': { start: Math.floor(500 / binSize), end: Math.floor(800 / binSize) },   // 'oh' sound
      'U': { start: Math.floor(300 / binSize), end: Math.floor(500 / binSize) },   // 'oo' sound
      
      // Higher frequencies (consonants)
      'consonant': { start: Math.floor(2000 / binSize), end: Math.floor(4000 / binSize) },
      
      // Silence detection (very low energy)
      'silence': { start: 0, end: Math.floor(200 / binSize) }
    };

    console.log('🎵 Frequency bins setup:', frequencyBinsRef.current);
  };

  // Connect audio stream to analyzer
  const connectAudioStream = (stream) => {
    if (!stream || !audioContextRef.current || !analyzerRef.current) return false;

    try {
      // Disconnect previous source
      if (inputSourceRef.current) {
        inputSourceRef.current.disconnect();
      }

      // Create new source from stream
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyzerRef.current);
      inputSourceRef.current = source;

      console.log('✅ Audio input connected');
      return true;
    } catch (error) {
      console.error('❌ Failed to connect audio input:', error);
      return false;
    }
  };

  // Start audio analysis loop
  const startAudioAnalysis = () => {
    if (!analyzerRef.current || !dataArrayRef.current) return;

    const analyze = () => {
      if (!isActive || !analyzerRef.current || !dataArrayRef.current) {
        animationFrameRef.current = requestAnimationFrame(analyze);
        return;
      }

      // Get frequency data
      analyzerRef.current.getByteFrequencyData(dataArrayRef.current);

      // Calculate volume
      const volume = calculateVolume();
      
      // Detect phoneme
      const phoneme = detectPhoneme();
      
      // Update smooth volume
      smoothedVolumeRef.current = lerp(smoothedVolumeRef.current, volume, 0.3);

      // Send lip sync data
      const lipSyncData = {
        volume: smoothedVolumeRef.current,
        phoneme: phoneme,
        intensity: Math.min(1.0, smoothedVolumeRef.current * sensitivity),
        timestamp: Date.now(),
        frequencyData: Array.from(dataArrayRef.current)
      };

      onLipSyncUpdate(lipSyncData);

      // Continue analysis
      animationFrameRef.current = requestAnimationFrame(analyze);
    };

    analyze();
  };

  // Stop audio analysis
  const stopAudioAnalysis = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // Send silence
    onLipSyncUpdate({
      volume: 0,
      phoneme: 'silence',
      intensity: 0,
      timestamp: Date.now()
    });
  };

  // Calculate overall volume from frequency data
  const calculateVolume = () => {
    if (!dataArrayRef.current) return 0;

    let sum = 0;
    for (let i = 0; i < dataArrayRef.current.length; i++) {
      sum += dataArrayRef.current[i];
    }

    const average = sum / dataArrayRef.current.length;
    const normalized = average / 255.0;
    
    // Apply min/max volume constraints
    return Math.max(minVolume, Math.min(maxVolume, normalized));
  };

  // Basic phoneme detection based on frequency analysis
  const detectPhoneme = () => {
    if (!dataArrayRef.current || !frequencyBinsRef.current) return 'silence';

    const volume = calculateVolume();
    
    // If volume is too low, it's silence
    if (volume < minVolume * 2) {
      return updatePhonemeHistory('silence');
    }

    // Calculate energy in different frequency bands
    const energies = {};
    Object.entries(frequencyBinsRef.current).forEach(([phoneme, range]) => {
      let energy = 0;
      for (let i = range.start; i <= Math.min(range.end, dataArrayRef.current.length - 1); i++) {
        energy += dataArrayRef.current[i];
      }
      energies[phoneme] = energy / (range.end - range.start + 1);
    });

    // Find the phoneme with highest energy (simplified approach)
    let maxEnergy = 0;
    let detectedPhoneme = 'silence';
    
    Object.entries(energies).forEach(([phoneme, energy]) => {
      if (phoneme !== 'silence' && energy > maxEnergy && energy > 20) { // Threshold
        maxEnergy = energy;
        detectedPhoneme = phoneme;
      }
    });

    // Handle consonants separately
    if (energies.consonant > 30 && energies.consonant > maxEnergy) {
      detectedPhoneme = detectConsonantType(energies);
    }

    return updatePhonemeHistory(detectedPhoneme);
  };

  // Detect specific consonant types based on frequency patterns
  const detectConsonantType = (energies) => {
    // This is a very simplified consonant detection
    // In reality, you'd need much more sophisticated analysis
    
    const highFreqEnergy = energies.consonant;
    const midFreqEnergy = energies.E + energies.I;
    
    if (highFreqEnergy > midFreqEnergy * 1.5) {
      return 'S'; // Sibilant sounds
    } else if (midFreqEnergy > highFreqEnergy) {
      return 'M'; // Nasal sounds
    } else {
      return 'B'; // Plosive sounds
    }
  };

  // Update phoneme history for smoothing
  const updatePhonemeHistory = (phoneme) => {
    phonemeHistoryRef.current.push(phoneme);
    
    // Keep only recent history
    if (phonemeHistoryRef.current.length > 5) {
      phonemeHistoryRef.current.shift();
    }

    // Use most common phoneme in recent history
    const phonemeCounts = {};
    phonemeHistoryRef.current.forEach(p => {
      phonemeCounts[p] = (phonemeCounts[p] || 0) + 1;
    });

    const mostCommon = Object.entries(phonemeCounts)
      .sort(([,a], [,b]) => b - a)[0][0];

    // Update if changed
    if (mostCommon !== lastPhonemeRef.current) {
      lastPhonemeRef.current = mostCommon;
      console.log(`🎵 Phoneme detected: ${mostCommon}`);
    }

    return mostCommon;
  };

  // Linear interpolation helper
  const lerp = (start, end, factor) => {
    return start + (end - start) * factor;
  };

  // Handle audio stream changes
  useEffect(() => {
    if (audioStream) {
      // Initialize audio context if needed
      if (!audioContextRef.current) {
        if (!initAudioContext()) return;
      }

      // Connect stream
      connectAudioStream(audioStream);
    } else {
      // Disconnect stream
      if (sourceRef.current) {
        sourceRef.current.disconnect();
        sourceRef.current = null;
      }
    }
  }, [audioStream]);

  // Handle active state changes
  useEffect(() => {
    if (isActive && audioStream && analyzerRef.current) {
      console.log('🎤 Starting audio analysis');
      startAudioAnalysis();
    } else {
      console.log('🔇 Stopping audio analysis');
      stopAudioAnalysis();
    }

    return () => {
      stopAudioAnalysis();
    };
  }, [isActive, audioStream]);

  // Handle sensitivity changes
  useEffect(() => {
    console.log(`🔊 Audio sensitivity updated: ${sensitivity}`);
  }, [sensitivity]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAudioAnalysis();
      
      if (phonemeTimeoutRef.current) {
        clearTimeout(phonemeTimeoutRef.current);
      }

      if (sourceRef.current) {
        sourceRef.current.disconnect();
      }

      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, []);

  // This component doesn't render anything visible
  return (
    <div style={{ display: 'none' }}>
      {/* Hidden audio analyzer component */}
      {process.env.NODE_ENV === 'development' && (
        <div style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          background: 'rgba(0,0,0,0.8)',
          color: 'lime',
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '10px',
          fontFamily: 'monospace',
          pointerEvents: 'none',
          zIndex: 1000
        }}>
          Vol: {(smoothedVolumeRef.current * 100).toFixed(0)}% | 
          Phoneme: {lastPhonemeRef.current} | 
          {isActive ? '🎤' : '🔇'}
        </div>
      )}
    </div>
  );
});

AudioAnalyzer.displayName = 'AudioAnalyzer';

export default AudioAnalyzer;