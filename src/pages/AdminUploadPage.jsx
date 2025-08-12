import React, { useState, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Upload, FileText, X, Loader, CheckCircle2, User, BookOpen, Tag } from 'lucide-react';
import '../styles/StudentLessonView.css';

const AdminUploadPage = () => {
  const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000';
  const navigate = useNavigate();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [pdfContent, setPdfContent] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

const handleFileUpload = async (e) => {
  const file = e.target.files?.[0];
  if (!file || file.type !== 'application/pdf') {
    alert('Please upload a valid PDF.');
    return;
  }

  setUploadedFile(file);
  setIsProcessing(true);

  try {
    const fileName = `${Date.now()}_${file.name}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('lessons')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) throw error;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('lessons')
      .getPublicUrl(fileName);

    // Process PDF content via your backend
    const response = await fetch(`${import.meta.env.VITE_API_BASE}/api/pdf/process-pdf-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: publicUrl }),
    });

    const json = await response.json();
    setPdfContent(json.content);

  } catch (err) {
    console.error(err);
    alert('Failed to upload or process PDF.');
    setUploadedFile(null);
  } finally {
    setIsProcessing(false);
  }
};

  const removeFile = () => {
    setUploadedFile(null);
    setPdfContent('');
    fileInputRef.current && (fileInputRef.current.value = '');
  };

  const handleSubmit = async (e) => {
  e.preventDefault();

  if (!title.trim() || !category.trim() || !uploadedFile || !pdfUrl) {
    alert('Please complete all fields and upload a PDF.');
    return;
  }

  setIsUploading(true);
  try {
    const { error } = await supabase.from('lessons').insert({
      title: title.trim(),
      description: description.trim(),
      category: category.trim(),
      pdf_url: pdfUrl, // the URL
      filename: uploadedFile.name,
    });

    if (error) throw error;

    alert('Lesson uploaded successfully!');
    navigate('/');
  } catch (err) {
    console.error(err);
    alert('Failed to upload lesson.');
  } finally {
    setIsUploading(false);
  }
};


  return (
    <>
      <header className="dashboard-header">
        <div className="header-content">
          <div className="header-left-inner">
            <div className="header-icon">
              <Upload size={32} className="icon-medium" />
            </div>
            <h2>Upload New Lesson</h2>
          </div>
          <button onClick={() => navigate('/')} className="back-btn">
            Back to Library
          </button>
        </div>
      </header>

      <main className="container-lessons-page">
        <div className="upload-page-container">
          <form onSubmit={handleSubmit} className="upload-form">
            <h1>Add New Lesson to Library</h1>
            <p>Upload and configure a new learning material</p>

            {/* Lesson Details */}
            <div className="form-section">
              <label className="form-label">Lesson Title *</label>
              <input
                type="text"
                placeholder="Enter lesson title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={100}
                className="text-input"
                required
              />
            </div>

            <div className="form-section">
              <label className="form-label">Category *</label>
              <input
                type="text"
                placeholder="e.g., Mathematics, Science, History"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                maxLength={50}
                className="text-input"
                required
              />
            </div>

            <div className="form-section">
              <label className="form-label">Description</label>
              <textarea
                placeholder="Brief description of the lesson..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={500}
                className="textarea-input"
                rows={3}
              />
            </div>

            {/* PDF Upload */}
            <div className="form-section">
              <label className="form-label">PDF Document *</label>
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
                    <button type="button" onClick={removeFile} className="remove-file-btn">
                      <X size={20} />
                    </button>
                    {isProcessing && (
                      <div className="processing-indicator">
                        <Loader className="spinning" size={20} />
                        <span>Processing PDF...</span>
                      </div>
                    )}
                    {!isProcessing && pdfContent && (
                      <div className="success-indicator">
                        <CheckCircle2 size={20} />
                        <span>PDF processed successfully!</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <button 
              type="submit"
              disabled={!title.trim() || !category.trim() || !uploadedFile || !pdfContent || isUploading || isProcessing}
              className="submit-button"
            >
              {isUploading ? 'Uploading...' : 'Add to Library'}
            </button>
          </form>
        </div>
      </main>

      <style jsx>{`
        .back-btn {
          background: #6c757d;
          color: white;
          border: none;
          border-radius: 8px;
          padding: 10px 20px;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .back-btn:hover {
          background: #5a6268;
        }

        .text-input,
        .textarea-input {
          width: 100%;
          padding: 12px;
          border: 1px solid #ddd;
          border-radius: 8px;
          font-size: 16px;
          transition: border-color 0.3s ease;
        }

        .text-input:focus,
        .textarea-input:focus {
          outline: none;
          border-color: #007bff;
        }

        .textarea-input {
          resize: vertical;
          min-height: 80px;
        }

        .submit-button {
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

        .submit-button:hover:not(:disabled) {
          background: #0056b3;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 123, 255, 0.3);
        }

        .submit-button:disabled {
          background: #ccc;
          cursor: not-allowed;
          opacity: 0.7;
        }
      `}</style>
    </>
  );
};

export default AdminUploadPage;