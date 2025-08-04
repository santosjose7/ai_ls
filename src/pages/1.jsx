import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useConversation } from '@elevenlabs/react';
import { 
  BookOpen, Upload, FileText, X, Loader, CheckCircle2, AlertCircle, RefreshCw, 
  Home, GraduationCap, TrendingUp, Settings, User, Palette, Download, Trash2,
  Square, Circle, Triangle, Pen, Type, Eraser, Undo, Redo
} from 'lucide-react';

import '../styles/StudentLessonView1.module.css';

const StudentLessonView1 = () => {
  const API_BASE = 'http://localhost:5000'; // Since we can't use import.meta.env

  // Local state
  const [studentName, setStudentName] = useState('');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [pdfContent, setPdfContent] = useState('');
  const [isProcessingPDF, setIsProcessingPDF] = useState(false);
  const [agentId, setAgentId] = useState('demo-agent-id');
  const [agentMessages, setAgentMessages] = useState([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [voiceError, setVoiceError] = useState(null);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const [isSessionActive, setIsSessionActive] = useState(false);
  
  // Canvas state
  const [showCanvas, setShowCanvas] = useState(false);
  const [canvasHistory, setCanvasHistory] = useState([]);
  const [currentTool, setCurrentTool] = useState('pen');
  const [drawingColor, setDrawingColor] = useState('#ff6b6b');
  const [brushSize, setBrushSize] = useState(3);

  const maxConnectionAttempts = 3;
  const isConnectingRef = useRef(false);
  const connectionTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);
  const canvasRef = useRef(null);
  const fabricCanvasRef = useRef(null);

  // Initialize Fabric.js canvas
  useEffect(() => {
    if (showCanvas && canvasRef.current && !fabricCanvasRef.current) {
      // Since we can't import Fabric.js directly, we'll simulate it with HTML5 Canvas
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      // Set canvas size
      canvas.width = 800;
      canvas.height = 600;
      
      // Store canvas context for drawing operations
      fabricCanvasRef.current = {
        canvas,
        ctx,
        isDrawing: false,
        lastX: 0,
        lastY: 0
      };

      // Set up drawing event listeners
      const startDrawing = (e) => {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        fabricCanvasRef.current.isDrawing = true;
        fabricCanvasRef.current.lastX = x;
        fabricCanvasRef.current.lastY = y;
        
        ctx.beginPath();
        ctx.moveTo(x, y);
      };

      const draw = (e) => {
        if (!fabricCanvasRef.current.isDrawing) return;
        
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        ctx.strokeStyle = drawingColor;
        ctx.lineWidth = brushSize;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        if (currentTool === 'pen') {
          ctx.lineTo(x, y);
          ctx.stroke();
        } else if (currentTool === 'eraser') {
          ctx.globalCompositeOperation = 'destination-out';
          ctx.lineTo(x, y);
          ctx.stroke();
          ctx.globalCompositeOperation = 'source-over';
        }
        
        fabricCanvasRef.current.lastX = x;
        fabricCanvasRef.current.lastY = y;
      };

      const stopDrawing = () => {
        fabricCanvasRef.current.isDrawing = false;
        ctx.beginPath();
        // Save state for undo functionality
        saveCanvasState();
      };

      canvas.addEventListener('mousedown', startDrawing);
      canvas.addEventListener('mousemove', draw);
      canvas.addEventListener('mouseup', stopDrawing);
      canvas.addEventListener('mouseout', stopDrawing);

      return () => {
        canvas.removeEventListener('mousedown', startDrawing);
        canvas.removeEventListener('mousemove', draw);
        canvas.removeEventListener('mouseup', stopDrawing);
        canvas.removeEventListener('mouseout', stopDrawing);
      };
    }
  }, [showCanvas, currentTool, drawingColor, brushSize]);

  const saveCanvasState = () => {
    if (fabricCanvasRef.current?.canvas) {
      const imageData = fabricCanvasRef.current.canvas.toDataURL();
      setCanvasHistory(prev => [...prev.slice(-9), imageData]); // Keep last 10 states
    }
  };

  const clearCanvas = () => {
    if (fabricCanvasRef.current?.ctx) {
      const { canvas, ctx } = fabricCanvasRef.current;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      saveCanvasState();
    }
  };

  const undoCanvas = () => {
    if (canvasHistory.length > 1) {
      const newHistory = canvasHistory.slice(0, -1);
      setCanvasHistory(newHistory);
      
      if (fabricCanvasRef.current?.ctx && newHistory.length > 0) {
        const { canvas, ctx } = fabricCanvasRef.current;
        const img = new Image();
        img.onload = () => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
        };
        img.src = newHistory[newHistory.length - 1];
      }
    }
  };

  const downloadCanvas = () => {
    if (fabricCanvasRef.current?.canvas) {
      const link = document.createElement('a');
      link.download = 'lesson-visual.png';
      link.href = fabricCanvasRef.current.canvas.toDataURL();
      link.click();
    }
  };

  // Enhanced client tools with canvas capabilities
  const clientTools = useMemo(() => ({
    // Existing tools...
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

    // NEW CANVAS TOOLS
    showCanvas: async ({ message = "Let me show you this visually!" } = {}) => {
      console.log('Agent requesting to show canvas');
      setShowCanvas(true);
      setAgentMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          type: 'system',
          content: `🎨 ${message}`,
          timestamp: new Date(),
        },
      ]);
      return {
        success: true,
        canvas_visible: true,
        message: "Canvas is now visible for visual demonstrations"
      };
    },

    hideCanvas: async () => {
      console.log('Agent requesting to hide canvas');
      setShowCanvas(false);
      return {
        success: true,
        canvas_visible: false,
        message: "Canvas hidden"
      };
    },

    drawShape: async ({ shape, x = 100, y = 100, size = 50, color = '#ff6b6b' }) => {
      console.log('Agent drawing shape:', { shape, x, y, size, color });
      
      if (!fabricCanvasRef.current?.ctx) {
        setShowCanvas(true);
        await new Promise(resolve => setTimeout(resolve, 500)); // Wait for canvas to initialize
      }

      const { ctx } = fabricCanvasRef.current || {};
      if (!ctx) return { success: false, message: "Canvas not available" };

      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = 3;

      ctx.beginPath();
      switch (shape) {
        case 'circle':
          ctx.arc(x, y, size, 0, 2 * Math.PI);
          ctx.stroke();
          break;
        case 'square':
          ctx.rect(x - size/2, y - size/2, size, size);
          ctx.stroke();
          break;
        case 'triangle':
          ctx.moveTo(x, y - size/2);
          ctx.lineTo(x - size/2, y + size/2);
          ctx.lineTo(x + size/2, y + size/2);
          ctx.closePath();
          ctx.stroke();
          break;
        default:
          return { success: false, message: "Unknown shape" };
      }

      saveCanvasState();
      return {
        success: true,
        shape_drawn: shape,
        position: { x, y },
        size,
        color,
        message: `Drew ${shape} at position (${x}, ${y})`
      };
    },

    addText: async ({ text, x = 100, y = 100, fontSize = 20, color = '#333' }) => {
      console.log('Agent adding text:', { text, x, y, fontSize, color });
      
      if (!fabricCanvasRef.current?.ctx) {
        setShowCanvas(true);
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      const { ctx } = fabricCanvasRef.current || {};
      if (!ctx) return { success: false, message: "Canvas not available" };

      ctx.font = `${fontSize}px Arial`;
      ctx.fillStyle = color;
      ctx.fillText(text, x, y);

      saveCanvasState();
      return {
        success: true,
        text_added: text,
        position: { x, y },
        font_size: fontSize,
        color,
        message: `Added text: "${text}" at position (${x}, ${y})`
      };
    },

    clearCanvas: async () => {
      console.log('Agent clearing canvas');
      clearCanvas();
      return {
        success: true,
        message: "Canvas cleared"
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
  }), [studentName, uploadedFile, pdfContent, isSessionActive]);

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
          content: `Voice agent connected! Hello ${studentName || 'there'}, I'm ready to help you learn.`,
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

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || file.type !== 'application/pdf' || file.size > 10 * 1024 * 1024) {
      alert('Please upload a valid PDF (< 10MB).');
      return;
    }

    setUploadedFile(file);
    setIsProcessingPDF(true);
    
    // Simulate PDF processing
    setTimeout(() => {
      setPdfContent('Sample PDF content processed successfully...');
      setIsProcessingPDF(false);
    }, 2000);
  };

  const removeFile = () => {
    setUploadedFile(null);
    setPdfContent('');
    if (fileInputRef.current) fileInputRef.current.value = '';
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
        
        // variables: { student_name: studentName.trim() }
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

  const generateSpectrumBars = () => {
    const bars = [];
    const total = 60;
    for (let i = 0; i < total; i++) {
      const angle = (i / total) * 360;
      const hue = (i / total) * 360;
      bars.push(
        <div 
          key={i} 
          className={`spectrum-bar ${isConnecting ? 'connecting' : conversation.status === 'connected' ? 'listening' : ''}`}
          style={{
            position: 'absolute',
            width: '3px',
            height: '20px',
            background: `hsl(${hue}, 70%, 60%)`,
            transformOrigin: '50% 130px',
            transform: `rotate(${angle}deg) translateY(-130px)`,
            borderRadius: '2px',
            animation: isConnecting ? `pulse 1.5s ease-in-out infinite ${i * 0.05}s` : 'none'
          }}
        />
      );
    }
    return bars;
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.headerTitleWrapper}>
            <BookOpen className={styles.headerIcon} />
            <h2 className={styles.headerTitle}>AI Learning Assistant</h2>
          </div>
        </div>
      </header>

      <main className={styles.main}>
        {/* Student Input */}
        <div className={styles.section}>
          <div className={styles.card}>
            <div className={styles.studentInputWrapper}>
              <User className={styles.inputIcon} />
              <input
                type="text"
                placeholder="Enter your name"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                maxLength={50}
                className={styles.studentInput}
              />
            </div>
          </div>
        </div>

        {/* PDF Upload */}
        <div className={styles.section}>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={handleFileUpload}
            className={styles.hiddenInput}
            id="pdf-upload"
          />
          {!uploadedFile ? (
            <label htmlFor="pdf-upload" className={styles.uploadArea}>
              <div className={styles.uploadContent}>
                <Upload className={styles.uploadIcon} />
                <h3 className={styles.uploadTitle}>Upload PDF Document</h3>
                <p className={styles.uploadDescription}>Drop your PDF here or click to browse</p>
                <span className={styles.uploadLimit}>Max file size: 10MB</span>
              </div>
            </label>
          ) : (
            <div className={styles.card}>
              <div className={styles.fileInfo}>
                <FileText className={styles.fileIcon} />
                <div className={styles.fileDetails}>
                  <h4 className={styles.fileName}>{uploadedFile.name}</h4>
                  <p className={styles.fileSize}>{(uploadedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                <button onClick={removeFile} className={styles.removeButton}>
                  <X className={styles.removeIcon} />
                </button>
                {isProcessingPDF ? (
                  <div className={styles.processingStatus}>
                    <Loader className={styles.processingIcon} />
                    <span>Processing PDF...</span>
                  </div>
                ) : pdfContent && (
                  <div className={styles.successStatus}>
                    <CheckCircle2 className={styles.successIcon} />
                    <span>PDF processed successfully!</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className={styles.gridLayout}>
          {/* Voice Interface */}
          <div className={styles.voiceCard}>
            <div className={styles.voiceHeader}>
              <h1 className={styles.voiceTitle}>AI Learning Assistant</h1>
              <p className={styles.voiceDescription}>Upload a lesson and chat with your AI tutor</p>
            </div>

            {voiceError && (
              <div className={styles.errorMessage}>
                <AlertCircle className={styles.errorIcon} />
                <span className={styles.errorText}>{voiceError}</span>
              </div>
            )}

            {(conversation.status === 'connected' || isSessionActive) && (
              <div className={styles.successMessage}>
                <CheckCircle2 className={styles.successMessageIcon} />
                <span className={styles.successText}>Connected and ready to help {studentName.trim()}!</span>
              </div>
            )}

            {/* Spectrum Visualizer */}
            <div className={styles.spectrumWrapper}>
              <div className={styles.spectrumContainer}>
                {generateSpectrumBars()}
                <div className={styles.spectrumCenter}>
                  <button
                    onClick={toggleVoiceAgent}
                    disabled={isConnecting || !studentName.trim() || !uploadedFile || !pdfContent}
                    className={`${styles.spectrumButton} ${
                      conversation.status === 'connected' || isSessionActive
                        ? styles.spectrumButtonActive
                        : styles.spectrumButtonInactive
                    }`}
                  >
                    {isConnecting ? (
                      <RefreshCw className={styles.spectrumButtonIconSpin} />
                    ) : (
                      <BookOpen className={styles.spectrumButtonIcon} />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Text Input */}
            <div className={styles.textInputWrapper}>
              <input
                type="text"
                placeholder="You can also type your questions here..."
                className={styles.textInput}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                    conversation.sendUserMessage(e.currentTarget.value);
                    e.currentTarget.value = '';
                  }
                }}
              />
            </div>

            {/* Canvas Toggle */}
            <div className={styles.canvasToggleWrapper}>
              <button
                onClick={() => setShowCanvas(!showCanvas)}
                className={styles.canvasToggleButton}
              >
                <Palette className={styles.canvasToggleIcon} />
                {showCanvas ? 'Hide Canvas' : 'Show Visual Canvas'}
              </button>
            </div>
          </div>

          {/* Canvas Section */}
          {showCanvas && (
            <div className={styles.canvasCard}>
              <div className={styles.canvasHeader}>
                <h3 className={styles.canvasTitle}>Visual Learning Canvas</h3>
                <div className={styles.canvasActions}>
                  <button
                    onClick={undoCanvas}
                    disabled={canvasHistory.length <= 1}
                    className={styles.canvasActionButton}
                    title="Undo"
                  >
                    <Undo className={styles.canvasActionIcon} />
                  </button>
                  <button
                    onClick={clearCanvas}
                    className={styles.canvasActionButton}
                    title="Clear"
                  >
                    <Trash2 className={styles.canvasActionIcon} />
                  </button>
                  <button
                    onClick={downloadCanvas}
                    className={styles.canvasActionButton}
                    title="Download"
                  >
                    <Download className={styles.canvasActionIcon} />
                  </button>
                </div>
              </div>

              {/* Drawing Tools */}
              <div className={styles.drawingTools}>
                <button
                  onClick={() => setCurrentTool('pen')}
                  className={`${styles.toolButton} ${currentTool === 'pen' ? styles.toolButtonActive : styles.toolButtonInactive}`}
                >
                  <Pen className={styles.toolIcon} />
                </button>
                <button
                  onClick={() => setCurrentTool('eraser')}
                  className={`${styles.toolButton} ${currentTool === 'eraser' ? styles.toolButtonActive : styles.toolButtonInactive}`}
                >
                  <Eraser className={styles.toolIcon} />
                </button>
                <div className={styles.toolSeparator}></div>
                <input
                  type="color"
                  value={drawingColor}
                  onChange={(e) => setDrawingColor(e.target.value)}
                  className={styles.colorPicker}
                />
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={brushSize}
                  onChange={(e) => setBrushSize(parseInt(e.target.value))}
                  className={styles.brushSlider}
                />
                <span className={styles.brushSize}>{brushSize}px</span>
              </div>

              {/* Canvas */}
              <div className={styles.canvasWrapper}>
                <canvas
                  ref={canvasRef}
                  className={styles.canvas}
                />
              </div>
            </div>
          )}
        </div>

        {/* Chat History */}
        {agentMessages.length > 0 && (
          <div className={styles.chatCard}>
            <h3 className={styles.chatTitle}>Conversation</h3>
            <div className={styles.chatMessages}>
              {agentMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`${styles.chatMessage} ${
                    msg.type === 'user'
                      ? styles.chatMessageUser
                      : msg.type === 'system'
                      ? styles.chatMessageSystem
                      : msg.type === 'error'
                      ? styles.chatMessageError
                      : styles.chatMessageAgent
                  }`}
                >
                  <div className={styles.chatMessageContent}>{msg.content}</div>
                  <div className={styles.chatMessageTime}>
                    {msg.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bottom Navigation */}
        <div className={styles.bottomNav}>
          <div className={styles.bottomNavContent}>
            <button className={styles.bottomNavButtonActive}>
              <Home className={styles.bottomNavIcon} />
              <span className={styles.bottomNavLabel}>Home</span>
            </button>
            <button className={styles.bottomNavButton}>
              <GraduationCap className={styles.bottomNavIcon} />
              <span className={styles.bottomNavLabel}>Courses</span>
            </button>
            <button className={styles.bottomNavButton}>
              <TrendingUp className={styles.bottomNavIcon} />
              <span className={styles.bottomNavLabel}>Progress</span>
            </button>
            <button className={styles.bottomNavButton}>
              <FileText className={styles.bottomNavIcon} />
              <span className={styles.bottomNavLabel}>Resources</span>
            </button>
            <button className={styles.bottomNavButton}>
              <Settings className={styles.bottomNavIcon} />
              <span className={styles.bottomNavLabel}>Settings</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default StudentLessonView1;