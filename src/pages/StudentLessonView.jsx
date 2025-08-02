import React, { useEffect, useState, useRef } from 'react';
import { ElevenLabsClient } from 'elevenlabs'; 
import '../styles/StudentLessonView.css';
import {
  BookOpen,
  ChevronLeft,
  Loader,
  RefreshCw,
  PhoneCall,
  PhoneOff,
  AlertCircle,
  CheckCircle2,
  Home,
  GraduationCap,
  TrendingUp,
  FileText,
  Settings,
  Upload,
  X,
  User
} from 'lucide-react';

const StudentLessonView = () => {
  const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000';

  // Student and PDF state
  const [studentName, setStudentName] = useState('');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [pdfContent, setPdfContent] = useState('');
  const [isProcessingPDF, setIsProcessingPDF] = useState(false);

  // Voice Agent State
  const [agentId, setAgentId] = useState(null);
  const [agentMessages, setAgentMessages] = useState([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [voiceError, setVoiceError] = useState(null);
  const [isSessionActive, setIsSessionActive] = useState(false);

  // Refs
  const fileInputRef = useRef(null);
  const socketRef = useRef(null); 

  // Function to start the voice session
  const startVoiceSession = async () => {
    if (!studentName.trim() || !pdfContent || !agentId) {
      alert('Please enter your name and upload a PDF first.');
      return;
    }

    setIsConnecting(true);
    setVoiceError(null);
    setAgentMessages([]);

    try {
      // 1. Initialize the ElevenLabs Client
      const elevenlabs = new ElevenLabsClient({
        apiKey: import.meta.env.VITE_ELEVENLABS_API_KEY,
      });

      // 2. Create the WebSocket connection object
      const socket = elevenlabs.conversational.connect({
        agentId: agentId,
        dynamicVariables: {
            student_name: studentName.trim(),
            title: uploadedFile?.name || 'Lesson',
            lesson_content: pdfContent,
        },
      });

      socketRef.current = socket; // Store the socket in a ref

      // 3. Set up event listeners as per the documentation
      socket.on('open', () => {
        console.log('Voice agent connected successfully');
        setIsConnecting(false);
        setIsSessionActive(true);
        setAgentMessages(prev => [...prev, {
            id: Date.now(), type: 'system',
            content: 'Voice agent connected! Start speaking to interact.',
            timestamp: new Date()
        }]);
      });

      socket.on('message', (message) => {
        console.log('Voice agent message received:', message);
        let messageContent = '';
        let messageType = 'agent';

        if (typeof message === 'string') {
          messageContent = message;
        } else if (message) {
          messageContent = message.message || message.text || message.content || JSON.stringify(message);
          messageType = message.type || message.source || 'agent';
        }
        setAgentMessages(prev => [...prev, {
            id: Date.now() + Math.random(), type: messageType,
            content: messageContent, timestamp: new Date()
        }]);
      });

      socket.on('close', () => {
        console.log('Voice agent disconnected');
        setIsConnecting(false);
        setIsSessionActive(false);
        setAgentMessages(prev => [...prev, {
            id: Date.now(), type: 'system',
            content: 'Voice agent disconnected.', timestamp: new Date()
        }]);
      });

      socket.on('error', (error) => {
        console.error('Voice agent error:', error);
        const errorMessage = error?.message || error?.toString() || 'Unknown connection error';
        setVoiceError(errorMessage);
        setIsConnecting(false);
        setIsSessionActive(false);
      });

    } catch (error) {
      console.error('Error starting voice session:', error);
      setVoiceError('Failed to initialize voice session.');
      setIsConnecting(false);
    }
  };

  // Function to stop the voice session
  const stopVoiceSession = () => {
    if (socketRef.current) {
      socketRef.current.close(); // This will trigger the 'close' event listener
      socketRef.current = null;
    }
  };

  useEffect(() => {

    
    return () => {
      
      // Only end session if we're actually connected and not in the middle of connecting
      if (conversation.status === 'connected') {
        try {
          conversation.endSession();
        } catch (error) {
          console.error('Error ending voice session on cleanup:', error);
        }
      }

      stopVoiceAgent();
    };
  }, []);

  // Fetch the agent configuration on component mount
  useEffect(() => {
    try {
      const defaultAgentId = import.meta.env.VITE_ELEVENLABS_AGENT_ID;
      if (defaultAgentId) {
        setAgentId(defaultAgentId);
      } else {
        setVoiceError('Voice agent not configured');
      }
    } catch (error) {
      console.error('Error fetching agent config:', error);
      setVoiceError('Voice agent not configured');
    }
  }, 
  []);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      alert('Please upload a PDF file only.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      alert('File size should be less than 10MB.');
      return;
    }

    setUploadedFile(file);
    setIsProcessingPDF(true);

    try {
      const formData = new FormData();
      formData.append('pdf', file);

      const response = await fetch(`${API_BASE}/api/voice/process-pdf`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to process PDF');
      }

      const data = await response.json();
      setPdfContent(data.content);
      console.log('PDF processed successfully');
    } catch (error) {
      console.error('Error processing PDF:', error);
      alert('Error processing PDF. Please try again.');
      setUploadedFile(null);
    } finally {
      setIsProcessingPDF(false);
    }
  };

  const removeFile = () => {
    setUploadedFile(null);
    setPdfContent('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const stopVoiceAgent = async () => {
    // 1. Prevent multiple disconnect attempts from running simultaneously
    if ((conversation.status !== 'connected' && !isSessionActive)) {
      console.log('Disconnection already in progress or session is not active.');
      return;
    }

    try {
      

      // 3. Gracefully handle the expected error
      if (conversation.status === 'connected') {
        await conversation.endSession();
      }

    } catch (err) {
      // 4. Specifically ignore the race condition error
      if (err.message.includes('WebSocket is already in CLOSING or CLOSED state')) {
        console.log('Session was already closing. Cleaned up state.');
      } else {
        // Log other, unexpected errors
        console.error("Error stopping voice agent:", err);
      }
    } finally {
      // 5. Always reset state in a finally block to ensure a clean exit
      clearTimeout(connectionTimeoutRef.current);
      setIsSessionActive(false);
      setAgentMessages([]);
      setIsConnecting(false);
      setVoiceError(null);
    }
  };
  const toggleVoiceAgent = async () => {
    // If already connected, stop the session
    if (conversation.status === 'connected' || isSessionActive) {
      await stopVoiceAgent();
      return;
    }

    // Prevent multiple simultaneous connection attempts
    if (isConnecting) {
      console.log('Connection already in progress, ignoring request');
      return;
    }

    // Validation before starting
    if (!studentName.trim()) {
      alert('Please enter your name first.');
      return;
    }

    if (!uploadedFile || !pdfContent) {
      alert('Please upload a PDF file first.');
      return;
    }

    if (!agentId) {
      const errorMsg = 'Voice agent not configured';
      setVoiceError(errorMsg);
      alert(errorMsg);
      return;
    }


    // Set connecting state
    setIsConnecting(true);
    setVoiceError(null);
    


    try {
      if (!pdfContent || pdfContent.trim().length === 0) {
        throw new Error('PDF content is empty or invalid');
      }

      const response = await fetch(`${API_BASE}/api/voice/get-signed-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agentId: agentId,
          studentName: studentName.trim(),
          pdfContent: pdfContent,
          fileName: uploadedFile.name,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const { signedUrl, sessionInfo } = data;
      
      if (!signedUrl) {
        throw new Error('No signed URL received from server');
      }

      console.log('Connecting to voice agent via:', signedUrl);
      console.log('Session info:', sessionInfo);

      setAgentMessages(prev => [...prev, {
        id: Date.now(),
        type: 'system',
        content: 'Connecting to voice agent...',
        timestamp: new Date()
      }]);

      // Start the conversation
      const conversationId = await conversation.startSession({ 
        signedUrl: signedUrl 
      });
      
      console.log('Voice conversation started:', conversationId);

    } catch (error) {
      console.error('Error starting voice agent:', error);
      
      setIsConnecting(false);
      
      let errorMessage = 'Unable to start voice agent. ';
      
      if (error.name === 'AbortError' || error.message.includes('timeout')) {
        errorMessage += 'Connection timeout - please check your internet connection.';
      } else if (error.message) {
        errorMessage += error.message;
      } else {
        errorMessage += 'Please try again later.';
      }
      
      setVoiceError(errorMessage);
      
      setAgentMessages(prev => [...prev, {
        id: Date.now(),
        type: 'error',
        content: `${errorMessage}`,
        timestamp: new Date()
      }]);

      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }
    }
  };



  // Generate spectrum bars
  const generateSpectrumBars = () => {
    const bars = [];
    const totalBars = 60;
    
    for (let i = 0; i < totalBars; i++) {
      const angle = (i / totalBars) * 360;
      const hue = (i / totalBars) * 360;
      
      bars.push(
        <div
          key={i}
          className={`spectrum-bar ${
            isConnecting ? 'connecting' : 
            isSessionActive ? 'listening' : ''
          }`}
          style={{
            transform: `rotate(${angle}deg) translateY(-130px)`,
            background: `hsl(${hue}, 70%, 60%)`,
            animationDelay: `${i * 0.05}s`
          }}
        />
      );
    }
    
    return bars;
  };

  return (
    <>
      {/* Header Section */}
      <header className="dashboard-header">
        <div className="header-content">
          <div className="header-left">
            <div className="header-left-inner">
              <div className="header-icon">
                <BookOpen className="icon-medium" />
              </div>
              <h2>AI Learning Assistant</h2>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container-lessons-page">
        {/* Setup Section */}
        <div className="setup-section">
          <div className="student-input-container">
            <div className="input-group">
              <User size={20} className="input-icon" />
              <input
                type="text"
                placeholder="Enter your name"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                className="student-name-input"
                maxLength="50"
              />
            </div>
          </div>

          <div className="pdf-upload-container">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleFileUpload}
              className="file-input-hidden"
              id="pdf-upload"
            />
            
            {!uploadedFile ? (
              <label htmlFor="pdf-upload" className="pdf-upload-area">
                <div className="upload-content">
                  <Upload size={48} className="upload-icon" />
                  <h3>Upload PDF Document</h3>
                  <p>Drop your PDF here or click to browse</p>
                  <span className="file-info">Max file size: 10MB</span>
                </div>
              </label>
            ) : (
              <div className="uploaded-file-info">
                <div className="file-details">
                  <FileText size={24} className="file-icon" />
                  <div className="file-info">
                    <h4>{uploadedFile.name}</h4>
                    <p>{(uploadedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                  <button onClick={removeFile} className="remove-file-btn">
                    <X size={20} />
                  </button>
                </div>
                
                {isProcessingPDF && (
                  <div className="processing-indicator">
                    <Loader className="spinning" size={20} />
                    <span>Processing PDF...</span>
                  </div>
                )}
                
                {pdfContent && !isProcessingPDF && (
                  <div className="success-indicator">
                    <CheckCircle2 size={20} />
                    <span>PDF processed successfully!</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* AI Assistant Title */}
        <div className="ai-assistant-title">
          <h1>AI Learning Assistant</h1>
          <p>Upload a PDF and start learning with your personal AI tutor!</p>
        </div>

        {/* Voice Status Message */}
        {voiceError && (
          <div className="voice-status-message error">
            <AlertCircle size={20} />
            <span>{voiceError}</span>
          </div>
        )}

        {isSessionActive && (
          <div className="voice-status-message connected">
            <CheckCircle2 size={16} />
            <span>Connected and ready to help {studentName}!</span>
          </div>
        )}

        {/* Spectrum Container */}
        <div className="spectrum-container">
          <div className="spectrum-circle">
            {generateSpectrumBars()}
            
            {/* Center Book Icon */}
            <div className="spectrum-center">
              <BookOpen size={48} />
            </div>

            {/* Voice Agent Button in Center */}
            <button
              onClick={toggleVoiceAgent}
              className={`voice-agent-center-btn ${
                isSessionActive ? 'connected' : 
                voiceError ? 'error' : ''
              }`}
              title={
                isSessionActive ? 'End voice session' : 
                voiceError ? voiceError : 'Start voice assistant'
              }
              disabled={isConnecting || (!agentId && !voiceError) || !studentName.trim() || !pdfContent}
            >
              {isConnecting ? (
                <RefreshCw className="spinning" size={24} />
              ) : isSessionActive ? (
                <BookOpen size={60} style={{ color: '#c62b2bff', fill:'#c62b2bff' }} />
              ) : voiceError ? (
                <AlertCircle size={24} />
              ) : (
                <BookOpen size={60} style={{ color: '#20bd59ff', fill: '#20bd59ff'}} />
              )}
            </button>
          </div>

          {/* Query Input */}
          <div className="query-input-container">
            <input
              type="text"
              placeholder="You can also type your questions here..."
              className="query-input"
            />
          </div>
        </div>

        {/* Chat Messages Display */}
        {agentMessages.length > 0 && (
          <div className="chat-messages">
            <h3>Conversation</h3>
            <div className="messages-container">
              {agentMessages.map((message) => (
                <div key={message.id} className={`message ${message.type}`}>
                  <div className="message-content">{message.content}</div>
                  <div className="message-time">
                    {message.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bottom Navigation */}
        <div className="bottom-navigation">
          <button className="nav-item active">
            <div className="nav-icon">
              <Home size={20} />
            </div>
            <span>Home</span>
          </button>
          <button className="nav-item">
            <div className="nav-icon">
              <GraduationCap size={20} />
            </div>
            <span>Courses</span>
          </button>
          <button className="nav-item">
            <div className="nav-icon">
              <TrendingUp size={20} />
            </div>
            <span>Progress</span>
          </button>
          <button className="nav-item">
            <div className="nav-icon">
              <FileText size={20} />
            </div>
            <span>Resources</span>
          </button>
          <button className="nav-item">
            <div className="nav-icon">
              <Settings size={20} />
            </div>
            <span>Settings</span>
          </button>
        </div>
      </main>
    </>
  );
};

export default StudentLessonView;