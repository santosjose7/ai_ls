import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useConversation } from '@elevenlabs/react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import mermaid from 'mermaid';
mermaid.initialize({ startOnLoad: false });

import RenderDiagram   from './RenderDiagram';
import RenderShapes    from './RenderShapes';
import AvatarContainer from './AvatarContainer';
import StudentSetup    from './Setup';

import {
  BookOpen, X, Loader, CheckCircle2, RefreshCw, Home, GraduationCap,
  TrendingUp, FileText, Settings, Eye, EyeOff, Maximize2, Minimize2
} from 'lucide-react';

import '../styles/StudentLessonView.css';

const StudentLessonView = () => {
  const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000';

  /* ------------- SHARED STATE (populated by StudentSetup) ------------- */
  const [studentName,     setStudentName]     = useState('');
  const [uploadedFile,    setUploadedFile]    = useState(null);
  const [pdfContent,      setPdfContent]      = useState('');
  const [isProcessingPDF, setIsProcessingPDF] = useState(false);

  /* ------------- VOICE & VISUAL STATE ------------- */
  const [agentId,           setAgentId]           = useState(null);
  const [agentMessages,     setAgentMessages]     = useState([]);
  const [isConnecting,      setIsConnecting]      = useState(false);
  const [voiceError,        setVoiceError]        = useState(null);
  const [connectionAttempts,setConnectionAttempts]= useState(0);
  const [isSessionActive,   setIsSessionActive]   = useState(false);

  const [visualContent,     setVisualContent]     = useState(null);
  const [visualHistory,     setVisualHistory]     = useState([]);
  const [isVisualPanelVisible,setIsVisualVisible] = useState(true);
  const [visualPanelSize,   setVisualPanelSize]   = useState('normal');

  const isConnectingRef = useRef(false);
  const connectionTimeoutRef = useRef(null);
  const maxConnectionAttempts = 3;

  /* -------------  VISUAL RENDER HELPERS ------------- */
  const renderEquation = ({ title, latex, explanation }) => {
    let rendered = '';
    try {
      rendered = katex.renderToString(latex, { throwOnError: false, displayMode: true });
    } catch {
      rendered = `<span style="color:#e11">Invalid LaTeX</span>`;
    }
    return (
      <div className="visual-equation">
        <h4>{title}</h4>
        <div className="equation-container" dangerouslySetInnerHTML={{ __html: rendered }} />
        {explanation && <p className="equation-explanation">{explanation}</p>}
      </div>
    );
  };

  const renderImage = ({ title, url, caption }) => (
    <div className="visual-image">
      <h4>{title}</h4>
      <div className="image-container">
        <img src={url} alt={title} />
      </div>
      {caption && <p className="image-caption">{caption}</p>}
    </div>
  );

  const renderStepByStep = ({ title, steps, currentStep = 0 }) => (
    <div className="visual-steps">
      <h4>{title}</h4>
      <div className="steps-container">
        {steps.map((step, idx) => (
          <div key={idx} className={`step ${idx === currentStep ? 'current' : ''} ${idx < currentStep ? 'completed' : ''}`}>
            <div className="step-number">{idx + 1}</div>
            <div className="step-content">
              <h5>{step.title}</h5>
              <p>{step.description}</p>
              {step.visual && (
                <div className="step-visual">
                  {step.visual.type === 'equation' && renderEquation(step.visual)}
                  {step.visual.type === 'image'   && renderImage(step.visual)}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderMainPoints = ({ title, points }) => (
    <div className="visual-main-points">
      <h4>{title}</h4>
      <div className="points-container">
        {points.map((p, i) => (
          <div key={i} className="main-point">
            <CheckCircle2 className="point-icon" size={20} />
            <div className="point-content">
              <h5>{p.title}</h5>
              <p>{p.description}</p>
              {p.example && <div className="point-example"><em>Example: {p.example}</em></div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderAnalogy = ({ title, concept, comparison, explanation }) => (
    <div className="visual-analogy">
      <h4>{title}</h4>
      <div className="analogy-container">
        <div className="analogy-comparison">
          <div className="analogy-side"><h5>Concept</h5><p>{concept}</p></div>
          <div className="analogy-connector">↔</div>
          <div className="analogy-side"><h5>Like</h5><p>{comparison}</p></div>
        </div>
        <div className="analogy-explanation"><p>{explanation}</p></div>
      </div>
    </div>
  );

  const renderVisualContent = () => {
    if (!visualContent) {
      return (
        <div className="visual-placeholder">
          <Eye size={48} className="placeholder-icon" />
          <h3>Visual Learning Space</h3>
          <p>Visual aids will appear here when your AI tutor shares them.</p>
        </div>
      );
    }
    switch (visualContent.type) {
      case 'equation':           return renderEquation(visualContent);
      case 'image':              return renderImage(visualContent);
      case 'diagram':            return <RenderDiagram   content={visualContent} />;
      case 'shape-diagram':      return <RenderShapes    content={visualContent} />;
      case 'steps':              return renderStepByStep(visualContent);
      case 'main-points':        return renderMainPoints(visualContent);
      case 'analogy':            return renderAnalogy(visualContent);
      default:                   return null;
    }
  };

  /* ------------- CLIENT TOOLS (unchanged signatures) ------------- */
  const clientTools = useMemo(() => ({
    getStudentName:       async () => ({ student_name: studentName || 'Student' }),
    setStudentName:       async ({ newName }) => {
      if (newName?.trim()) { setStudentName(newName.trim()); return { success:true }; }
      return { success:false, message:'Invalid name' };
    },
    getSessionContext:    async () => ({
      student_name: studentName, has_pdf:!!uploadedFile, pdf_name:uploadedFile?.name,
      pdf_processed:!!pdfContent, session_active:isSessionActive
    }),
    getPdfContent:        async () => pdfContent ? { has_content:true, content:pdfContent } : { has_content:false },
    getPdfSummary:        async ({ max_length=500 }) => {
      if (!pdfContent) return { has_content:false };
      const s = pdfContent.length>max_length ? pdfContent.slice(0,max_length)+'…' : pdfContent;
      return { has_content:true, summary:s };
    },

    /* Visual tools */
    displayEquation:            async ({ title, latex }) => { setVisualContent({ type:'equation', title, latex }); return { success:true }; },
    displayImage:               async ({ url })         => { setVisualContent({ type:'image',    title:'', url }); return { success:true }; },
    displaySteps:               async ({ title, steps })=> { setVisualContent({ type:'steps',    title, steps }); return { success:true }; },
    displayKeyPoints:           async ({ title, points })=>{ setVisualContent({ type:'main-points',title,points});return{success:true};},
    displayAnalogy:             async ({ title, concept, comparison, explanation }) => {
      setVisualContent({ type:'analogy', title, concept, comparison, explanation }); return { success:true };
    },
    clearVisuals:               async () => { setVisualContent(null); return { success:true }; },
    showVisualPanel:            async () => { setIsVisualVisible(true);  return { success:true }; },
    hideVisualPanel:            async () => { setIsVisualVisible(false); return { success:true }; },
  }), [studentName, uploadedFile, pdfContent, isSessionActive, visualContent, visualHistory]);

  /* ------------- VOICE CONVERSATION HOOK ------------- */
  const conversation = useConversation({
    clientTools,
    onConnect: () => {
      isConnectingRef.current = false;
      setIsConnecting(false);
      setIsSessionActive(true);
      setVoiceError(null);
      setConnectionAttempts(0);
      setAgentMessages(prev => [...prev, { id:Date.now(), type:'system', content:`Hello ${studentName || 'there'}, I'm ready to help!`, timestamp:new Date() }]);
      if (connectionTimeoutRef.current) clearTimeout(connectionTimeoutRef.current);
    },
    onDisconnect: () => {
      isConnectingRef.current = false;
      setIsConnecting(false);
      setIsSessionActive(false);
      setAgentMessages(prev => [...prev, { id:Date.now(), type:'system', content:'Voice agent disconnected.', timestamp:new Date() }]);
      if (connectionTimeoutRef.current) clearTimeout(connectionTimeoutRef.current);
    },
    onMessage: (msg) => {
      const content = typeof msg === 'string' ? msg : msg.message ?? msg.text ?? msg.content ?? JSON.stringify(msg);
      const type    = typeof msg === 'string' ? 'agent' : msg.type ?? msg.source ?? 'agent';
      setAgentMessages(prev => [...prev, { id:Date.now()+Math.random(), type, content, timestamp:new Date(), isFinal:msg?.isFinal??true }]);
    },
    onError: (err) => {
      const errorMessage = err?.message ?? err?.toString() ?? 'Unknown error';
      isConnectingRef.current = false;
      setIsConnecting(false);
      setIsSessionActive(false);
      setVoiceError(errorMessage);
      setAgentMessages(prev => [...prev, { id:Date.now(), type:'error', content:`Error: ${errorMessage}`, timestamp:new Date() }]);
      if (connectionTimeoutRef.current) clearTimeout(connectionTimeoutRef.current);
    },
  });

  /* ------------- BOOT & CLEAN-UP ------------- */
  useEffect(() => {
    const defaultAgent = import.meta.env.VITE_ELEVENLABS_AGENT_ID;
    if (defaultAgent && /^[a-zA-Z0-9_-]{8,}$/.test(defaultAgent)) setAgentId(defaultAgent);
    else setVoiceError('Voice agent not configured');
    return () => {
      if (connectionTimeoutRef.current) clearTimeout(connectionTimeoutRef.current);
      if (conversation.status === 'connected' && !isConnectingRef.current) conversation.endSession().catch(console.error);
    };
  }, []);

  /* ------------- VOICE TOGGLE ------------- */
  const toggleVoiceAgent = async () => {
    if (conversation.status === 'connected') { await conversation.endSession(); return; }
    if (isConnecting || isConnectingRef.current) return;
    if (!studentName.trim()) return;
    if (!uploadedFile || !pdfContent) return;
    if (!agentId) return;
    if (connectionAttempts >= maxConnectionAttempts) { setVoiceError('Max attempts reached'); return; }

    isConnectingRef.current = true;
    setIsConnecting(true);
    setVoiceError(null);
    setConnectionAttempts(c => c + 1);

    connectionTimeoutRef.current = setTimeout(() => {
      if (isConnectingRef.current) {
        isConnectingRef.current = false;
        setIsConnecting(false);
        setVoiceError('Connection timeout');
      }
    }, 30000);

    try {
      const resp = await fetch(`${API_BASE}/api/voice/get-signed-url`, {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body:JSON.stringify({ agentId, studentName:studentName.trim(), pdfContent, fileName:uploadedFile.name })
      });
      if (!resp.ok) throw new Error(`Server ${resp.status}`);
      const { signedUrl } = await resp.json();
      if (!signedUrl) throw new Error('No signedUrl');
      await conversation.startSession({ signedUrl });
      if (connectionTimeoutRef.current) clearTimeout(connectionTimeoutRef.current);
    } catch (e) {
      console.error(e);
      isConnectingRef.current = false;
      setIsConnecting(false);
      setVoiceError(e.message || 'Failed to connect');
      setConnectionAttempts(c => Math.max(0, c - 1));
      if (connectionTimeoutRef.current) clearTimeout(connectionTimeoutRef.current);
    }
  };

  /* ------------- RENDER ------------- */
  return (
    <>
      <header className="dashboard-header">
        <div className="header-content">
          <div className="header-left">
            <BookOpen size={24} className="header-icon" />
            <h1>AI Learning Assistant</h1>
          </div>
        </div>
      </header>

      <main className="container-lessons-page">
        <div className={`main-content ${isVisualPanelVisible ? 'visual-visible' : 'visual-hidden'} ${visualPanelSize}`}>
          {/* LEFT ------------------------------------------------*/}
          <div className="control-panel">
            <StudentSetup
              studentName={studentName}
              setStudentName={setStudentName}
              uploadedFile={uploadedFile}
              setUploadedFile={setUploadedFile}
              pdfContent={pdfContent}
              setPdfContent={setPdfContent}
              isProcessingPDF={isProcessingPDF}
              setIsProcessingPDF={setIsProcessingPDF}
              API_BASE={API_BASE}
            />

            {studentName.trim() && uploadedFile && pdfContent && (
              <section className="voice-section">
                <div className="spectrum-wrapper">
                  <div className="spectrum-circle">
                    {Array.from({ length: 60 }).map((_, i) => {
                      const hue = (i / 60) * 360;
                      return (
                        <div
                          key={i}
                          className={`spectrum-bar ${isConnecting
                            ? 'connecting'
                            : conversation.status === 'connected'
                            ? conversation.isSpeaking
                              ? 'speaking'
                              : 'listening'
                            : ''}`}
                          style={{
                            transform: `rotate(${i * 6}deg) translateY(-110px)`,
                            background: `hsl(${hue}, 70%, 60%)`,
                          }}
                        />
                      );
                    })}
                    <button
                      onClick={toggleVoiceAgent}
                      disabled={isConnecting}
                      className="voice-btn"
                      title={
                        conversation.status === 'connected'
                          ? 'End session'
                          : voiceError
                          ? 'Retry'
                          : 'Start voice assistant'
                      }
                    >
                      {isConnecting ? (
                        <Loader className="spinning" size={32} />
                      ) : conversation.status === 'connected' ? (
                        <CheckCircle2 size={48} style={{ color: '#10b981' }} />
                      ) : voiceError ? (
                        <RefreshCw size={32} />
                      ) : (
                        <BookOpen size={48} style={{ color: '#3b82f6' }} />
                      )}
                    </button>
                  </div>
                  <input
                    type="text"
                    className="query-input"
                    placeholder="Type a question and press Enter…"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                        conversation.sendUserMessage(e.currentTarget.value.trim());
                        e.currentTarget.value = '';
                      }
                    }}
                  />
                </div>

                {agentMessages.length > 0 && (
                  <div className="chat-box">
                    <h3>Conversation with {studentName}</h3>
                    <div className="chat-messages">
                      {agentMessages.map((m) => (
                        <div key={m.id} className={`message ${m.type}`}>
                          <div className="message-content">{m.content}</div>
                          <span className="message-time">{m.timestamp.toLocaleTimeString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            )}
          </div>

          {/* RIGHT – Visual Panel --------------------------------*/}
          {isVisualPanelVisible && (
            <aside className="visual-panel">
              <header className="visual-panel-header">
                <h3>Visual Learning</h3>
                <div className="panel-controls">
                  <button
                    onClick={() => setVisualPanelSize((s) => (s === 'normal' ? 'maximized' : 'normal'))}
                    className="icon-btn"
                    title={visualPanelSize === 'normal' ? 'Expand' : 'Collapse'}
                  >
                    {visualPanelSize === 'normal' ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
                  </button>
                  <button onClick={() => setIsVisualVisible(false)} className="icon-btn" title="Hide">
                    <EyeOff size={16} />
                  </button>
                </div>
              </header>
              <div className="visual-content">{renderVisualContent()}</div>
              {visualHistory.length > 0 && (
                <footer className="visual-history">
                  <h4>Recent</h4>
                  <div className="history-list">
                    {visualHistory.slice(-3).map((v) => (
                      <button key={v.id} className="history-item" onClick={() => setVisualContent(v)}>
                        <span className="history-type">{v.type}</span>
                        <span className="history-title">{v.title}</span>
                      </button>
                    ))}
                  </div>
                </footer>
              )}
            </aside>
          )}
        </div>

        {/* Bottom navigation */}
        <nav className="bottom-nav">
          {[
            { icon: Home, label: 'Home' },
            { icon: GraduationCap, label: 'Courses' },
            { icon: TrendingUp, label: 'Progress' },
            { icon: FileText, label: 'Resources' },
            { icon: Settings, label: 'Settings' },
          ].map(({ icon: Icon, label }) => (
            <button key={label} className={`nav-item ${label === 'Home' ? 'active' : ''}`}>
              <Icon size={20} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </main>
    </>
  );
};

export default StudentLessonView;