import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useConversation } from '@elevenlabs/react';
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
  Eye,
  EyeOff,
  Download,
  Maximize2,
  Minimize2
} from 'lucide-react';

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

  // Visual display state
  const [visualContent, setVisualContent] = useState(null);
  const [visualHistory, setVisualHistory] = useState([]);
  const [isVisualPanelVisible, setIsVisualPanelVisible] = useState(true);
  const [visualPanelSize, setVisualPanelSize] = useState('normal'); // 'normal', 'maximized'
  const [visualLayout, setVisualLayout] = useState('side-by-side'); // 'side-by-side', 'overlay', 'fullscreen'

  const maxConnectionAttempts = 3;
  const isConnectingRef = useRef(false);
  const connectionTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);

  // Visual content rendering functions
  const renderEquation = (content) => {
    return (
      <div className="visual-equation">
        <h4>{content.title}</h4>
        <div className="equation-container">
          <div className="equation-latex" dangerouslySetInnerHTML={{ 
            __html: content.latex 
          }} />
        </div>
        {content.explanation && (
          <p className="equation-explanation">{content.explanation}</p>
        )}
      </div>
    );
  };

  const renderImage = (content) => {
    return (
      <div className="visual-image">
        <h4>{content.title}</h4>
        <div className="image-container">
          <img src={content.url} alt={content.alt || content.title} />
        </div>
        {content.caption && (
          <p className="image-caption">{content.caption}</p>
        )}
      </div>
    );
  };

  const renderDiagram = (content) => {
    return (
      <div className="visual-diagram">
        <h4>{content.title}</h4>
        <div className="diagram-container">
          {/* This will be populated with Mermaid or D3 content */}
          <div className="diagram-placeholder">
            <p>Diagram: {content.description}</p>
            {content.mermaidCode && (
              <pre className="mermaid-code">{content.mermaidCode}</pre>
            )}
          </div>
        </div>
        {content.explanation && (
          <p className="diagram-explanation">{content.explanation}</p>
        )}
      </div>
    );
  };

  const renderStepByStep = (content) => {
    return (
      <div className="visual-steps">
        <h4>{content.title}</h4>
        <div className="steps-container">
          {content.steps.map((step, index) => (
            <div 
              key={index} 
              className={`step ${index === content.currentStep ? 'current' : ''} ${index < content.currentStep ? 'completed' : ''}`}
            >
              <div className="step-number">{index + 1}</div>
              <div className="step-content">
                <h5>{step.title}</h5>
                <p>{step.description}</p>
                {step.visual && (
                  <div className="step-visual">
                    {step.visual.type === 'equation' && renderEquation(step.visual)}
                    {step.visual.type === 'image' && renderImage(step.visual)}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderMainPoints = (content) => {
    return (
      <div className="visual-main-points">
        <h4>{content.title}</h4>
        <div className="points-container">
          {content.points.map((point, index) => (
            <div key={index} className="main-point">
              <div className="point-icon">
                <CheckCircle2 size={20} />
              </div>
              <div className="point-content">
                <h5>{point.title}</h5>
                <p>{point.description}</p>
                {point.example && (
                  <div className="point-example">
                    <em>Example: {point.example}</em>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderAnalogy = (content) => {
    return (
      <div className="visual-analogy">
        <h4>{content.title}</h4>
        <div className="analogy-container">
          <div className="analogy-comparison">
            <div className="analogy-side">
              <h5>Concept</h5>
              <p>{content.concept}</p>
            </div>
            <div className="analogy-connector">↔</div>
            <div className="analogy-side">
              <h5>Like</h5>
              <p>{content.analogy}</p>
            </div>
          </div>
          <div className="analogy-explanation">
            <p>{content.explanation}</p>
          </div>
        </div>
      </div>
    );
  };

  const renderVisualContent = () => {
    if (!visualContent) {
      return (
        <div className="visual-placeholder">
          <Eye size={48} className="placeholder-icon" />
          <h3>Visual Learning Space</h3>
          <p>Visual content will appear here when the AI assistant starts teaching</p>
        </div>
      );
    }

    switch (visualContent.type) {
      case 'equation':
        return renderEquation(visualContent);
      case 'image':
        return renderImage(visualContent);
      case 'diagram':
        return renderDiagram(visualContent);
      case 'steps':
        return renderStepByStep(visualContent);
      case 'main-points':
        return renderMainPoints(visualContent);
      case 'analogy':
        return renderAnalogy(visualContent);
      default:
        return (
          <div className="visual-unknown">
            <p>Unknown visual content type: {visualContent.type}</p>
          </div>
        );
    }
  };

  // Create client tools with visual capabilities
  const clientTools = useMemo(() => ({
    // Original tools
    getStudentName: async () => {
      console.log('Agent requested student name:', studentName);
      return {
        student_name: studentName || "Student",
        message: `The current student's name is ${studentName || "Student"}`
      };
    },

    setStudentName: async ({ newName }) => {
      console.log('Agent attempting to set student name:', newName);
      if (newName && typeof newName === 'string' && newName.trim().length > 0) {
        setStudentName(newName.trim());
        return {
          success: true,
          student_name: newName.trim(),
          message: `Student name updated to ${newName.trim()}`
        };
      }
      return {
        success: false,
        message: "Invalid name provided"
      };
    },

    getSessionContext: async () => {
      console.log('Agent requested session context');
      return {
        student_name: studentName || "Student",
        has_pdf: !!uploadedFile,
        pdf_name: uploadedFile?.name || null,
        pdf_processed: !!pdfContent,
        session_active: isSessionActive,
        visual_panel_visible: isVisualPanelVisible,
        current_visual: visualContent?.type || null,
        message: `Session context: Student=${studentName || "Student"}, PDF=${uploadedFile?.name || 'none'}, Processed=${!!pdfContent}, Visual=${visualContent?.type || 'none'}`
      };
    },

    getPdfContent: async () => {
      console.log('Agent requested PDF content');
      if (!pdfContent) {
        return {
          has_content: false,
          content: null,
          message: "No PDF content available. Please upload and process a PDF first."
        };
      }
      
      return {
        has_content: true,
        content: pdfContent,
        pdf_name: uploadedFile?.name || "Unknown PDF",
        content_length: pdfContent.length,
        message: `PDF content retrieved: ${uploadedFile?.name || "Unknown PDF"} (${pdfContent.length} characters)`
      };
    },

    getPdfSummary: async ({ max_length = 500 }) => {
      console.log('Agent requested PDF summary, max length:', max_length);
      if (!pdfContent) {
        return {
          has_content: false,
          summary: null,
          message: "No PDF content available for summary."
        };
      }

      const summary = pdfContent.length > max_length 
        ? pdfContent.substring(0, max_length) + "..."
        : pdfContent;

      return {
        has_content: true,
        summary: summary,
        full_length: pdfContent.length,
        summary_length: summary.length,
        is_truncated: pdfContent.length > max_length,
        pdf_name: uploadedFile?.name || "Unknown PDF",
        message: `PDF summary generated from ${uploadedFile?.name || "Unknown PDF"} (${summary.length} of ${pdfContent.length} characters)`
      };
    },

    // Visual display tools
    showEquation: async ({ title, latex, explanation }) => {
      console.log('Agent showing equation:', title);
      const content = {
        id: Date.now(),
        type: 'equation',
        title: title || 'Mathematical Expression',
        latex: latex,
        explanation: explanation,
        timestamp: new Date()
      };
      
      setVisualContent(content);
      setVisualHistory(prev => [...prev, content]);
      
      return {
        success: true,
        message: `Equation displayed: ${title || 'Mathematical Expression'}`
      };
    },

    showImage: async ({ title, url, caption, alt }) => {
      console.log('Agent showing image:', title);
      const content = {
        id: Date.now(),
        type: 'image',
        title: title || 'Visual Content',
        url: url,
        caption: caption,
        alt: alt || title,
        timestamp: new Date()
      };
      
      setVisualContent(content);
      setVisualHistory(prev => [...prev, content]);
      
      return {
        success: true,
        message: `Image displayed: ${title || 'Visual Content'}`
      };
    },

    createDiagram: async ({ title, diagramType, description, mermaidCode, explanation }) => {
      console.log('Agent creating diagram:', title, diagramType);
      const content = {
        id: Date.now(),
        type: 'diagram',
        title: title || 'Diagram',
        diagramType: diagramType,
        description: description,
        mermaidCode: mermaidCode,
        explanation: explanation,
        timestamp: new Date()
      };
      
      setVisualContent(content);
      setVisualHistory(prev => [...prev, content]);
      
      return {
        success: true,
        message: `Diagram created: ${title || 'Diagram'} (${diagramType})`
      };
    },

    showStepByStep: async ({ title, steps, currentStep = 0 }) => {
      console.log('Agent showing step-by-step:', title);
      const content = {
        id: Date.now(),
        type: 'steps',
        title: title || 'Step-by-Step Process',
        steps: steps || [],
        currentStep: currentStep,
        timestamp: new Date()
      };
      
      setVisualContent(content);
      setVisualHistory(prev => [...prev, content]);
      
      return {
        success: true,
        message: `Step-by-step process displayed: ${title || 'Process'} (${steps?.length || 0} steps)`
      };
    },

    updateStepProgress: async ({ stepIndex }) => {
      console.log('Agent updating step progress to:', stepIndex);
      if (visualContent && visualContent.type === 'steps') {
        const updatedContent = {
          ...visualContent,
          currentStep: stepIndex,
          timestamp: new Date()
        };
        setVisualContent(updatedContent);
        
        return {
          success: true,
          message: `Step progress updated to step ${stepIndex + 1}`
        };
      }
      
      return {
        success: false,
        message: "No step-by-step content currently displayed"
      };
    },

    showMainPoints: async ({ title, points }) => {
      console.log('Agent showing main points:', title);
      const content = {
        id: Date.now(),
        type: 'main-points',
        title: title || 'Key Points',
        points: points || [],
        timestamp: new Date()
      };
      
      setVisualContent(content);
      setVisualHistory(prev => [...prev, content]);
      
      return {
        success: true,
        message: `Main points displayed: ${title || 'Key Points'} (${points?.length || 0} points)`
      };
    },

    showAnalogy: async ({ title, concept, analogy, explanation }) => {
      console.log('Agent showing analogy:', title);
      const content = {
        id: Date.now(),
        type: 'analogy',
        title: title || 'Analogy',
        concept: concept,
        analogy: analogy,
        explanation: explanation,
        timestamp: new Date()
      };
      
      setVisualContent(content);
      setVisualHistory(prev => [...prev, content]);
      
      return {
        success: true,
        message: `Analogy displayed: ${title || 'Analogy'}`
      };
    },

    clearVisuals: async () => {
      console.log('Agent clearing visuals');
      setVisualContent(null);
      
      return {
        success: true,
        message: "Visuals cleared"
      };
    },

    setVisualLayout: async ({ layout }) => {
      console.log('Agent setting visual layout:', layout);
      if (['side-by-side', 'overlay', 'fullscreen'].includes(layout)) {
        setVisualLayout(layout);
        return {
          success: true,
          message: `Visual layout set to: ${layout}`
        };
      }
      
      return {
        success: false,
        message: "Invalid layout. Use: side-by-side, overlay, or fullscreen"
      };
    },

    logMessage: async ({ message, level = 'info' }) => {
      console.log(`[Agent ${level.toUpperCase()}]:`, message);
      return {
        logged: true,
        message: `Logged: ${message}`
      };
    },

    showNotification: async ({ message, type = 'info' }) => {
      console.log(`[Agent Notification ${type.toUpperCase()}]:`, message);
      
      setAgentMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          type: 'system',
          content: `📢 ${message}`,
          timestamp: new Date(),
        },
      ]);

      return {
        success: true,
        message: `Notification shown: ${message}`
      };
    }
  }), [studentName, uploadedFile, pdfContent, isSessionActive, isVisualPanelVisible, visualContent]);

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
          content: `Voice agent connected! Hello ${studentName || 'there'}, I'm ready to help you learn with visual aids.`,
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
          content: 'Voice agent disconnected. Hope to help you again soon!',
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
    setVisualContent(null);
    setVisualHistory([]);
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
    setVisualContent(null);
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

  const toggleVisualPanel = () => {
    setIsVisualPanelVisible(!isVisualPanelVisible);
  };

  const toggleVisualPanelSize = () => {
    setVisualPanelSize(visualPanelSize === 'normal' ? 'maximized' : 'normal');
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

  const mainContentClass = `main-content ${visualLayout} ${isVisualPanelVisible ? 'visual-visible' : 'visual-hidden'} ${visualPanelSize}`;

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
        <div className={mainContentClass}>
          {/* Left Panel - Controls and Chat */}
          <div className="control-panel">
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
            <div className="ai-container">
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
          </div>
          </div>

          {/* Right Panel - Visual Display */}
          {isVisualPanelVisible && (
            <div className="visual-panel">
              <div className="visual-panel-header">
                <h3>Visual Learning</h3>
                <div className="visual-panel-controls">
                  <button 
                    onClick={toggleVisualPanelSize}
                    className="control-btn"
                    title={visualPanelSize === 'normal' ? 'Maximize' : 'Minimize'}
                  >
                    {visualPanelSize === 'normal' ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
                  </button>
                  <button 
                    onClick={toggleVisualPanel}
                    className="control-btn"
                    title="Hide visual panel"
                  >
                    <EyeOff size={16} />
                  </button>
                </div>
              </div>
              
              <div className="visual-content-area">
                {renderVisualContent()}
              </div>

              {visualHistory.length > 0 && (
                <div className="visual-history">
                  <h4>Recent Visuals</h4>
                  <div className="history-items">
                    {visualHistory.slice(-3).map((item) => (
                      <button
                        key={item.id}
                        className="history-item"
                        onClick={() => setVisualContent(item)}
                        title={`Return to: ${item.title}`}
                      >
                        <span className="history-type">{item.type}</span>
                        <span className="history-title">{item.title}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Visual Panel Toggle Button (when hidden) */}
          {!isVisualPanelVisible && (
            <button 
              onClick={toggleVisualPanel}
              className="visual-toggle-btn"
              title="Show visual panel"
            >
              <Eye size={20} />
              <span>Show Visuals</span>
            </button>
          )}
        </div>

        {/* Bottom nav */}
        <div className="bottom-navigation">
          <button className="nav-item active"><Home size={20} /><span>Home</span></button>
          <button className="nav-item"><GraduationCap size={20} /><span>Courses</span></button>
          <button className="nav-item"><TrendingUp size={20} /><span>Progress</span></button>
          <button className="nav-item"><FileText size={20} /><span>Resources</span></button>
          <button className="nav-item"><Settings size={20} /><span>Settings</span></button>
        </div>
      </main>

      <style jsx>{`
        .main-content {
          display: flex;
          gap: 20px;
          height: 98vh;
          transition: all 0.3s ease;
          width: 96vw;
          
        }

        .control-panel {
          flex: 1;
          min-width: 300px;
          overflow-y: auto;
          padding-right: 10px;
          
        }

        .visual-panel {
          flex: 1;
          background: #f8f9fa;
          border-radius: 12px;
          border: 1px solid #e9ecef;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          min-width: 400px;
          max-height: 80vh;
          magin: 0 auto;
        }

        .visual-panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          background: #fff;
          border-bottom: 1px solid #e9ecef;
        }

        .visual-panel-header h3 {
          margin: 0;
          color: #333;
          font-size: 18px;
          font-weight: 600;
        }

        .visual-panel-controls {
          display: flex;
          gap: 8px;
        }

        .control-btn {
          background: none;
          border: 1px solid #ddd;
          border-radius: 6px;
          padding: 6px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }

        .control-btn:hover {
          background: #f0f0f0;
          border-color: #bbb;
        }

        .visual-content-area {
          flex: 1;
          padding: 20px;
          overflow-y: auto;
          background: #fff;
        }

        .visual-placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          text-align: center;
          color: #666;
        }

        .placeholder-icon {
          margin-bottom: 16px;
          opacity: 0.5;
        }

        .visual-placeholder h3 {
          margin: 0 0 8px 0;
          font-size: 20px;
          color: #333;
        }

        .visual-placeholder p {
          margin: 0;
          font-size: 14px;
        }

        .visual-equation {
          background: #fff;
          border: 1px solid #e9ecef;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 16px;
        }

        .visual-equation h4 {
          margin: 0 0 16px 0;
          color: #333;
          font-size: 18px;
        }

        .equation-container {
          background: #f8f9fa;
          border-radius: 6px;
          padding: 20px;
          text-align: center;
          font-size: 20px;
          margin-bottom: 12px;
        }

        .equation-explanation {
          margin: 0;
          color: #666;
          font-size: 14px;
          line-height: 1.5;
        }

        .visual-image {
          background: #fff;
          border: 1px solid #e9ecef;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 16px;
        }

        .visual-image h4 {
          margin: 0 0 16px 0;
          color: #333;
          font-size: 18px;
        }

        .image-container {
          text-align: center;
          margin-bottom: 12px;
        }

        .image-container img {
          max-width: 100%;
          height: auto;
          border-radius: 6px;
          border: 1px solid #e9ecef;
        }

        .image-caption {
          margin: 0;
          color: #666;
          font-size: 14px;
          text-align: center;
          font-style: italic;
        }

        .visual-diagram {
          background: #fff;
          border: 1px solid #e9ecef;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 16px;
        }

        .visual-diagram h4 {
          margin: 0 0 16px 0;
          color: #333;
          font-size: 18px;
        }

        .diagram-container {
          background: #f8f9fa;
          border-radius: 6px;
          padding: 20px;
          margin-bottom: 12px;
        }

        .diagram-placeholder {
          text-align: center;
          color: #666;
        }

        .mermaid-code {
          background: #f0f0f0;
          padding: 12px;
          border-radius: 4px;
          font-size: 12px;
          margin-top: 12px;
          overflow-x: auto;
        }

        .diagram-explanation {
          margin: 0;
          color: #666;
          font-size: 14px;
          line-height: 1.5;
        }

        .visual-steps {
          background: #fff;
          border: 1px solid #e9ecef;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 16px;
        }

        .visual-steps h4 {
          margin: 0 0 20px 0;
          color: #333;
          font-size: 18px;
        }

        .steps-container {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .step {
          display: flex;
          gap: 16px;
          padding: 16px;
          border-radius: 8px;
          border: 2px solid #e9ecef;
          transition: all 0.3s ease;
        }

        .step.current {
          border-color: #007bff;
          background: #f0f8ff;
        }

        .step.completed {
          border-color: #28a745;
          background: #f0fff0;
        }

        .step-number {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #e9ecef;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 14px;
          flex-shrink: 0;
        }

        .step.current .step-number {
          background: #007bff;
          color: white;
        }

        .step.completed .step-number {
          background: #28a745;
          color: white;
        }

        .step-content {
          flex: 1;
        }

        .step-content h5 {
          margin: 0 0 8px 0;
          color: #333;
          font-size: 16px;
        }

        .step-content p {
          margin: 0 0 12px 0;
          color: #666;
          font-size: 14px;
          line-height: 1.5;
        }

        .step-visual {
          margin-top: 12px;
          padding: 12px;
          background: #f8f9fa;
          border-radius: 6px;
        }

        .visual-main-points {
          background: #fff;
          border: 1px solid #e9ecef;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 16px;
        }

        .visual-main-points h4 {
          margin: 0 0 20px 0;
          color: #333;
          font-size: 18px;
        }

        .points-container {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .main-point {
          display: flex;
          gap: 12px;
          padding: 16px;
          background: #f8f9fa;
          border-radius: 8px;
          border-left: 4px solid #007bff;
        }

        .point-icon {
          color: #007bff;
          flex-shrink: 0;
          margin-top: 2px;
        }

        .point-content h5 {
          margin: 0 0 8px 0;
          color: #333;
          font-size: 16px;
          font-weight: 600;
        }

        .point-content p {
          margin: 0 0 8px 0;
          color: #666;
          font-size: 14px;
          line-height: 1.5;
        }

        .point-example {
          margin-top: 8px;
          padding: 8px 12px;
          background: #fff;
          border-radius: 4px;
          border: 1px solid #e9ecef;
        }

        .point-example em {
          color: #666;
          font-size: 13px;
        }

        .visual-analogy {
          background: #fff;
          border: 1px solid #e9ecef;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 16px;
        }

        .visual-analogy h4 {
          margin: 0 0 20px 0;
          color: #333;
          font-size: 18px;
        }

        .analogy-container {
          background: #f8f9fa;
          border-radius: 8px;
          padding: 20px;
        }

        .analogy-comparison {
          display: flex;
          align-items: center;
          gap: 20px;
          margin-bottom: 16px;
        }

        .analogy-side {
          flex: 1;
          text-align: center;
          padding: 16px;
          background: #fff;
          border-radius: 6px;
          border: 1px solid #e9ecef;
        }

        .analogy-side h5 {
          margin: 0 0 8px 0;
          color: #666;
          font-size: 14px;
          text-transform: uppercase;
          font-weight: 600;
        }

        .analogy-side p {
          margin: 0;
          color: #333;
          font-size: 16px;
          font-weight: 500;
        }

        .analogy-connector {
          font-size: 24px;
          color: #007bff;
          font-weight: bold;
        }

        .analogy-explanation {
          text-align: center;
        }

        .analogy-explanation p {
          margin: 0;
          color: #666;
          font-size: 14px;
          line-height: 1.5;
          font-style: italic;
        }

        .visual-history {
          padding: 16px 20px;
          background: #f8f9fa;
          border-top: 1px solid #e9ecef;
        }

        .visual-history h4 {
          margin: 0 0 12px 0;
          color: #333;
          font-size: 14px;
          font-weight: 600;
        }

        .history-items {
          display: flex;
          gap: 8px;
          overflow-x: auto;
        }

        .history-item {
          background: #fff;
          border: 1px solid #ddd;
          border-radius: 6px;
          padding: 8px 12px;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          min-width: 120px;
          transition: all 0.2s ease;
        }

        .history-item:hover {
          border-color: #007bff;
          background: #f0f8ff;
        }

        .history-type {
          font-size: 10px;
          color: #666;
          text-transform: uppercase;
          font-weight: 600;
          margin-bottom: 2px;
        }

        .history-title {
          font-size: 12px;
          color: #333;
          font-weight: 500;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          width: 100%;
        }

        .visual-toggle-btn {
          position: fixed;
          right: 20px;
          top: 50%;
          transform: translateY(-50%);
          background: #007bff;
          color: white;
          border: none;
          border-radius: 8px;
          padding: 12px 16px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          font-weight: 500;
          box-shadow: 0 4px 12px rgba(0, 123, 255, 0.3);
          transition: all 0.3s ease;
          z-index: 1000;
        }

        .visual-toggle-btn:hover {
          background: #0056b3;
          transform: translateY(-50%) scale(1.05);
        }

        .visual-unknown {
          padding: 20px;
          text-align: center;
          color: #666;
          background: #fff3cd;
          border: 1px solid #ffeaa7;
          border-radius: 8px;
        }

        /* Responsive Design */
        @media (max-width: 768px) {
          .main-content {
            flex-direction: column;
            height: 98vh;
            width: 98vw
          }

          .control-panel {
            min-width: auto;
            order: 1;
          }

          .visual-panel {
            min-width: auto;
            order: 2;
            min-height: 400px;
          }

          .visual-toggle-btn {
            position: relative;
            right: auto;
            top: auto;
            transform: none;
            margin: 16px auto;
            display: flex;
            width: fit-content;
          }

          .analogy-comparison {
            flex-direction: column;
            gap: 12px;
          }

          .analogy-connector {
            transform: rotate(90deg);
          }
        }

        /* Layout variations */
        .main-content.visual-hidden .control-panel {
          flex: 1;
          max-width: none;
        }

        .main-content.maximized .visual-panel {
          flex: 2;
        }

        .main-content.fullscreen .visual-panel {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 2000;
          flex: none;
          border-radius: 0;
        }

        .main-content.overlay .visual-panel {
          position: fixed;
          top: 100px;
          right: 20px;
          width: 400px;
          height: 60vh;
          z-index: 1500;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
        }
      `}</style>
    </>
  );
};

export default StudentLessonView;