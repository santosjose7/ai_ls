//setup.jsx
import React, { useRef } from 'react';
import { User, Upload, FileText, X, Loader, CheckCircle2, BookOpen, GraduationCap, Sparkles } from 'lucide-react';

const StudentSetup = ({ 
  studentName, 
  setStudentName, 
  uploadedFile, 
  setUploadedFile, 
  pdfContent, 
  setPdfContent, 
  isProcessingPDF, 
  setIsProcessingPDF,
  API_BASE 
}) => {
  const fileInputRef = useRef(null);

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
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const isSetupComplete = studentName.trim() && uploadedFile && pdfContent;

  return (
    <div className="student-setup-container">
      {/* Header with educational elements */}
      <div className="setup-header">
        <div className="setup-header-icon">
          <BookOpen className="primary-icon" />
          <Sparkles className="sparkle-icon" />
        </div>
        <h2>Welcome to Your Learning Journey!</h2>
        <p>Let's set up your personalized AI tutoring session</p>
      </div>

      {/* Progress indicator */}
      <div className="setup-progress">
        <div className="progress-step">
          <div className={`step-indicator ${studentName.trim() ? 'completed' : 'active'}`}>
            <User size={16} />
          </div>
          <span className="step-label">Name</span>
        </div>
        <div className="progress-line">
          <div className={`progress-fill ${studentName.trim() ? 'filled' : ''}`}></div>
        </div>
        <div className="progress-step">
          <div className={`step-indicator ${uploadedFile && pdfContent ? 'completed' : studentName.trim() ? 'active' : 'pending'}`}>
            <FileText size={16} />
          </div>
          <span className="step-label">Document</span>
        </div>
        <div className="progress-line">
          <div className={`progress-fill ${isSetupComplete ? 'filled' : ''}`}></div>
        </div>
        <div className="progress-step">
          <div className={`step-indicator ${isSetupComplete ? 'completed' : 'pending'}`}>
            <GraduationCap size={16} />
          </div>
          <span className="step-label">Ready</span>
        </div>
      </div>

      {/* Student name input */}
      <div className="setup-section">
        <div className="section-header">
          <User className="section-icon" />
          <div>
            <h3>What's your name?</h3>
            <p>Your AI tutor will use this to personalize your learning experience</p>
          </div>
        </div>
        
        <div className="input-container">
          <div className="input-wrapper">
            <User className="input-icon" />
            <input
              type="text"
              placeholder="Enter your name (e.g., Alex)"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              maxLength={50}
              className="student-name-input"
            />
            {studentName.trim() && (
              <CheckCircle2 className="success-icon" />
            )}
          </div>
          {studentName.trim() && (
            <div className="input-feedback success">
              <CheckCircle2 size={16} />
              <span>Great! Hello {studentName}! 👋</span>
            </div>
          )}
        </div>
      </div>

      {/* PDF upload section */}
      <div className="setup-section">
        <div className="section-header">
          <FileText className="section-icon" />
          <div>
            <h3>Upload Your Learning Material</h3>
            <p>Share a PDF document you'd like to study - textbooks, notes, or research papers</p>
          </div>
        </div>

        <div className="upload-container">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={handleFileUpload}
            className="file-input-hidden"
            id="pdf-upload"
          />
          
          {!uploadedFile ? (
            <label htmlFor="pdf-upload" className="upload-area">
              <div className="upload-visual">
                <div className="upload-icon-container">
                  <Upload className="upload-icon" />
                  <div className="upload-animation"></div>
                </div>
                <div className="upload-content">
                  <h4>Drop your PDF here</h4>
                  <p>or <span className="upload-link">click to browse</span></p>
                  <div className="upload-specs">
                    <span className="spec-item">📄 PDF files only</span>
                    <span className="spec-item">📏 Max 10MB</span>
                    <span className="spec-item">🎓 Educational content</span>
                  </div>
                </div>
              </div>
            </label>
          ) : (
            <div className="uploaded-file">
              <div className="file-preview">
                <div className="file-icon-container">
                  <FileText className="file-icon" />
                  <div className="file-status">
                    {isProcessingPDF ? (
                      <Loader className="spinning status-icon processing" />
                    ) : pdfContent ? (
                      <CheckCircle2 className="status-icon success" />
                    ) : (
                      <div className="status-icon pending"></div>
                    )}
                  </div>
                </div>
                
                <div className="file-info">
                  <h4>{uploadedFile.name}</h4>
                  <div className="file-details">
                    <span>{(uploadedFile.size / 1024 / 1024).toFixed(2)} MB</span>
                    <span>•</span>
                    <span>PDF Document</span>
                  </div>
                  
                  {isProcessingPDF && (
                    <div className="processing-status">
                      <div className="processing-bar">
                        <div className="processing-fill"></div>
                      </div>
                      <span>Processing your document...</span>
                    </div>
                  )}
                  
                  {!isProcessingPDF && pdfContent && (
                    <div className="success-status">
                      <CheckCircle2 size={16} />
                      <span>Ready for learning! ✨</span>
                    </div>
                  )}
                </div>
                
                <button onClick={removeFile} className="remove-btn">
                  <X size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Completion message */}
      {isSetupComplete && (
        <div className="setup-complete">
          <div className="complete-icon">
            <GraduationCap size={32} />
            <div className="complete-sparkles">
              <Sparkles size={16} className="sparkle-1" />
              <Sparkles size={12} className="sparkle-2" />
              <Sparkles size={14} className="sparkle-3" />
            </div>
          </div>
          <h3>You're All Set, {studentName}! 🎉</h3>
          <p>Your AI tutor is ready to help you learn from "{uploadedFile.name}"</p>
          <div className="next-steps">
            <span>Click the button below to start your personalized learning session</span>
          </div>
        </div>
      )}

      <style jsx>{`
        .student-setup-container {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 24px;
          padding: 2rem;
          margin-bottom: 2rem;
          position: relative;
          overflow: hidden;
          box-shadow: 0 20px 40px rgba(102, 126, 234, 0.2);
        }

        .student-setup-container::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: 
            radial-gradient(circle at 20% 20%, rgba(255, 255, 255, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 80% 80%, rgba(255, 255, 255, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 40% 60%, rgba(255, 255, 255, 0.05) 0%, transparent 50%);
          pointer-events: none;
        }

        .setup-header {
          text-align: center;
          margin-bottom: 2rem;
          position: relative;
          z-index: 1;
        }

        .setup-header-icon {
          position: relative;
          display: inline-block;
          margin-bottom: 1rem;
        }

        .primary-icon {
          width: 48px;
          height: 48px;
          color: white;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 16px;
          padding: 12px;
          backdrop-filter: blur(10px);
        }

        .sparkle-icon {
          position: absolute;
          top: -8px;
          right: -8px;
          width: 20px;
          height: 20px;
          color: #FFD700;
          animation: sparkle 2s ease-in-out infinite;
        }

        @keyframes sparkle {
          0%, 100% { transform: rotate(0deg) scale(1); opacity: 1; }
          50% { transform: rotate(180deg) scale(1.2); opacity: 0.8; }
        }

        .setup-header h2 {
          color: white;
          font-size: 2rem;
          font-weight: 700;
          margin-bottom: 0.5rem;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .setup-header p {
          color: rgba(255, 255, 255, 0.9);
          font-size: 1.1rem;
          font-weight: 400;
        }

        .setup-progress {
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 2.5rem;
          position: relative;
          z-index: 1;
        }

        .progress-step {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
        }

        .step-indicator {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
          backdrop-filter: blur(10px);
        }

        .step-indicator.pending {
          background: rgba(255, 255, 255, 0.2);
          color: rgba(255, 255, 255, 0.6);
        }

        .step-indicator.active {
          background: rgba(255, 255, 255, 0.3);
          color: white;
          box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.3);
          animation: pulse 2s infinite;
        }

        .step-indicator.completed {
          background: #10B981;
          color: white;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
        }

        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.4); }
          70% { box-shadow: 0 0 0 8px rgba(255, 255, 255, 0); }
          100% { box-shadow: 0 0 0 0 rgba(255, 255, 255, 0); }
        }

        .step-label {
          color: white;
          font-size: 0.875rem;
          font-weight: 500;
        }

        .progress-line {
          width: 60px;
          height: 2px;
          background: rgba(255, 255, 255, 0.2);
          margin: 0 1rem;
          border-radius: 1px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: #10B981;
          width: 0%;
          transition: width 0.5s ease;
          border-radius: 1px;
        }

        .progress-fill.filled {
          width: 100%;
        }

        .setup-section {
          background: rgba(255, 255, 255, 0.95);
          border-radius: 20px;
          padding: 1.5rem;
          margin-bottom: 1.5rem;
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          position: relative;
          z-index: 1;
        }

        .section-header {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .section-icon {
          width: 24px;
          height: 24px;
          color: #667eea;
          margin-top: 0.25rem;
          flex-shrink: 0;
        }

        .section-header h3 {
          color: #1f2937;
          font-size: 1.25rem;
          font-weight: 600;
          margin-bottom: 0.25rem;
        }

        .section-header p {
          color: #6b7280;
          font-size: 0.95rem;
          line-height: 1.5;
        }

        .input-container {
          position: relative;
        }

        .input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .input-icon {
          position: absolute;
          left: 1rem;
          color: #9ca3af;
          z-index: 1;
          width: 20px;
          height: 20px;
        }

        .success-icon {
          position: absolute;
          right: 1rem;
          color: #10b981;
          z-index: 1;
          width: 20px;
          height: 20px;
        }

        .student-name-input {
          width: 100%;
          padding: 1rem 1rem 1rem 3rem;
          border: 2px solid #e5e7eb;
          border-radius: 16px;
          background: white;
          color: #1f2937;
          font-size: 16px;
          outline: none;
          transition: all 0.3s ease;
          font-weight: 500;
        }

        .student-name-input:focus {
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
          transform: translateY(-1px);
        }

        .student-name-input::placeholder {
          color: #9ca3af;
          font-weight: 400;
        }

        .input-feedback {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-top: 0.75rem;
          padding: 0.5rem 0.75rem;
          border-radius: 12px;
          font-size: 0.875rem;
          font-weight: 500;
          animation: slideIn 0.3s ease-out;
        }

        .input-feedback.success {
          background: rgba(16, 185, 129, 0.1);
          color: #065f46;
          border: 1px solid rgba(16, 185, 129, 0.2);
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .upload-container {
          position: relative;
        }

        .file-input-hidden {
          display: none;
        }

        .upload-area {
          display: block;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .upload-visual {
          border: 2px dashed #d1d5db;
          border-radius: 16px;
          padding: 2rem;
          text-align: center;
          background: #fafafa;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }

        .upload-area:hover .upload-visual {
          border-color: #667eea;
          background: #f8f9ff;
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(102, 126, 234, 0.15);
        }

        .upload-icon-container {
          position: relative;
          display: inline-block;
          margin-bottom: 1rem;
        }

        .upload-icon {
          width: 48px;
          height: 48px;
          color: #667eea;
          background: rgba(102, 126, 234, 0.1);
          border-radius: 16px;
          padding: 12px;
        }

        .upload-animation {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 60px;
          height: 60px;
          border: 2px solid rgba(102, 126, 234, 0.2);
          border-radius: 50%;
          animation: uploadPulse 2s infinite;
        }

        @keyframes uploadPulse {
          0% {
            transform: translate(-50%, -50%) scale(0.8);
            opacity: 1;
          }
          100% {
            transform: translate(-50%, -50%) scale(1.4);
            opacity: 0;
          }
        }

        .upload-content h4 {
          color: #1f2937;
          font-size: 1.125rem;
          font-weight: 600;
          margin-bottom: 0.5rem;
        }

        .upload-content p {
          color: #6b7280;
          margin-bottom: 1rem;
        }

        .upload-link {
          color: #667eea;
          font-weight: 600;
          text-decoration: underline;
        }

        .upload-specs {
          display: flex;
          justify-content: center;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .spec-item {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.875rem;
          color: #6b7280;
          background: white;
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          border: 1px solid #e5e7eb;
        }

        .uploaded-file {
          animation: slideIn 0.4s ease-out;
        }

        .file-preview {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
          background: white;
          border: 2px solid #e5e7eb;
          border-radius: 16px;
          padding: 1.5rem;
          transition: all 0.3s ease;
        }

        .file-preview:hover {
          border-color: #667eea;
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.1);
        }

        .file-icon-container {
          position: relative;
          flex-shrink: 0;
        }

        .file-icon {
          width: 48px;
          height: 48px;
          color: #667eea;
          background: rgba(102, 126, 234, 0.1);
          border-radius: 12px;
          padding: 12px;
        }

        .file-status {
          position: absolute;
          bottom: -4px;
          right: -4px;
          background: white;
          border-radius: 50%;
          padding: 2px;
        }

        .status-icon {
          width: 20px;
          height: 20px;
        }

        .status-icon.processing {
          color: #667eea;
        }

        .status-icon.success {
          color: #10b981;
        }

        .status-icon.pending {
          width: 20px;
          height: 20px;
          background: #f3f4f6;
          border: 2px solid #d1d5db;
          border-radius: 50%;
        }

        .file-info {
          flex: 1;
          min-width: 0;
        }

        .file-info h4 {
          color: #1f2937;
          font-size: 1rem;
          font-weight: 600;
          margin-bottom: 0.5rem;
          word-break: break-word;
        }

        .file-details {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #6b7280;
          font-size: 0.875rem;
          margin-bottom: 0.75rem;
        }

        .processing-status,
        .success-status {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
          font-weight: 500;
        }

        .processing-status {
          color: #667eea;
        }

        .success-status {
          color: #065f46;
        }

        .processing-bar {
          width: 100%;
          height: 4px;
          background: rgba(102, 126, 234, 0.2);
          border-radius: 2px;
          overflow: hidden;
          margin-bottom: 0.5rem;
        }

        .processing-fill {
          height: 100%;
          background: #667eea;
          width: 0%;
          animation: processingLoad 2s ease-in-out infinite;
          border-radius: 2px;
        }

        @keyframes processingLoad {
          0% { width: 0%; }
          50% { width: 100%; }
          100% { width: 0%; }
        }

        .remove-btn {
          background: #f3f4f6;
          color: #6b7280;
          border: none;
          padding: 0.5rem;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
          flex-shrink: 0;
          align-self: flex-start;
        }

        .remove-btn:hover {
          background: #ef4444;
          color: white;
        }

        .setup-complete {
          text-align: center;
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid rgba(16, 185, 129, 0.2);
          border-radius: 20px;
          padding: 2rem;
          position: relative;
          z-index: 1;
          animation: celebrateIn 0.6s ease-out;
        }

        @keyframes celebrateIn {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .complete-icon {
          position: relative;
          display: inline-block;
          margin-bottom: 1rem;
        }

        .complete-icon > svg {
          width: 64px;
          height: 64px;
          color: #10b981;
          background: white;
          border-radius: 20px;
          padding: 16px;
          box-shadow: 0 8px 24px rgba(16, 185, 129, 0.2);
        }

        .complete-sparkles {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          pointer-events: none;
        }

        .sparkle-1 {
          position: absolute;
          top: 10%;
          right: 10%;
          color: #FFD700;
          animation: sparkle 2s ease-in-out infinite;
        }

        .sparkle-2 {
          position: absolute;
          bottom: 15%;
          left: 15%;
          color: #FF69B4;
          animation: sparkle 2s ease-in-out infinite 0.5s;
        }

        .sparkle-3 {
          position: absolute;
          top: 20%;
          left: 20%;
          color: #00CED1;
          animation: sparkle 2s ease-in-out infinite 1s;
        }

        .setup-complete h3 {
          color: #065f46;
          font-size: 1.5rem;
          font-weight: 700;
          margin-bottom: 0.5rem;
        }

        .setup-complete p {
          color: #059669;
          font-size: 1rem;
          margin-bottom: 1rem;
          font-weight: 500;
        }

        .next-steps {
          background: white;
          border-radius: 12px;
          padding: 1rem;
          border: 1px solid rgba(16, 185, 129, 0.2);
        }

        .next-steps span {
          color: #374151;
          font-size: 0.95rem;
          font-weight: 500;
        }

        .spinning {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* Mobile responsiveness */
        @media (max-width: 768px) {
          .student-setup-container {
            padding: 1.5rem;
          }

          .setup-header h2 {
            font-size: 1.5rem;
          }

          .setup-progress {
            margin-bottom: 2rem;
          }

          .progress-line {
            width: 40px;
            margin: 0 0.5rem;
          }

          .section-header {
            flex-direction: column;
            gap: 0.5rem;
          }

          .section-icon {
            align-self: flex-start;
          }

          .upload-specs {
            flex-direction: column;
            gap: 0.5rem;
          }

          .file-preview {
            padding: 1rem;
          }

          .file-icon-container .file-icon {
            width: 40px;
            height: 40px;
          }
        }
      `}</style>
    </div>
  );
};

export default StudentSetup;