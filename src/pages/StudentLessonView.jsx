import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useConversation } from '@elevenlabs/react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import mermaid from 'mermaid';
mermaid.initialize({ startOnLoad: false });

import RenderDiagram   from './RenderDiagram';
import RenderShapes    from './RenderShapes';
import AvatarContainer from './AvatarContainer';

import {
  BookOpen, Loader, CheckCircle2, RefreshCw, Eye, EyeOff, Maximize2, Minimize2
} from 'lucide-react';
import '../styles/StudentLessonView.css';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000';

export default function StudentLessonView() {
  /* ---------- data injected from StudentSetup ---------- */
  const { state } = useLocation();
  const studentName   = state?.studentName || 'Student';
  const uploadedFile  = state?.uploadedFile;
  const pdfContent    = state?.pdfContent  || '';

  /* ---------- voice / visual state ---------- */
  const [agentId,   setAgentId]   = useState(null);
  const [isConnecting,setIsConnecting] = useState(false);
  const [voiceError,setVoiceError]     = useState(null);
  const [connAtt,setConnAtt]           = useState(0);
  const isConnectingRef = useRef(false);
  const timeoutRef      = useRef(null);
  const maxConn = 3;

  const [agentMessages,setAgentMessages] = useState([]);
  const [visualContent,setVisualContent] = useState(null);
  const [visualHistory,setVisualHistory] = useState([]);
  const [panelVisible,setPanelVisible]   = useState(true);
  const [panelSize,setPanelSize]         = useState('normal');

  /* ---------- rendering helpers (unchanged) ---------- */
  const renderEquation = ({ title, latex, explanation }) => {
    let html = '';
    try { html = katex.renderToString(latex,{throwOnError:false,displayMode:true}); }
    catch { html = '<span style="color:#e11">Invalid LaTeX</span>'; }
    return (
      <div className="visual-equation">
        <h4>{title}</h4>
        <div dangerouslySetInnerHTML={{ __html: html }} />
        {explanation && <p className="equation-explanation">{explanation}</p>}
      </div>
    );
  };

  const renderImage = ({ title, url, caption }) => (
    <div className="visual-image">
      <h4>{title}</h4>
      <div className="image-container"><img src={url} alt={title} /></div>
      {caption && <p className="image-caption">{caption}</p>}
    </div>
  );

  const renderStepByStep = ({ title, steps, currentStep = 0 }) => (
    <div className="visual-steps">
      <h4>{title}</h4>
      <div className="steps-container">
        {steps.map((s, i) => (
          <div key={i} className={`step ${i === currentStep ? 'current' : ''} ${i < currentStep ? 'completed' : ''}`}>
            <div className="step-number">{i + 1}</div>
            <div className="step-content">
              <h5>{s.title}</h5>
              <p>{s.description}</p>
              {s.visual && (
                <div className="step-visual">
                  {s.visual.type === 'equation' && renderEquation(s.visual)}
                  {s.visual.type === 'image'   && renderImage(s.visual)}
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
        <p className="analogy-explanation">{explanation}</p>
      </div>
    </div>
  );

  const renderVisualContent = () => {
    if (!visualContent) {
      return (
        <div className="visual-placeholder">
          <Eye size={48} />
          <h3>Visual Learning Space</h3>
          <p>Waiting for your AI tutor…</p>
        </div>
      );
    }
    switch (visualContent.type) {
      case 'equation':      return renderEquation(visualContent);
      case 'image':         return renderImage(visualContent);
      case 'diagram':       return <RenderDiagram content={visualContent} />;
      case 'shape-diagram': return <RenderShapes  content={visualContent} />;
      case 'steps':         return renderStepByStep(visualContent);
      case 'main-points':   return renderMainPoints(visualContent);
      case 'analogy':       return renderAnalogy(visualContent);
      default:              return null;
    }
  };

  /* ---------- client tools (100 % same as before) ---------- */
  const clientTools = useMemo(() => ({
    getStudentName: async () => ({ student_name: studentName || 'Student' }),
    setStudentName: async ({ newName }) => {
      if (newName?.trim()) { setStudentName(newName.trim()); return { success:true }; }
      return { success:false, message:'Invalid name' };
    },
    getSessionContext: async () => ({
      student_name: studentName,
      has_pdf: !!uploadedFile,
      pdf_name: uploadedFile?.name || null,
      pdf_processed: !!pdfContent,
      session_active: conversation.status === 'connected',
      visual_panel_visible: panelVisible,
      current_visual: visualContent?.type || null,
    }),
    getPdfContent: async () => (pdfContent ? { has_content:true, content:pdfContent } : { has_content:false }),

    getPdfSummary: async ({ max_length = 500 }) => {
      if (!pdfContent) return { has_content:false, summary:null };
      const summary = pdfContent.length > max_length ? pdfContent.slice(0, max_length) + '…' : pdfContent;
      return { has_content:true, summary };
    },

    displayEquation: async ({ title, latex, explanation }) => {
      const v = { type:'equation', title, latex, explanation, id:Date.now() };
      setVisualContent(v);
      setVisualHistory(h => [...h.slice(-9), v]);
      return { success:true, message:`Equation displayed: ${latex}` };
    },

    generateEquationWithSteps: async ({ equation, steps, explanation, template }) => {
      const res = await fetch(`${API_BASE}/api/voice/generate/equation-steps`, {
        method:'POST', headers:{ 'Content-Type':'application/json' },
        body:JSON.stringify({ equation, steps, explanation, template })
      });
      if (!res.ok) throw new Error('Generation failed');
      const data = await res.json();
      const v = { type:'generated-equation', title:'Equation with Steps', ...data.visual, steps };
      setVisualContent(v);
      setVisualHistory(h => [...h.slice(-9), v]);
      return { success:true };
    },

    generateMathGraph: async ({ expression, domain, range, title }) => {
      const res = await fetch(`${API_BASE}/api/voice/generate/math-graph`, {
        method:'POST', headers:{ 'Content-Type':'application/json' },
        body:JSON.stringify({ expression, domain, range, title })
      });
      if (!res.ok) throw new Error('Graph failed');
      const data = await res.json();
      const v = { type:'generated-math-graph', title, ...data.visual };
      setVisualContent(v);
      setVisualHistory(h => [...h.slice(-9), v]);
      return { success:true };
    },

    displayImage: async ({ url }) => {
      const v = { type:'image', title:'', url, id:Date.now() };
      setVisualContent(v);
      setVisualHistory(h => [...h.slice(-9), v]);
      return { success:true };
    },

    displayDiagram: async ({ title, description, mermaidCode }) => {
      const v = { type:'diagram', title, description, mermaidCode, id:Date.now() };
      setVisualContent(v);
      setVisualHistory(h => [...h.slice(-9), v]);
      return { success:true };
    },

    displayShapes: async ({ title, width, height, shapes }) => {
      const v = { type:'shapes', title, width, height, shapes, id:Date.now() };
      setVisualContent(v);
      setVisualHistory(h => [...h.slice(-9), v]);
      return { success:true };
    },

    displayKeyPoints: async ({ title, points }) => {
      const pts = Array.isArray(points) ? points : points.split(',').map(p => ({ title:p.trim() }));
      const v = { type:'main-points', title, points: pts };
      setVisualContent(v);
      setVisualHistory(h => [...h.slice(-9), v]);
      return { success:true };
    },

    displayAnalogy: async ({ title, concept, comparison, explanation }) => {
      const v = { type:'analogy', title, concept, comparison, explanation };
      setVisualContent(v);
      setVisualHistory(h => [...h.slice(-9), v]);
      return { success:true };
    },

    displaySteps: async ({ title, steps }) => {
      const stps = Array.isArray(steps) ? steps : steps.split(',').map(d => ({ title:d.trim() }));
      const v = { type:'steps', title, steps: stps };
      setVisualContent(v);
      setVisualHistory(h => [...h.slice(-9), v]);
      return { success:true };
    },

    nextStep: async () => {
      if (!visualContent || visualContent.type !== 'steps') return { success:false, message:'No steps' };
      const newStep = Math.min(visualContent.currentStep + 1, visualContent.steps.length - 1);
      setVisualContent({ ...visualContent, currentStep:newStep });
      return { success:true, current_step:newStep + 1 };
    },

    previousStep: async () => {
      if (!visualContent || visualContent.type !== 'steps') return { success:false, message:'No steps' };
      const newStep = Math.max(visualContent.currentStep - 1, 0);
      setVisualContent({ ...visualContent, currentStep:newStep });
      return { success:true, current_step:newStep + 1 };
    },

    clearVisuals: () => { setVisualContent(null); return { success:true }; },
    showVisualPanel: () => { setPanelVisible(true);  return { success:true }; },
    hideVisualPanel: () => { setPanelVisible(false); return { success:true }; },

    logMessage: async ({ message, level='info' }) => (console[level](`[Agent] ${message}`), { logged:true }),
    showNotification: async ({ message }) => {
      setAgentMessages(m => [...m, { type:'system', content:`📢 ${message}`, ts:Date.now() }]);
      return { success:true };
    },
  }), [studentName, uploadedFile, pdfContent, visualContent, panelVisible, conversation.status]);

  /* ---------- voice conversation ---------- */
  const conversation = useConversation({
    clientTools,
    onConnect: () => {
      isConnectingRef.current = false;
      setIsConnecting(false);
      setAgentMessages(m => [...m, { type:'system', content:`Hello ${studentName}, I’m ready to help!`, ts:Date.now() }]);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    },
    onDisconnect: () => {
      isConnectingRef.current = false;
      setIsConnecting(false);
      setAgentMessages(m => [...m, { type:'system', content:'Voice agent disconnected', ts:Date.now() }]);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    },
    onMessage: (msg) => {
      const content = typeof msg === 'string' ? msg : msg.message ?? msg.text ?? '';
      const type    = typeof msg === 'string' ? 'agent' : msg.type ?? msg.source ?? 'agent';
      setAgentMessages(m => [...m, { type, content, ts:Date.now() }]);
    },
    onError: (err) => {
      isConnectingRef.current = false;
      setIsConnecting(false);
      setVoiceError(err.message ?? 'Unknown error');
    },
  });

  /* ---------- boot ---------- */
  useEffect(() => {
    const id = import.meta.env.VITE_ELEVENLABS_AGENT_ID;
    if (id && /^[a-zA-Z0-9_-]{8,}$/.test(id)) setAgentId(id);
    else setVoiceError('Voice agent not configured');
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (conversation.status === 'connected' && !isConnectingRef.current) conversation.endSession().catch(console.error);
    };
  }, []);

  /* ---------- voice toggle ---------- */
  const toggleVoiceAgent = async () => {
    if (conversation.status === 'connected') { await conversation.endSession(); return; }
    if (isConnecting || isConnectingRef.current) return;
    if (!studentName.trim() || !uploadedFile || !pdfContent || !agentId) return;
    if (connAtt >= maxConn) { setVoiceError('Max attempts reached'); return; }

    isConnectingRef.current = true;
    setIsConnecting(true);
    setVoiceError(null);
    setConnAtt(c => c + 1);

    timeoutRef.current = setTimeout(() => {
      if (isConnectingRef.current) {
        isConnectingRef.current = false;
        setIsConnecting(false);
        setVoiceError('Connection timeout');
      }
    }, 30_000);

    try {
      const res = await fetch(`${API_BASE}/api/voice/get-signed-url`, {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body:JSON.stringify({ agentId, studentName:studentName.trim(), pdfContent, fileName:uploadedFile.name })
      });
      if (!res.ok) throw new Error(`Server ${res.status}`);
      const { signedUrl } = await res.json();
      if (!signedUrl) throw new Error('No signedUrl');
      await conversation.startSession({ signedUrl });
    } catch (e) {
      setVoiceError(e.message || 'Failed');
    } finally {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      isConnectingRef.current = false;
      setIsConnecting(false);
    }
  };

  /* ---------- render ---------- */
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
        <div className={`main-content ${panelVisible ? 'visual-visible' : 'visual-hidden'} ${panelSize}`}>
          {/* Left panel: voice + chat */}
          <div className="control-panel">
            <div className="spectrum-wrapper">
              <div className="spectrum-circle">
                {[...Array(60)].map((_, i) => (
                  <div
                    key={i}
                    className={`spectrum-bar ${isConnecting
                      ? 'connecting'
                      : conversation.status === 'connected'
                      ? conversation.isSpeaking
                        ? 'speaking'
                        : 'listening'
                      : ''}`}
                    style={{ transform:`rotate(${i*6}deg) translateY(-110px)`, background:`hsl(${i*6},70%,60%)` }}
                  />
                ))}
                <button
                  onClick={toggleVoiceAgent}
                  disabled={isConnecting}
                  className="voice-btn"
                  title={conversation.status==='connected' ? 'End' : 'Start'}
                >
                  {isConnecting ? <Loader className="spinning" size={32} /> :
                   conversation.status==='connected' ? <CheckCircle2 size={48} style={{color:'#10b981'}}/> :
                   voiceError ? <RefreshCw size={32}/> : <BookOpen size={48}/>}
                </button>
              </div>
            </div>

            <input
              className="query-input"
              placeholder="Type a question and press Enter…"
              onKeyDown={(e)=>{
                if (e.key==='Enter' && e.target.value.trim()) {
                  conversation.sendUserMessage(e.target.value.trim());
                  e.target.value='';
                }
              }}
            />

            {agentMessages.length > 0 && (
              <div className="chat-box">
                <h3>Conversation with {studentName}</h3>
                <div className="chat-messages">
                  {agentMessages.map(m => (
                    <div key={m.ts} className={`msg ${m.type}`}><span>{m.content}</span></div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right panel: visuals */}
          {panelVisible && (
            <aside className="visual-panel">
              <header className="visual-panel-header">
                <h3>Visual Learning</h3>
                <div className="panel-controls">
                  <button onClick={()=>setPanelSize(s=>s==='normal'?'maximized':'normal')} className="icon-btn">
                    {panelSize==='normal'?<Maximize2 size={16}/>:<Minimize2 size={16}/>}
                  </button>
                  <button onClick={()=>setPanelVisible(false)} className="icon-btn">
                    <EyeOff size={16}/>
                  </button>
                </div>
              </header>
              <div className="visual-content">{renderVisualContent()}</div>
            </aside>
          )}
        </div>
      </main>
    </>
  );
}

