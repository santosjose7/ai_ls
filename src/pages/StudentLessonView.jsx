import React, { useEffect, useState, useRef } from 'react';
import { useConversation, ClientTools } from '@elevenlabs/react';
import '../styles/StudentLessonView.css';

import {
  BookOpen,
  Upload,
  FileText,
  X,
  Loader,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Home,
  GraduationCap,
  TrendingUp,
  Settings,
  User,
} from 'lucide-react';

// Create and register the client tool only once (outside the component)
const clientTools = new ClientTools();
clientTools.register('getStudentName', ({ studentName }) => {
  const clean = typeof studentName === 'string' ? studentName.trim() : '';
  return { student_name: clean.length > 0 ? clean : 'Unknown' };
});

const StudentLessonView = () => {
  const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000';

  // Local state
  const [studentName, setStudentName] = useState('');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [pdfContent, setPdfContent] = useState('');
  const [isProcessingPDF, setIsProcessingPDF] = useState(false);
  const [agentId, setAgentId] = useState(null);
  const [agentMessages, setAgentMessages] = useState([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [voiceError, setVoiceError] = useState(null);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const [isSessionActive, setIsSessionActive] = useState(false);

  const maxConnectionAttempts = 3;
  const isConnectingRef = useRef(false);
  const connectionTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);

  const validateAgentId = (id) => {
    if (!id || typeof id !== 'string') return false;
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const safe = /^[a-zA-Z0-9_-]+$/;
    return uuid.test(id) || (safe.test(id) && id.length >= 8);
  };

  // Hook for managing the voice conversation
  const conversation = useConversation({
    clientTools, 
    onConnect: () => {
      isConnectingRef.current = false;
      setIsConnecting(false);
      setIsSessionActive(true);
      setVoiceError(null);
      setConnectionAttempts(0);
      setAgentMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          type: 'system',
          content: 'Voice agent connected! Start speaking.',
          timestamp: new Date(),
        },
      ]);
      if (connectionTimeoutRef.current) clearTimeout(connectionTimeoutRef.current);
    },
    onDisconnect: () => {
      isConnectingRef.current = false;
      setIsConnecting(false);
      setIsSessionActive(false);
      setAgentMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          type: 'system',
          content: 'Voice agent disconnected.',
          timestamp: new Date(),
        },
      ]);
      if (connectionTimeoutRef.current) clearTimeout(connectionTimeoutRef.current);
    },
    onMessage: (msg) => {
      const content = typeof msg === 'string'
        ? msg
        : msg.message ?? msg.text ?? msg.content ?? JSON.stringify(msg);
      const type = typeof msg === 'string'
        ? 'agent'
        : msg.type ?? msg.source ?? 'agent';

      setAgentMessages((prev) => [
        ...prev,
        {
          id: Date.now() + Math.random(),
          type,
          content,
          timestamp: new Date(),
          isFinal: msg?.isFinal ?? true,
        },
      ]);
    },
    onError: (err) => {
      const errorMessage = err?.message ?? err?.toString() ?? 'Unknown error';
      console.error('Voice agent error:', errorMessage);
      isConnectingRef.current = false;
      setIsConnecting(false);
      setIsSessionActive(false);
      setVoiceError(errorMessage);
      setAgentMessages((prev) => [
        ...prev,
        { id: Date.now(), type: 'error', content: `Error: ${errorMessage}`, timestamp: new Date() },
      ]);
      if (connectionTimeoutRef.current) clearTimeout(connectionTimeoutRef.current);
    },
  });

  useEffect(() => {
    const defaultAgent = import.meta.env.VITE_ELEVENLABS_AGENT_ID;
    if (validateAgentId(defaultAgent)) {
      setAgentId(defaultAgent);
      console.log('Using agent ID:', defaultAgent);
    } else {
      setVoiceError('Voice agent not configured');
    }

    return () => {
      if (connectionTimeoutRef.current) clearTimeout(connectionTimeoutRef.current);
      if (conversation.status === 'connected' && !isConnectingRef.current) {
        conversation.endSession().catch(console.error);
      }
    };
  }, []);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || file.type !== 'application/pdf' || file.size > 10 * 1024 * 1024) {
      alert('Please upload a valid PDF (< 10MB).');
      return;
    }

    setUploadedFile(file);
    setIsProcessingPDF(true);
    try {
      const form = new FormData();
      form.append('pdf', file);
      const resp = await fetch(`${API_BASE}/api/voice/process-pdf`, { method: 'POST', body: form });
      if (!resp.ok) throw new Error('PDF processing failed');
      const json = await resp.json();
      setPdfContent(json.content);
    } catch (err) {
      console.error(err);
      alert('Failed to process PDF.');
      setUploadedFile(null);
    } finally {
      setIsProcessingPDF(false);
    }
  };

  const removeFile = () => {
    setUploadedFile(null);
    setPdfContent('');
    fileInputRef.current && (fileInputRef.current.value = '');
  };

  const stopVoiceAgent = async () => {
    if (conversation.status === 'connected') {
      await conversation.endSession();
    }
    if (connectionTimeoutRef.current) clearTimeout(connectionTimeoutRef.current);
    isConnectingRef.current = false;
    setIsSessionActive(false);
    setIsConnecting(false);
    setVoiceError(null);
    setConnectionAttempts(0);
    setAgentMessages([]);
  };

  const toggleVoiceAgent = async () => {
    if (conversation.status === 'connected') {
      await stopVoiceAgent();
      return;
    }

    if (isConnecting || isConnectingRef.current) return;
    if (!studentName.trim()) return alert('Please enter your name.');
    if (!uploadedFile || !pdfContent) return alert('Please upload a PDF first.');
    if (!agentId) return alert('Voice agent not configured.');

    if (connectionAttempts >= maxConnectionAttempts) {
      setVoiceError('Max attempts reached.');
      return;
    }

    isConnectingRef.current = true;
    setIsConnecting(true);
    setVoiceError(null);
    setConnectionAttempts((c) => c + 1);

    const timeout = setTimeout(() => {
      if (isConnectingRef.current) {
        isConnectingRef.current = false;
        setIsConnecting(false);
        setVoiceError('Connection timeout.');
        setAgentMessages((prev) => [
          ...prev,
          { id: Date.now(), type: 'error', content: 'Connection timeout.', timestamp: new Date() },
        ]);
      }
    }, 30000);
    connectionTimeoutRef.current = timeout;

    try {
      const resp = await fetch(`${API_BASE}/api/voice/get-signed-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId,
          studentName: studentName.trim(),
          pdfContent,
          fileName: uploadedFile.name,
        }),
      });
      if (!resp.ok) throw new Error(`Server responded ${resp.status}`);
      const { signedUrl } = await resp.json();
      if (!signedUrl) throw new Error('No signedUrl returned');

      setAgentMessages((prev) => [
        ...prev,
        { id: Date.now(), type: 'system', content: 'Connecting to voice agent...', timestamp: new Date() },
      ]);

      await conversation.startSession({
        signedUrl,
        
        // initial dynamic variable (optional since tool can supply): student_name: studentName.trim()
      });

      clearTimeout(timeout);
    } catch (e) {
      console.error(e);
      isConnectingRef.current = false;
      setIsConnecting(false);
      setVoiceError(e.message ?? 'Failed to connect');
      setConnectionAttempts((c) => c - 1);
      setAgentMessages((prev) => [
        ...prev,
        { id: Date.now(), type: 'error', content: `Error: ${e.message}`, timestamp: new Date() },
      ]);
      clearTimeout(timeout);
    }
  };

  const retryVoiceConnection = () => {
    setConnectionAttempts(0);
    setVoiceError(null);
    toggleVoiceAgent();
  };

  const generateSpectrumBars = () => {
    const bars = [];
    const total = 60;
    for (let i = 0; i < total; i++) {
      const angle = (i / total) * 360;
      const hue = (i / total) * 360;
      bars.push(
        <div key={i} className={`spectrum-bar ${
            isConnecting
              ? 'connecting'
              : conversation.status === 'connected'
                ? conversation.isSpeaking
                  ? 'speaking'
                  : 'listening'
                : ''
          }`} style={{
            transform: `rotate(${angle}deg) translateY(-130px)`,
            background: `hsl(${hue}, 70%, 60%)`,
            animationDelay: `${i * 0.05}s`
          }} />
      );
    }
    return bars;
  };

  return (
    <>
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-content">
          <div className="header-left-inner">
            <div className="header-icon"><BookOpen className="icon-medium" /></div>
            <h2>AI Learning Assistant</h2>
          </div>
        </div>
      </header>

      <main className="container-lessons-page">
        {/* Student input */}
        <div className="student-input-container">
          <div className="input-group">
            <User size={20} className="input-icon" />
            <input
              type="text"
              placeholder="Enter your name"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              maxLength={50}
              className="student-name-input"
            />
          </div>
        </div>

        {/* PDF upload */}
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
              <Upload size={48} className="upload-icon" />
              <h3>Upload PDF Document</h3>
              <p>Drop your PDF here or click to browse</p>
              <span className="file-info">Max file size: 10MB</span>
            </label>
          ) : (
            <div className="uploaded-file-info">
              <FileText size={24} className="file-icon" />
              <div className="file-info">
                <h4>{uploadedFile.name}</h4>
                <p>{(uploadedFile.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
              <button onClick={removeFile} className="remove-file-btn">
                <X size={20} />
              </button>
              {isProcessingPDF && (
                <div className="processing-indicator">
                  <Loader className="spinning" size={20} />
                  <span>Processing PDF...</span>
                </div>
              )}
              {!isProcessingPDF && pdfContent && (
                <div className="success-indicator">
                  <CheckCircle2 size={20} />
                  <span>PDF processed successfully!</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Assistant title */}
        <div className="ai-assistant-title">
          <h1>AI Learning Assistant</h1>
          <p>Upload a lesson and chat with your AI tutor</p>
        </div>

        {/* Voice status/errors */}
        {voiceError && (
          <div className="voice-status-message error">
            <AlertCircle size={20} />
            <span>{voiceError}</span>
            {connectionAttempts < maxConnectionAttempts && (
              <button className="retry-button" onClick={retryVoiceConnection}>
                <RefreshCw size={16} /> Retry
              </button>
            )}
          </div>
        )}

        {(conversation.status === 'connected' || isSessionActive) && (
          <div className="voice-status-message connected">
            <CheckCircle2 size={16} />
            <span>Connected and ready to help {studentName.trim()}!</span>
          </div>
        )}

        {/* Voice UI */}
        <div className="spectrum-container">
          <div className="spectrum-circle">
            {generateSpectrumBars()}
            <div className="spectrum-center">
              <BookOpen size={48} />
            </div>

            <button
              onClick={toggleVoiceAgent}
              disabled={isConnecting || !studentName.trim() || !uploadedFile || !pdfContent || !agentId}
              className={`voice-agent-center-btn ${
                conversation.status === 'connected' || isSessionActive
                  ? 'connected'
                  : voiceError
                    ? 'error'
                    : ''
              }`}
              title={
                conversation.status === 'connected' || isSessionActive
                  ? 'End session'
                  : voiceError
                    ? voiceError
                    : 'Start voice assistant'
              }
            >
              {isConnecting ? (
                <RefreshCw className="spinning" size={24} />
              ) : conversation.status === 'connected' || isSessionActive ? (
                <BookOpen size={60} style={{ color: '#c62b2bff', fill: '#c62b2bff' }} />
              ) : voiceError ? (
                <AlertCircle size={24} />
              ) : (
                <BookOpen size={60} style={{ color: '#20bd59ff', fill: '#20bd59ff' }} />
              )}
            </button>
          </div>

          <div className="query-input-container">
            <input
              type="text"
              placeholder="You can also type your questions here..."
              className="query-input"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  conversation.sendUserMessage(e.currentTarget.value);
                  e.currentTarget.value = '';
                }
              }}
            />
          </div>
        </div>

        {/* Chat history */}
        {agentMessages.length > 0 && (
          <div className="chat-messages">
            <h3>Conversation</h3>
            <div className="messages-container">
              {agentMessages.map((msg) => (
                <div key={msg.id} className={`message ${msg.type}`}>
                  <div className="message-content">{msg.content}</div>
                  <div className="message-time">{msg.timestamp.toLocaleTimeString()}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bottom nav */}
        <div className="bottom-navigation">
          <button className="nav-item active"><Home size={20} /><span>Home</span></button>
          <button className="nav-item"><GraduationCap size={20} /><span>Courses</span></button>
          <button className="nav-item"><TrendingUp size={20} /><span>Progress</span></button>
          <button className="nav-item"><FileText size={20} /><span>Resources</span></button>
          <button className="nav-item"><Settings size={20} /><span>Settings</span></button>
        </div>
      </main>
    </>
  );
};

export default StudentLessonView;
