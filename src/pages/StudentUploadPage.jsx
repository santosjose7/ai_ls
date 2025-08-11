import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FileText, X, Loader, CheckCircle2, User, Eye, EyeOff } from 'lucide-react';
import '../styles/StudentLessonView.css';

const StudentUploadPage = () => {
  const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000';
  const navigate = useNavigate();
  
  const [studentName, setStudentName] = useState('');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [pdfContent, setPdfContent] = useState('');
  const [isProcessingPDF, setIsProcessingPDF] = useState(false);
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
    fileInputRef.current && (fileInputRef.current.value = '');
  };

  const handleContinue = () => {
    if (!studentName.trim()) {
      alert('Please enter your name.');
      return;
    }
    if (!uploadedFile || !pdfContent) {
      alert('Please upload and process a PDF first.');
      return;
    }
    
    // Pass data to StudentLessonView
    navigate('/student-lesson-view', { 
      state: { 
        studentName: studentName.trim(),
        uploadedFile,
        pdfContent
      } 
    });
  };

  return (
    <>
      <header className="dashboard-header">
        <div className="header-content">
          <div className="header-left-inner">
            <div className="header-icon">
              <Eye size={32} className="icon-medium" />
            </div>
            <h2>AI Learning Setup</h2>
          </div>
        </div>
      </header>

      <main className="container-lessons-page">
        <div className="upload-page-container">
          <div className="upload-form">
            <h1>Welcome to AI Learning Assistant</h1>
            <p>Let's get started by setting up your learning session</p>

            {/* Student Name Input */}
            <div className="form-section">
              <label className="form-label">Your Name</label>
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

            {/* PDF Upload */}
            <div className="form-section">
              <label className="form-label">Upload Lesson PDF</label>
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
            </div>

            {/* Continue Button */}
            <button 
              onClick={handleContinue}
              disabled={!studentName.trim() || !uploadedFile || !pdfContent || isProcessingPDF}
              className="continue-button"
            >
              Start Learning Session →
            </button>
          </div>
        </div>
      </main>

      <style jsx>{`
        .upload-page-container {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 70vh;
          padding: 40px 20px;
        }

        .upload-form {
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
          padding: 40px;
          max-width: 500px;
          width: 100%;
          text-align: center;
        }

        .upload-form h1 {
          color: #333;
          margin-bottom: 8px;
          font-size: 28px;
        }

        .upload-form p {
          color: #666;
          margin-bottom: 32px;
          font-size: 16px;
        }

        .form-section {
          margin-bottom: 24px;
          text-align: left;
        }

        .form-label {
          display: block;
          margin-bottom: 8px;
          font-weight: 600;
          color: #333;
        }

        .continue-button {
          background: #007bff;
          color: white;
          border: none;
          border-radius: 8px;
          padding: 16px 32px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          margin-top: 32px;
          width: 100%;
        }

        .continue-button:hover:not(:disabled) {
          background: #0056b3;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 123, 255, 0.3);
        }

        .continue-button:disabled {
          background: #ccc;
          cursor: not-allowed;
          opacity: 0.7;
        }

        @media (max-width: 768px) {
          .upload-form {
            padding: 24px;
            margin: 20px;
          }
        }
      `}</style>
    </>
  );
};

export default StudentUploadPage;