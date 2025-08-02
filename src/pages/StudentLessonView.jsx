import React, { useEffect, useState, useRef } from 'react';
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
  // --- Configuration ---
  const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000';
  const WS_URL = API_BASE.replace(/^https?/, 'ws') + '/ai-conversation';

  // --- State Management ---
  // Student and PDF state
  const [studentName, setStudentName] = useState('');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [pdfContent, setPdfContent] = useState('');
  const [isProcessingPDF, setIsProcessingPDF] = useState(false);

  // Voice Agent and Connection State
  const [agentMessages, setAgentMessages] = useState([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [voiceError, setVoiceError] = useState(null);

  // --- Refs ---
  const fileInputRef = useRef(null);
  const socketRef = useRef(null);

  // --- WebSocket Communication ---

  // Function to start the voice session via the backend proxy
  const startVoiceSession = () => {
    if (!studentName.trim() || !pdfContent) {
      alert('Please enter your name and upload a PDF first.');
      return;
    }
    if (socketRef.current) {
        console.log("Session already active.");
        return;
    }

    setIsConnecting(true);
    setVoiceError(null);
    setAgentMessages([]);

    console.log(`Connecting to backend proxy at: ${WS_URL}`);
    const socket = new WebSocket(WS_URL);
    socketRef.current = socket;

    socket.onopen = () => {
      console.log('Backend proxy connected.');
      setIsConnecting(false);
      setIsSessionActive(true);
      setAgentMessages(prev => [...prev, { id: Date.now(), type: 'system', content: 'AI tutor is ready!', timestamp: new Date() }]);

      // Send start message to the backend with context
      const startPayload = {
        type: 'start_conversation',
        context: {
          studentName: studentName.trim(),
          lessonTitle: uploadedFile?.name || 'Lesson',
          lessonContent: pdfContent,
        }
      };
      socket.send(JSON.stringify(startPayload));
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('Message from backend:', data);

        let messageContent = '';
        let messageType = 'agent';

        // Adapt to the message structure from your ai.js backend
        switch (data.type) {
            case 'conversation_started':
                messageContent = data.message;
                messageType = 'system';
                break;
            case 'ai_response':
                messageContent = data.message;
                break;
            case 'ai_audio_response': // If you handle audio streams
                messageContent = "Received audio from the tutor.";
                // Here you would handle playing the base64 audio
                break;
            case 'error':
                messageContent = data.message;
                messageType = 'error';
                setVoiceError(data.message);
                break;
            default:
                messageContent = JSON.stringify(data);
        }

        setAgentMessages(prev => [...prev, {
            id: Date.now() + Math.random(),
            type: messageType,
            content: messageContent,
            timestamp: new Date()
        }]);

      } catch (error) {
        console.error('Error parsing message from backend:', error);
      }
    };

    socket.onclose = () => {
      console.log('Backend proxy disconnected.');
      setIsConnecting(false);
      setIsSessionActive(false);
      socketRef.current = null;
    };

    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
      setVoiceError('Connection to the tutor failed. Please try again.');
      setIsConnecting(false);
      setIsSessionActive(false);
      socketRef.current = null;
    };
  };

  // Function to stop the voice session
  const stopVoiceSession = () => {
    if (socketRef.current) {
      socketRef.current.close();
    }
  };

  // Controller function for the main button
  const toggleVoiceAgent = () => {
    if (isSessionActive || isConnecting) {
      stopVoiceSession();
    } else {
      startVoiceSession();
    }
  };

  // --- UI and File Handling Logic ---

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
            <div className="spectrum-center">
              <BookOpen size={48} />
            </div>
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
              disabled={isProcessingPDF || !studentName.trim() || !pdfContent}
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
            <div className="nav-icon"><Home size={20} /></div>
            <span>Home</span>
          </button>
          <button className="nav-item">
            <div className="nav-icon"><GraduationCap size={20} /></div>
            <span>Courses</span>
          </button>
          <button className="nav-item">
            <div className="nav-icon"><TrendingUp size={20} /></div>
            <span>Progress</span>
          </button>
          <button className="nav-item">
            <div className="nav-icon"><FileText size={20} /></div>
            <span>Resources</span>
          </button>
          <button className="nav-item">
            <div className="nav-icon"><Settings size={20} /></div>
            <span>Settings</span>
          </button>
        </div>
      </main>
    </>
  );
};

export default StudentLessonView;