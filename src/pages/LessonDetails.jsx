import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../hooks/useAuth';
import '../styles/LessonDetails.css';
import { 
  Plus, 
  BookOpen, 
  Users, 
  Settings, 
  LogOut, 
  X, 
  Check, 
  ChevronLeft, 
  Loader,
  Eye,
  Clock,
  BarChart3,
  Camera,
  Music,
  Video,
  Edit2,
  Trash2,
  CheckCircle,
  Star,
  Tag
} from 'lucide-react';


const LessonDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token, user, logout } = useAuth();
  const BASE_URL = 'http://localhost:5000/';
  const [lesson, setLesson] = useState(null);
  const [editing, setEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('content');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [stats, setStats] = useState(null);
  const [editedLesson, setEditedLesson] = useState({
    title: '',
    content: '',
    image: null,
    audio: null,
    video: null,
  });

  useEffect(() => {
    fetchLesson();
    fetchLessonStats();
  }, [id]);

  const fetchLesson = async () => {
    try {
      const res = await axios.get(`/api/lessons/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setLesson(res.data);
      setEditedLesson({
        title: res.data.title,
        content: res.data.content,
        image: null,
        audio: null,
        video: null,
      });
    } catch (error) {
      console.error('Error fetching lesson:', error);
    }
  };

  const fetchLessonStats = async () => {
    try {
      const res = await axios.get(`/api/lessons/${id}/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStats(res.data);
    } catch (error) {
      console.error('Error fetching lesson stats:', error);
    }
  };

  const handleUpdateLesson = async () => {
    const formData = new FormData();
    formData.append('title', editedLesson.title);
    formData.append('content', editedLesson.content);
    if (editedLesson.image) formData.append('image', editedLesson.image);
    if (editedLesson.audio) formData.append('audio', editedLesson.audio);
    if (editedLesson.video) formData.append('video', editedLesson.video);

    try {
      await axios.put(`/api/lessons/${id}`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });
      setEditing(false);
      fetchLesson();
    } catch (error) {
      console.error('Error updating lesson:', error);
    }
  };

  const handleDeleteLesson = async () => {
    try {
      await axios.delete(`/api/lessons/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      navigate(-1);
    } catch (error) {
      console.error('Error deleting lesson:', error);
    }
    setShowDeleteModal(false);
  };

  const toggleBookmark = async () => {
    try {
      const res = await axios.post(`/api/lessons/${id}/bookmark`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setIsBookmarked(res.data.bookmarked);
    } catch (error) {
      console.error('Error toggling bookmark:', error);
    }
  };

  if (!lesson) {
    return (
      <div className="loading-container">
        <Loader className="spinner-icon" />
        <p className="loading-text">Loading lesson...</p>
      </div>
    );
  }

  return (
    <>
      {/* Header Section */}
      <header className="dashboard-header">
        <div className="header-content">
          <div className="header-left">
            <div className="header-left-inner">
              <div className="header-icon">
                <BookOpen className="icon-medium" />
              </div>
              
              
              <div>
                <button onClick={() => navigate(-1)} className="back-button">
                <ChevronLeft size={22} />
                   Back
              </button>
              </div>
            </div>
          </div>
          
          <div className="header-right">
            <div className="user-info">
              <p className="user-name">{user?.first_name}</p>
              <p className="user-email">{user?.email}</p>
            </div>
            <button
              onClick={logout}
              className="logout-btn"
            >
              <LogOut className="icon-small" />
              <span className="logout-text">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container-lessons-page">
        {/* Lesson Title */}
        <div className="title-section">
          <h1 className="lesson-title">{lesson.title}</h1>
          {stats && (
            <div className="metadata">
              <span className="metadata-item">
                <Eye className="metadata-icon" size={16} />
                {stats.views || 0} views
              </span>
              <span className="metadata-item">
                <Clock className="metadata-icon" size={16} />
                {stats.timeSpent || 'N/A'}
              </span>
              <span className="metadata-item">
                <BarChart3 className="metadata-icon" size={16} />
                {stats.difficulty || 'N/A'}
              </span>
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        <nav className="tab-navigation">
          {['content', 'statistics', 'media'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`tab-button ${activeTab === tab ? 'active' : ''}`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>

        {/* Tab Content */}
        <div className="tab-content">
          {activeTab === 'content' && (
            <div className="content-tab">
              {editing ? (
                <div className="edit-form">
                  <input
                    type="text"
                    value={editedLesson.title}
                    onChange={(e) => setEditedLesson({ ...editedLesson, title: e.target.value })}
                    placeholder="Lesson Title"
                    className="input"
                  />
                  <textarea
                    value={editedLesson.content}
                    onChange={(e) => setEditedLesson({ ...editedLesson, content: e.target.value })}
                    placeholder="Lesson Content"
                    className="textarea"
                  />

                  <div className="file-inputs">
                    <label className="file-label">
                      <Camera size={16} />
                      Replace Image
                      <input type="file" accept="image/*" onChange={(e) => setEditedLesson({ ...editedLesson, image: e.target.files[0] })} className="hidden-input" />
                    </label>
                    <label className="file-label">
                      <Music size={16} />
                      Replace Audio
                      <input type="file" accept="audio/*" onChange={(e) => setEditedLesson({ ...editedLesson, audio: e.target.files[0] })} className="hidden-input" />
                    </label>
                    <label className="file-label">
                      <Video size={16} />
                      Replace Video
                      <input type="file" accept="video/*" onChange={(e) => setEditedLesson({ ...editedLesson, video: e.target.files[0] })} className="hidden-input" />
                    </label>
                  </div>

                  <div className="edit-actions">
                    <button onClick={handleUpdateLesson} className="save-button">Save Changes</button>
                    <button onClick={() => setEditing(false)} className="cancel-button">Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="lesson-content">
                  
                  <div className="content-sections">
                    {lesson.content.split(/\n\s*\n|\n/).map((section, idx) => (
                      <div key={idx} className={`content-section color-${idx % 4}`}>
                        {section}
                      </div>
                    ))}
                  </div>

                  <div className="media-grid">
                    {lesson.image_url && (
                      <div className="media-item">
                        <img src={`${BASE_URL}${lesson.image_url}`} alt="Lesson" className="image" />
                      </div>
                    )}
                    {lesson.audio_url && (
                      <div className="media-item">
                        <audio controls src={`${BASE_URL}${lesson.audio_url}`} className="audio" />
                      </div>
                    )}
                    {lesson.video_url && (
                      <div className="media-item">
                        <video controls src={`${BASE_URL}${lesson.video_url}`} className="video" />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'statistics' && (
            <div className="statistics-tab">
              {stats ? (
                <>
                  <div className="stats-grid-lessons">
                    <div className="stat-card-lessons">
                      <div className="stat-icon-lessons">
                        <Eye className="metadata-icon" size={24} />
                      </div>
                      <div className="stat-value-lessons">{(stats.views || 0).toLocaleString()}</div>
                      <div className="stat-label-lessons">Total Views</div>
                    </div>
                    <div className="stat-card-lessons">
                      <div className="stat-icon-lessons">
                        <CheckCircle className="metadata-icon" size={24} />
                      </div>
                      <div className="stat-value-lessons">{stats.completions || 0}</div>
                      <div className="stat-label-lessons">Completions</div>
                    </div>
                    <div className="stat-card-lessons">
                      <div className="stat-icon-lessons">
                        <Star className="metadata-icon" size={24} />
                      </div>
                      <div className="stat-value-lessons">{stats.averageRating || 'N/A'}{stats.averageRating ? '/5' : ''}</div>
                      <div className="stat-label-lessons">Rating ({stats.totalRatings || 0} reviews)</div>
                    </div>
                    <div className="stat-card-lessons">
                      <div className="stat-icon-lessons">
                        <Clock className="metadata-icon" size={24} />
                      </div>
                      <div className="stat-value-lessons">{stats.timeSpent || 'N/A'}</div>
                      <div className="stat-label-lessons">Avg. Time</div>
                    </div>
                  </div>

                  {stats.tags && stats.tags.length > 0 && (
                    <div className="tags-section">
                      <h3 className="tags-title">Tags</h3>
                      <div className="tags-list">
                        {stats.tags.map((tag, idx) => (
                          <span key={idx} className="tag">
                            <Tag className="metadata-icon" size={12} />
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="recent-activity">
                    <h3 className="activity-title">Recent Activity</h3>
                    <p className="activity-item">Last accessed: {stats.lastAccessed || 'Never'}</p>
                    <p className="activity-item">Difficulty level: {stats.difficulty || 'Not set'}</p>
                  </div>
                </>
              ) : (
                <div className="loading-stats">Loading statistics...</div>
              )}
            </div>
          )}

          {activeTab === 'media' && (
            <div className="media-tab">
              <div className="media-gallery">
                {lesson.image_url && (
                  <div className="gallery-item">
                    <h4 className="media-title">Featured Image</h4>
                    <img src={`${BASE_URL}${lesson.image_url}`} alt="Lesson" className="gallery-image" />
                  </div>
                )}
                {lesson.audio_url && (
                  <div className="gallery-item">
                    <h4 className="media-title">Audio Content</h4>
                    <audio controls src={`${BASE_URL}${lesson.audio_url}`} className="gallery-audio" />
                  </div>
                )}
                {lesson.video_url && (
                  <div className="gallery-item">
                    <h4 className="media-title">Video Content</h4>
                    <video controls src={`${BASE_URL}${lesson.video_url}`} className="gallery-video" />
                  </div>
                )}
                {!lesson.image_url && !lesson.audio_url && !lesson.video_url && (
                  <div className="no-media">
                    <p>No media files attached to this lesson.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        {!editing && (
          <div className="action-buttons-container">
            <button onClick={() => setEditing(true)} className="edit-button">
              <Edit2 size={16} />
              Edit Lesson
            </button>
            <button onClick={() => setShowDeleteModal(true)} className="delete-button">
              <Trash2 size={16} />
              Delete Lesson
            </button>
          </div>
        )}
      

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="delete-modal" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">Delete Lesson</h3>
            <p className="modal-text">Are you sure you want to delete this lesson? This action cannot be undone.</p>
            <div className="modal-actions">
              <button onClick={() => setShowDeleteModal(false)} className="modal-cancel-button">Cancel</button>
              <button onClick={handleDeleteLesson} className="modal-delete-button">Delete</button>
            </div>
          </div>
        </div>
      )}
      </main>
    </>
  );
};

export default LessonDetails;