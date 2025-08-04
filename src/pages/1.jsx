import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useConversation } from '@elevenlabs/react';
import { 
  BookOpen, Upload, FileText, X, Loader, CheckCircle2, AlertCircle, RefreshCw, 
  Home, GraduationCap, TrendingUp, Settings, User, Palette, Download, Trash2,
  Square, Circle, Triangle, Pen, Type, Eraser, Undo, Redo
} from 'lucide-react';

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

  const toggleVoiceAgent = async () => {
    if (conversation.status === 'connected') {
      await conversation.endSession();
      return;
    }

    if (isConnecting) return;
    if (!studentName.trim()) return alert('Please enter your name.');
    if (!uploadedFile || !pdfContent) return alert('Please upload a PDF first.');

    setIsConnecting(true);
    setVoiceError(null);

    try {
      await conversation.startSession({ signedUrl: 'demo-url' });
    } catch (e) {
      console.error(e);
      setIsConnecting(false);
      setVoiceError(e.message ?? 'Failed to connect');
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: rotate(var(--angle)) translateY(-130px) scaleY(0.5); }
          50% { opacity: 1; transform: rotate(var(--angle)) translateY(-130px) scaleY(1.5); }
        }
      `}</style>
      
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-indigo-600" />
            <h2 className="text-2xl font-bold text-gray-800">AI Learning Assistant</h2>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Student Input */}
        <div className="mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-3 max-w-md">
              <User className="w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Enter your name"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                maxLength={50}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* PDF Upload */}
        <div className="mb-8">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={handleFileUpload}
            className="hidden"
            id="pdf-upload"
          />
          {!uploadedFile ? (
            <label htmlFor="pdf-upload" className="block bg-white rounded-lg shadow-sm border-2 border-dashed border-gray-300 hover:border-indigo-400 transition-colors cursor-pointer">
              <div className="p-8 text-center">
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-700 mb-2">Upload PDF Document</h3>
                <p className="text-gray-500 mb-2">Drop your PDF here or click to browse</p>
                <span className="text-sm text-gray-400">Max file size: 10MB</span>
              </div>
            </label>
          ) : (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center gap-4">
                <FileText className="w-8 h-8 text-indigo-600" />
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-800">{uploadedFile.name}</h4>
                  <p className="text-gray-500">{(uploadedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                <button onClick={removeFile} className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                  <X className="w-5 h-5" />
                </button>
                {isProcessingPDF ? (
                  <div className="flex items-center gap-2 text-blue-600">
                    <Loader className="w-5 h-5 animate-spin" />
                    <span>Processing PDF...</span>
                  </div>
                ) : pdfContent && (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle2 className="w-5 h-5" />
                    <span>PDF processed successfully!</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Voice Interface */}
          <div className="bg-white rounded-lg shadow-sm p-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-800 mb-2">AI Learning Assistant</h1>
              <p className="text-gray-600">Upload a lesson and chat with your AI tutor</p>
            </div>

            {voiceError && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <span className="text-red-700">{voiceError}</span>
              </div>
            )}

            {(conversation.status === 'connected' || isSessionActive) && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <span className="text-green-700">Connected and ready to help {studentName.trim()}!</span>
              </div>
            )}

            {/* Spectrum Visualizer */}
            <div className="relative flex justify-center mb-8">
              <div className="relative w-80 h-80">
                {generateSpectrumBars()}
                <div className="absolute inset-0 flex items-center justify-center">
                  <button
                    onClick={toggleVoiceAgent}
                    disabled={isConnecting || !studentName.trim() || !uploadedFile || !pdfContent}
                    className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 ${
                      conversation.status === 'connected' || isSessionActive
                        ? 'bg-red-500 hover:bg-red-600 text-white'
                        : 'bg-green-500 hover:bg-green-600 text-white'
                    } disabled:bg-gray-300 disabled:cursor-not-allowed`}
                  >
                    {isConnecting ? (
                      <RefreshCw className="w-8 h-8 animate-spin" />
                    ) : conversation.status === 'connected' || isSessionActive ? (
                      <BookOpen className="w-8 h-8" />
                    ) : (
                      <BookOpen className="w-8 h-8" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Text Input */}
            <div className="mb-6">
              <input
                type="text"
                placeholder="You can also type your questions here..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                    conversation.sendUserMessage(e.currentTarget.value);
                    e.currentTarget.value = '';
                  }
                }}
              />
            </div>

            {/* Canvas Toggle */}
            <div className="text-center">
              <button
                onClick={() => setShowCanvas(!showCanvas)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <Palette className="w-5 h-5" />
                {showCanvas ? 'Hide Canvas' : 'Show Visual Canvas'}
              </button>
            </div>
          </div>

          {/* Canvas Section */}
          {showCanvas && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Visual Learning Canvas</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={undoCanvas}
                    disabled={canvasHistory.length <= 1}
                    className="p-2 text-gray-500 hover:text-gray-700 disabled:opacity-50"
                    title="Undo"
                  >
                    <Undo className="w-4 h-4" />
                  </button>
                  <button
                    onClick={clearCanvas}
                    className="p-2 text-gray-500 hover:text-gray-700"
                    title="Clear"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={downloadCanvas}
                    className="p-2 text-gray-500 hover:text-gray-700"
                    title="Download"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Drawing Tools */}
              <div className="flex items-center gap-2 mb-4 p-3 bg-gray-50 rounded-lg">
                <button
                  onClick={() => setCurrentTool('pen')}
                  className={`p-2 rounded ${currentTool === 'pen' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-200'}`}
                >
                  <Pen className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentTool('eraser')}
                  className={`p-2 rounded ${currentTool === 'eraser' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-200'}`}
                >
                  <Eraser className="w-4 h-4" />
                </button>
                <div className="w-px h-6 bg-gray-300 mx-2"></div>
                <input
                  type="color"
                  value={drawingColor}
                  onChange={(e) => setDrawingColor(e.target.value)}
                  className="w-8 h-8 rounded border"
                />
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={brushSize}
                  onChange={(e) => setBrushSize(parseInt(e.target.value))}
                  className="w-20"
                />
                <span className="text-sm text-gray-600">{brushSize}px</span>
              </div>

              {/* Canvas */}
              <div className="border border-gray-300 rounded-lg overflow-hidden">
                <canvas
                  ref={canvasRef}
                  className="block max-w-full h-auto cursor-crosshair"
                  style={{ width: '100%', height: '400px' }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Chat History */}
        {agentMessages.length > 0 && (
          <div className="mt-8 bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Conversation</h3>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {agentMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`p-4 rounded-lg ${
                    msg.type === 'user'
                      ? 'bg-indigo-600 text-white ml-12'
                      : msg.type === 'system'
                      ? 'bg-blue-50 text-blue-800'
                      : msg.type === 'error'
                      ? 'bg-red-50 text-red-800'
                      : 'bg-gray-50 text-gray-800 mr-12'
                  }`}
                >
                  <div className="font-medium">{msg.content}</div>
                  <div className="text-xs opacity-70 mt-1">
                    {msg.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bottom Navigation */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg">
          <div className="flex justify-around py-2">
            <button className="flex flex-col items-center gap-1 px-4 py-2 text-indigo-600">
              <Home className="w-5 h-5" />
              <span className="text-xs">Home</span>
            </button>
            <button className="flex flex-col items-center gap-1 px-4 py-2 text-gray-500">
              <GraduationCap className="w-5 h-5" />
              <span className="text-xs">Courses</span>
            </button>
            <button className="flex flex-col items-center gap-1 px-4 py-2 text-gray-500">
              <TrendingUp className="w-5 h-5" />
              <span className="text-xs">Progress</span>
            </button>
            <button className="flex flex-col items-center gap-1 px-4 py-2 text-gray-500">
              <FileText className="w-5 h-5" />
              <span className="text-xs">Resources</span>
            </button>
            <button className="flex flex-col items-center gap-1 px-4 py-2 text-gray-500">
              <Settings className="w-5 h-5" />
              <span className="text-xs">Settings</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default StudentLessonView1;