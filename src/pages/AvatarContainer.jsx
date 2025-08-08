import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw, AlertCircle, BookOpen } from 'lucide-react';
import AvatarRenderer from './avatar/AvatarRenderer';
import AudioAnalyzer from './avatar/AudioAnalyzer';
import '../styles/Avatar.css';

const AvatarContainer = ({
  isConnected = false,
  isSpeaking = false,
  isConnecting = false,
  voiceError = null,
  studentName = '',
  avatarUrl = '',
  onToggleVoiceAgent = () => {},
  onAvatarReady = () => {},
  onAvatarError = () => {},
  audioStream = null
}) => {
  // Avatar states
  const [avatarLoaded, setAvatarLoaded] = useState(false);
  const [avatarError, setAvatarError] = useState(null);
  const [currentAnimation, setCurrentAnimation] = useState('idle');
  const [lipSyncData, setLipSyncData] = useState(null);
  
  // Refs
  const containerRef = useRef(null);
  const avatarRef = useRef(null);
  const audioAnalyzerRef = useRef(null);

  // Handle avatar loading
  const handleAvatarLoad = () => {
    console.log('✅ Avatar loaded successfully');
    setAvatarLoaded(true);
    setAvatarError(null);
    onAvatarReady();
  };

  const handleAvatarError = (error) => {
    console.error('❌ Avatar loading error:', error);
    setAvatarError(error);
    setAvatarLoaded(false);
    onAvatarError(error);
  };

  // Handle audio analysis for lip sync
  const handleLipSyncUpdate = (lipSyncData) => {
    setLipSyncData(lipSyncData);
    // Pass to avatar renderer for mouth animations
    if (avatarRef.current) {
      avatarRef.current.updateLipSync(lipSyncData);
    }
  };

  // Determine current avatar state
  const getAvatarState = () => {
    if (voiceError || avatarError) return 'error';
    if (isConnecting) return 'connecting';
    if (isConnected && isSpeaking) return 'speaking';
    if (isConnected) return 'listening';
    return 'idle';
  };

  // Update animation based on state
  useEffect(() => {
    const newState = getAvatarState();
    if (newState !== currentAnimation) {
      setCurrentAnimation(newState);
      console.log(`🎭 Avatar state changed: ${currentAnimation} → ${newState}`);
    }
  }, [isConnected, isSpeaking, isConnecting, voiceError, avatarError]);

  // Handle voice agent button
  const handleVoiceToggle = () => {
    if (!avatarLoaded && !avatarError) {
      console.log('⏳ Avatar still loading...');
      return;
    }
    onToggleVoiceAgent();
  };

  // Determine button state
  const getButtonState = () => {
    if (avatarError || voiceError) return 'error';
    if (isConnecting || (!avatarLoaded && !avatarError)) return 'loading';
    if (isConnected) return 'connected';
    return 'ready';
  };

  const buttonState = getButtonState();
  const isButtonDisabled = buttonState === 'loading' || 
                          (!studentName.trim() && buttonState !== 'connected');

  return (
    <div className="avatar-container" ref={containerRef}>
      {/* Avatar Display Area */}
      <div className="avatar-display">
        {avatarUrl ? (
          <AvatarRenderer
            ref={avatarRef}
            avatarUrl={avatarUrl}
            animationState={currentAnimation}
            onLoad={handleAvatarLoad}
            onError={handleAvatarError}
            lipSyncData={lipSyncData}
            isVisible={!avatarError}
          />
        ) : (
          <div className="avatar-placeholder">
            <BookOpen size={64} className="placeholder-icon" />
            <p>No avatar URL provided</p>
          </div>
        )}

        {/* Avatar Loading Overlay */}
        {!avatarLoaded && !avatarError && avatarUrl && (
          <div className="avatar-loading-overlay">
            <RefreshCw className="spinning avatar-loading-icon" size={32} />
            <p>Loading avatar...</p>
          </div>
        )}

        {/* Avatar Error Overlay */}
        {avatarError && (
          <div className="avatar-error-overlay">
            <AlertCircle size={48} className="error-icon" />
            <h4>Avatar Loading Failed</h4>
            <p>{avatarError}</p>
            <button 
              className="retry-avatar-btn"
              onClick={() => {
                setAvatarError(null);
                setAvatarLoaded(false);
              }}
            >
              <RefreshCw size={16} />
              Retry Loading
            </button>
          </div>
        )}

        {/* Voice Control Button Overlay */}
        <button
          onClick={handleVoiceToggle}
          disabled={isButtonDisabled}
          className={`avatar-voice-btn ${buttonState}`}
          title={
            buttonState === 'connected' 
              ? 'End voice session' 
              : buttonState === 'loading'
                ? 'Loading...'
                : buttonState === 'error'
                  ? 'Error occurred'
                  : `Start voice conversation${studentName ? ` with ${studentName}` : ''}`
          }
        >
          {buttonState === 'loading' ? (
            <RefreshCw className="spinning" size={24} />
          ) : buttonState === 'connected' ? (
            <BookOpen size={24} />
          ) : buttonState === 'error' ? (
            <AlertCircle size={24} />
          ) : (
            <BookOpen size={24} />
          )}
        </button>
      </div>

      {/* Audio Analyzer (hidden component for lip sync) */}
      {audioStream && avatarLoaded && (
        <AudioAnalyzer
          ref={audioAnalyzerRef}
          audioStream={audioStream}
          isActive={isSpeaking}
          onLipSyncUpdate={handleLipSyncUpdate}
        />
      )}

      {/* Avatar Status Display */}
      <div className="avatar-status">
        {studentName && (
          <div className="student-greeting">
            <span>👋 Hello, {studentName}!</span>
          </div>
        )}
        
        <div className={`status-indicator ${currentAnimation}`}>
          <div className="status-dot"></div>
          <span className="status-text">
            {currentAnimation === 'error' ? 'Error' :
             currentAnimation === 'connecting' ? 'Connecting...' :
             currentAnimation === 'speaking' ? 'Speaking' :
             currentAnimation === 'listening' ? 'Listening' :
             'Ready'}
          </span>
        </div>
      </div>

      {/* Debug Info (remove in production) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="avatar-debug">
          <small>
            State: {currentAnimation} | 
            Loaded: {avatarLoaded ? '✅' : '❌'} | 
            Audio: {audioStream ? '🎤' : '❌'}
          </small>
        </div>
      )}
    </div>
  );
};

export default AvatarContainer;