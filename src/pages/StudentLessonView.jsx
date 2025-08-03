import React, { useEffect, useState, useRef } from 'react';
import { useConversation } from '@elevenlabs/react';
import '../styles/StudentLessonView.css';

import {
  Book, BookOpen, ChevronLeft, Loader, RefreshCw, PhoneCall, PhoneOff,
  AlertCircle, CheckCircle2, Home, GraduationCap, TrendingUp, FileText,
  Settings, Upload, X, User
} from 'lucide-react';

const StudentLessonView = () => {
  const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000';

  // State
  const [studentName, setStudentName] = useState('');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [pdfContent, setPdfContent] = useState('');
  const [isProcessingPDF, setIsProcessingPDF] = useState(false);
  const [agentId, setAgentId] = useState(null);
  const [agentMessages, setAgentMessages] = useState([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [voiceError, setVoiceError] = useState(null);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [backendSessionId, setBackendSessionId] = useState(null); // 1. State for the session ID

  // Refs
  const fileInputRef = useRef(null);

  // 2. Update tools to fetch from the backend
  const { conversation, sendMessage } = useConversation({
    tools: [
      {
        toolId: "getStudentName",
        name: "getStudentName",
        description: "Gets the name of the student for the current session from the backend.",
        parameters: { type: "object", properties: {} }, // No input parameters needed
        execute: async () => {
          if (!backendSessionId) return { success: false, output: "Session ID not available." };
          try {
            const response = await fetch(`${API_BASE}/api/voice/context/${backendSessionId}`);
            if (!response.ok) throw new Error(`Failed to fetch context: ${response.statusText}`);
            const data = await response.json();
            return { success: true, output: data.studentName };
          } catch (error) {
            console.error("Error in getStudentName tool:", error);
            return { success: false, output: "Could not retrieve student name." };
          }
        },
      },
      {
        toolId: "getLessonContent",
        name: "getLessonContent",
        description: "Gets the lesson content from the uploaded document from the backend.",
        parameters: { type: "object", properties: {} },
        execute: async () => {
          if (!backendSessionId) return { success: false, output: "Session ID not available." };
          try {
            const response = await fetch(`${API_BASE}/api/voice/context/${backendSessionId}`);
            if (!response.ok) throw new Error(`Failed to fetch context: ${response.statusText}`);
            const data = await response.json();
            return { success: true, output: data.lessonContent };
          } catch (error) {
            console.error("Error in getLessonContent tool:", error);
            return { success: false, output: "Could not retrieve lesson content." };
          }
        },
      },
    ],
    onConnect: () => {
      console.log('Voice agent connected successfully');
      setIsConnecting(false);
      setIsSessionActive(true);
      setVoiceError(null);
    },
    onDisconnect: () => {
      console.log('Voice agent disconnected');
      setIsConnecting(false);
      setIsSessionActive(false);
      setBackendSessionId(null); // Clear session ID on disconnect
    },
    onMessage: (message) => {
        console.log("Message from agent:", message);
        setAgentMessages(prev => [...prev, {
            id: Date.now() + Math.random(),
            type: message.type || 'agent',
            content: message.message || message.text || JSON.stringify(message),
            timestamp: new Date()
        }]);
    },
    onError: (error) => {
      console.error('Voice agent error:', error);
      setVoiceError(error?.message || 'An unknown error occurred.');
      setIsConnecting(false);
      setIsSessionActive(false);
    }
  });

  useEffect(() => {
    const fetchAgentConfig = async () => {
      const defaultAgentId = import.meta.env.VITE_ELEVENLABS_AGENT_ID;
      if (defaultAgentId) {
        setAgentId(defaultAgentId);
      } else {
        setVoiceError('Voice agent not configured');
      }
    };
    fetchAgentConfig();
  }, []);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    setUploadedFile(file);
    setIsProcessingPDF(true);
    try {
      const formData = new FormData();
      formData.append('pdf', file);
      const response = await fetch(`${API_BASE}/api/voice/process-pdf`, {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) throw new Error('Failed to process PDF');
      const data = await response.json();
      setPdfContent(data.content);
    } catch (error) {
      console.error('Error processing PDF:', error);
      setUploadedFile(null);
    } finally {
      setIsProcessingPDF(false);
    }
  };

  const toggleVoiceAgent = async () => {
    if (isSessionActive || isConnecting) {
      conversation.endSession();
      return;
    }

    if (!studentName.trim() || !pdfContent || !agentId) {
      alert('Please enter your name and upload a PDF first.');
      return;
    }

    setIsConnecting(true);
    setVoiceError(null);

    try {
      const response = await fetch(`${API_BASE}/api/voice/get-signed-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId,
          studentName: studentName.trim(),
          pdfContent,
          fileName: uploadedFile.name,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to get signed URL: ${response.statusText}`);
      }

      const data = await response.json();
      setBackendSessionId(data.sessionId); // Store the session ID from the backend
      await conversation.startSession({ signedUrl: data.signedUrl });

    } catch (error) {
      console.error('Error starting voice agent:', error);
      setVoiceError(error.message);
      setIsConnecting(false);
    }
  };


  return (
    <>
      {/* Header Section */}
      <header className="dashboard-header">
        <div className="header-content">
          <div className="header-left">
            <div className="header-left-inner">
              <div className="header-icon"><BookOpen className="icon-medium" /></div>
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
              <input type="text" placeholder="Enter your name" value={studentName} onChange={(e) => setStudentName(e.target.value)} className="student-name-input" maxLength="50" />
            </div>
          </div>
          <div className="pdf-upload-container">
            <input ref={fileInputRef} type="file" accept=".pdf" onChange={handleFileUpload} className="file-input-hidden" id="pdf-upload" />
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
                  <button onClick={() => { setUploadedFile(null); setPdfContent(''); if(fileInputRef.current) fileInputRef.current.value = ''; }} className="remove-file-btn">
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
            {/* Spectrum bars logic can be simplified as `isSpeaking` is not directly available */}
            <div className="spectrum-center"><BookOpen size={48} /></div>
            <button onClick={toggleVoiceAgent} className={`voice-agent-center-btn ${isSessionActive ? 'connected' : voiceError ? 'error' : ''}`} title={isSessionActive ? 'End voice session' : 'Start voice assistant'} disabled={isConnecting || !agentId || !studentName.trim() || !pdfContent}>
              {isConnecting ? <RefreshCw className="spinning" size={24} /> : isSessionActive ? <BookOpen size={60} style={{ color: '#c62b2bff', fill:'#c62b2bff' }} /> : voiceError ? <AlertCircle size={24} /> : <BookOpen size={60} style={{ color: '#20bd59ff', fill: '#20bd59ff'}} />}
            </button>
          </div>
          {/* Query Input */}
          <div className="query-input-container">
            <input type="text" placeholder="You can also type your questions here..." className="query-input" onKeyDown={(e) => { if (e.key === 'Enter' && e.currentTarget.value.trim()) { sendMessage(e.currentTarget.value.trim()); e.currentTarget.value = ''; } }} />
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
                  <div className="message-time">{message.timestamp.toLocaleTimeString()}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        {/* Bottom Navigation */}
        <div className="bottom-navigation">
          <button className="nav-item active"><div className="nav-icon"><Home size={20} /></div><span>Home</span></button>
          <button className="nav-item"><div className="nav-icon"><GraduationCap size={20} /></div><span>Courses</span></button>
          <button className="nav-item"><div className="nav-icon"><TrendingUp size={20} /></div><span>Progress</span></button>
          <button className="nav-item"><div className="nav-icon"><FileText size={20} /></div><span>Resources</span></button>
          <button className="nav-item"><div className="nav-icon"><Settings size={20} /></div><span>Settings</span></button>
        </div>
      </main>
    </>
  );
};

export default StudentLessonView;
