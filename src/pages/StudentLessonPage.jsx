import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Clock, User, PlusCircle, Upload, LogOut } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import '../styles/StudentLessonView.css';

// Initialize Supabase client
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const StudentLessonPage = () => {
  const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000';
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    checkAuthAndFetchLessons();
    
    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT' || !session) {
          localStorage.removeItem('user');
          navigate('/auth');
        } else if (session) {
          const userData = {
            id: session.user.id,
            email: session.user.email,
            name: session.user.user_metadata?.name || 'User'
          };
          setUser(userData);
          localStorage.setItem('user', JSON.stringify(userData));
          fetchLessons();
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate]);

  const checkAuthAndFetchLessons = async () => {
    try {
      const { data: { user: supabaseUser }, error } = await supabase.auth.getUser();
      
      if (error || !supabaseUser) {
        navigate('/auth');
        return;
      }

      const userData = {
        id: supabaseUser.id,
        email: supabaseUser.email,
        name: supabaseUser.user_metadata?.name || 'User'
      };
      
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      fetchLessons();
    } catch (err) {
      console.error('Error checking auth:', err);
      navigate('/auth');
    }
  };

  // Fetch lessons from backend with Supabase authentication
  const fetchLessons = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate('/auth');
        return;
      }

      const res = await fetch(`${API_BASE}/api/lessons`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (res.status === 401) {
        // Token expired or invalid
        handleLogout();
        return;
      }
      
      if (!res.ok) throw new Error('Failed to fetch lessons');
      const data = await res.json();
      setLessons(data);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle lesson click
  const handleLessonClick = (lesson) => {
    console.log('[NAVIGATE] sending lesson:', lesson);
    navigate('/student-lesson-view', {
      state: {
        studentName: user.name,
        lesson,
        pdfUrl: lesson.pdf_url,
        userId: user.id,
        token: user.token
      },
    });
  };

  // Handle admin upload navigation
  const handleAdminUpload = () => {
    navigate('/admin/upload');
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      localStorage.removeItem('user');
      navigate('/auth');
    } catch (err) {
      console.error('Logout error:', err);
      // Force logout even if there's an error
      localStorage.removeUser('user');
      navigate('/auth');
    }
  };

  // Format date
  const formatDate = (dateString) =>
    new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

  // Show loading while checking authentication
  if (!user && loading) {
    return (
      <div className="auth-loading">
        <div className="loader"></div>
        <p>Checking authentication...</p>
      </div>
    );
  }

  return (
    <>
      <header className="dashboard-header">
        <div className="header-content">
          <div className="header-left-inner">
            <div className="header-icon">
              <BookOpen size={32} className="icon-medium" />
            </div>
            <h2>AI Learning Library</h2>
          </div>
          
          <div className="header-right">
            {/* User info */}
            <div className="user-info">
              <User size={20} />
              <span>Welcome, {user?.name}</span>
            </div>
            
            {/* Admin upload button */}
            <button onClick={handleAdminUpload} className="admin-upload-btn">
              <Upload size={20} />
              <span>Upload New Lesson</span>
            </button>
            
            {/* Logout button */}
            <button onClick={handleLogout} className="logout-btn">
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="container-lessons-page">
        <div className="lessons-page-container">
          {/* Loading */}
          {loading && (
            <div className="loading-container">
              <div className="loader"></div>
              <p>Loading lessons...</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="error-container">
              <p>Error loading lessons: {error}</p>
              <button onClick={() => fetchLessons()} className="retry-btn">
                Try Again
              </button>
            </div>
          )}

          {/* Lessons Grid */}
          {!loading && !error && (
            <div className="lessons-grid">
              <h2>Available Lessons ({lessons.length})</h2>
              <div className="lessons-cards">
                {lessons.map((lesson) => (
                  <div
                    key={lesson.id}
                    className="lesson-card"
                    onClick={() => handleLessonClick(lesson)}
                  >
                    <div className="lesson-card-header">
                      <div className="lesson-icon">
                        <BookOpen size={24} />
                      </div>
                      <span className="lesson-category">{lesson.category || 'General'}</span>
                    </div>

                    <h3 className="lesson-title">{lesson.title}</h3>
                    <p className="lesson-description">
                      {lesson.description || 'No description available'}
                    </p>

                    <div className="lesson-meta">
                      <div className="meta-item">
                        <Clock size={16} />
                        <span>{formatDate(lesson.created_at)}</span>
                      </div>
                      <div className="meta-item">
                        <span>{lesson.filename}</span>
                      </div>
                    </div>

                    <button className="lesson-start-btn">Start Learning</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && lessons.length === 0 && (
            <div className="empty-state">
              <BookOpen size={48} className="empty-icon" />
              <h3>No lessons available</h3>
              <p>Upload your first lesson to get started</p>
              <button onClick={handleAdminUpload} className="empty-cta-btn">
                <PlusCircle size={20} />
                Upload First Lesson
              </button>
            </div>
          )}
        </div>
      </main>

      <style jsx>{`
        .auth-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          background: #f8f9fa;
        }

        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 40px;
          background: white;
          border-bottom: 1px solid #e9ecef;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        }

        .header-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 100%;
        }

        .header-left-inner {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .header-icon {
          color: #007bff;
          background: #f0f8ff;
          padding: 8px;
          border-radius: 8px;
        }

        .header-right {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .user-info {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #666;
          font-weight: 500;
        }

        .admin-upload-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #007bff;
          color: white;
          border: none;
          border-radius: 8px;
          padding: 10px 20px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .admin-upload-btn:hover {
          background: #0056b3;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 123, 255, 0.3);
        }

        .logout-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #dc3545;
          color: white;
          border: none;
          border-radius: 8px;
          padding: 10px;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .logout-btn:hover {
          background: #c82333;
          transform: translateY(-1px);
        }

        .lessons-page-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 40px 20px;
        }

        .loading-container,
        .error-container,
        .empty-state {
          text-align: center;
          padding: 60px 20px;
        }

        .loader {
          border: 4px solid #f3f3f3;
          border-top: 4px solid #007bff;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          animation: spin 1s linear infinite;
          margin: 0 auto 20px;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .retry-btn,
        .empty-cta-btn {
          background: #007bff;
          color: white;
          border: none;
          border-radius: 8px;
          padding: 12px 24px;
          font-size: 16px;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 0 auto;
        }

        .retry-btn:hover,
        .empty-cta-btn:hover {
          background: #0056b3;
        }

        .lessons-grid h2 {
          margin-bottom: 24px;
          color: #333;
        }

        .lessons-cards {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 24px;
        }

        .lesson-card {
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          padding: 24px;
          cursor: pointer;
          transition: all 0.3s ease;
          border: 1px solid #e9ecef;
        }

        .lesson-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
          border-color: #007bff;
        }

        .lesson-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .lesson-icon {
          color: #007bff;
          background: #f0f8ff;
          padding: 8px;
          border-radius: 8px;
        }

        .lesson-category {
          background: #e9ecef;
          color: #666;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 600;
        }

        .lesson-title {
          margin: 0 0 12px 0;
          color: #333;
          font-size: 20px;
          font-weight: 600;
        }

        .lesson-description {
          color: #666;
          font-size: 14px;
          line-height: 1.5;
          margin-bottom: 16px;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .lesson-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          font-size: 14px;
          color: #666;
        }

        .meta-item {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .lesson-start-btn {
          width: 100%;
          background: #007bff;
          color: white;
          border: none;
          border-radius: 8px;
          padding: 12px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .lesson-start-btn:hover {
          background: #0056b3;
        }

        @media (max-width: 768px) {
          .lessons-cards {
            grid-template-columns: 1fr;
          }
          
          .lessons-page-container {
            padding: 20px;
          }

          .dashboard-header {
            padding: 15px 20px;
          }

          .header-right {
            gap: 8px;
          }

          .user-info span {
            display: none;
          }

          .admin-upload-btn span {
            display: none;
          }
        }
      `}</style>
    </>
  );
};

export default StudentLessonPage;