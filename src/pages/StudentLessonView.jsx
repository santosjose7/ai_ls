import React, { useEffect, useState, useRef } from 'react';
import { useConversation } from '@elevenlabs/react';
import '../styles/StudentLessonView.css';

import {
  Book,
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

  // Voice Agent State - ElevenLabs Integration
  const [agentId, setAgentId] = useState(null);
  const [agentMessages, setAgentMessages] = useState([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [voiceError, setVoiceError] = useState(null);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const maxConnectionAttempts = 3;

  // Refs
  const connectionTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);
  const isConnectingRef = useRef(false);

  // Validation function for agent ID
  const validateAgentId = (agentId) => {
    if (!agentId || typeof agentId !== 'string') {
      return false;
    }
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const alphanumericRegex = /^[a-zA-Z0-9_-]+$/;

    return uuidRegex.test(agentId) || (alphanumericRegex.test(agentId) && agentId.length >= 8);
  };

  // 1. Get `sendMessage` from the useConversation hook
  const { conversation, sendMessage } = useConversation({
    tools: [
      {
        toolId: "setStudentName",
        name: "setStudentName",
        description: "Sets the name of the student for the current session.",
        parameters: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "The name of the student.",
            },
          },
          required: ["name"],
        },
        execute: async ({ name }) => {
          console.log(`Tool executed: setStudentName with name: ${name}`);
          return { success: true, output: `Student name has been set to ${name}.` };
        },
      },
      {
        toolId: "setLessonContent",
        name: "setLessonContent",
        description: "Sets the lesson content from the uploaded PDF for the current session.",
        parameters: {
          type: "object",
          properties: {
            content: {
              type: "string",
              description: "The full text content of the lesson.",
            },
          },
          required: ["content"],
        },
        execute: async ({ content }) => {
          console.log(`Tool executed: setLessonContent with content of length: ${content.length}`);
          return { success: true, output: "The lesson content has been successfully set." };
        },
      },
    ],
    onConnect: () => {
      console.log('Voice agent connected successfully');
      setIsConnecting(false);
      setIsSessionActive(true);
      setVoiceError(null);
      setConnectionAttempts(0);
      isConnectingRef.current = false;

      setAgentMessages(prev => [...prev, {
        id: Date.now(),
        type: 'system',
        content: 'Voice agent connected! Start speaking to interact.',
        timestamp: new Date()
      }]);

      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }
    },
    onDisconnect: () => {
      console.log('Voice agent disconnected');
      setIsConnecting(false);
      setIsSessionActive(false);
      isConnectingRef.current = false;

      setAgentMessages(prev => [...prev, {
        id: Date.now(),
        type: 'system',
        content: 'Voice agent disconnected.',
        timestamp: new Date()
      }]);

      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }
    },
    onMessage: (message) => {
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
        id: Date.now() + Math.random(),
        type: messageType,
        content: messageContent,
        timestamp: new Date(),
        isFinal: message?.isFinal !== false
      }]);
    },
    onError: (error) => {
      console.error('Voice agent error:', error);
      setIsConnecting(false);
      setIsSessionActive(false);
      isConnectingRef.current = false;
      const errorMessage = error?.message || error?.toString() || 'Unknown connection error';
      setVoiceError(errorMessage);
      setAgentMessages(prev => [...prev, {
        id: Date.now(),
        type: 'error',
        content: `Error: ${errorMessage}`,
        timestamp: new Date()
      }]);
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }
    }
  });

  // 2. Define our own custom function to send text
  const sendTextToAgent = (text) => {
    if (!isSessionActive || !text || !text.trim()) {
      console.log('Cannot send message: session not active or message is empty.');
      return;
    }
    // Use the sendMessage function from the hook
    sendMessage(text);
  };


  // Effect to provide initial context when the session becomes active
  useEffect(() => {
    if (isSessionActive && studentName && pdfContent) {
      console.log('Session active. Sending initial context to the agent.');
      const initialContextMessage = `
        Initialize session.
        Student Name: ${studentName}.
        Lesson Content: ${pdfContent}.
      `;
      // 3. Use our new custom function
      sendTextToAgent(initialContextMessage);
    }
  }, [isSessionActive, studentName, pdfContent, sendMessage]); // Added sendMessage to dependency array


  useEffect(() => {
    fetchAgentConfig();
    return () => {
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
      }
      if (conversation.status === 'connected' && !isConnectingRef.current) {
        try {
          conversation.endSession();
        } catch (error) {
          console.error('Error ending voice session on cleanup:', error);
        }
      }
    };
  }, []);

  const fetchAgentConfig = async () => {
    try {
      const defaultAgentId = import.meta.env.VITE_ELEVENLABS_AGENT_ID;
      if (defaultAgentId && validateAgentId(defaultAgentId)) {
        setAgentId(defaultAgentId);
        console.log('Using default agent ID:', defaultAgentId);
        setVoiceError(null);
      } else {
        console.error('No valid agent ID available');
        setAgentId(null);
        setVoiceError('Voice agent not configured');
      }
    } catch (error) {
      console.error('Error fetching agent config:', error);
      setAgentId(null);
      setVoiceError('Voice agent not configured');
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      alert('Please upload a PDF file only.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
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
    try {
      if (conversation.status === 'connected') {
        await conversation.endSession();
      }
      clearTimeout(connectionTimeoutRef.current);
      setIsSessionActive(false);
      setAgentMessages([]);
      setIsConnecting(false);
      setVoiceError(null);
      setConnectionAttempts(0);
      isConnectingRef.current = false;
      console.log("Voice agent session ended manually.");
    } catch (err) {
      console.error("Error stopping voice agent:", err);
    }
  };

  const toggleVoiceAgent = async () => {
    if (conversation.status === 'connected' || isSessionActive) {
      await stopVoiceAgent();
      return;
    }
    if (isConnecting || isConnectingRef.current) {
      console.log('Connection already in progress, ignoring request');
      return;
    }
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
    if (connectionAttempts >= maxConnectionAttempts) {
      setVoiceError('Maximum connection attempts reached. Please refresh the page.');
      alert('Unable to connect to voice agent. Please refresh the page and try again.');
      return;
    }

    setIsConnecting(true);
    setVoiceError(null);
    setConnectionAttempts(prev => prev + 1);
    isConnectingRef.current = true;

    connectionTimeoutRef.current = setTimeout(() => {
      if (isConnectingRef.current) {
        setIsConnecting(false);
        isConnectingRef.current = false;
        setVoiceError('Connection timeout - please try again');
        setAgentMessages(prev => [...prev, {
          id: Date.now(),
          type: 'error',
          content: 'Connection timeout. Please try again.',
          timestamp: new Date()
        }]);
      }
    }, 30000);

    try {
      if (!pdfContent || pdfContent.trim().length === 0) {
        throw new Error('PDF content is empty or invalid');
      }
      const response = await fetch(`${API_BASE}/api/voice/get-signed-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      const conversationId = await conversation.startSession({ signedUrl: signedUrl });
      console.log('Voice conversation started:', conversationId);
    } catch (error) {
      console.error('Error starting voice agent:', error);
      setIsConnecting(false);
      setConnectionAttempts(prev => prev - 1);
      isConnectingRef.current = false;
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

  const retryVoiceConnection = () => {
    setConnectionAttempts(0);
    setVoiceError(null);
    toggleVoiceAgent();
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
            conversation.status === 'connected' && conversation.isSpeaking ? 'speaking' :
            conversation.status === 'connected' ? 'listening' : ''
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
            {connectionAttempts < maxConnectionAttempts && (
              <button onClick={retryVoiceConnection} className="retry-button">
                <RefreshCw size={16} />
                Retry
              </button>
            )}
          </div>
        )}

        {(conversation.status === 'connected' || isSessionActive) && (
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
                conversation.status === 'connected' || isSessionActive ? 'connected' :
                voiceError ? 'error' : ''
              }`}
              title={
                conversation.status === 'connected' || isSessionActive ? 'End voice session' :
                voiceError ? voiceError : 'Start voice assistant'
              }
              disabled={isConnecting || (!agentId && !voiceError) || !studentName.trim() || !pdfContent}
            >
              {isConnecting ? (
                <RefreshCw className="spinning" size={24} />
              ) : (conversation.status === 'connected' || isSessionActive) ? (
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
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                  // 4. Use our new custom function
                  sendTextToAgent(e.currentTarget.value.trim());
                  e.currentTarget.value = '';
                }
              }}
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
