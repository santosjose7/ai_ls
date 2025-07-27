import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../hooks/useAuth';
import { ChevronLeft, Edit3, Trash2, Plus, Upload, X, Check, AlertCircle, Loader, BookOpen, LogOut } from 'lucide-react';
import '../styles/CourseDetails.css'

const CourseDetails = () => {
  const { id } = useParams();
  const { token, user, logout } = useAuth();
  const navigate = useNavigate();

  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [editing, setEditing] = useState(false);
  const [editedCourse, setEditedCourse] = useState({ title: '', description: '' });
  const [newLesson, setNewLesson] = useState({
    title: '',
    content: '',
    image: null,
    audio: null,
    video: null,
  });
  
  // UI State
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showAddLessonModal, setShowAddLessonModal] = useState(false);
  const [notification, setNotification] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchCourse();
    fetchLessons();
  }, [id]);

  const fetchCourse = async () => {
    try {
      const res = await axios.get(`/api/courses/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCourse(res.data);
      setEditedCourse({ title: res.data.title, description: res.data.description });
    } catch (error) {
      console.error('Error fetching course:', error);
      showNotification('error', 'Failed to fetch course details');
    } finally {
      setLoading(false);
    }
  };

  const fetchLessons = async () => {
    try {
      const res = await axios.get(`/api/courses/${id}/lessons`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setLessons(Array.isArray(res.data.lessons) ? res.data.lessons : []);
    } catch (error) {
      console.error('Error fetching lessons:', error);
      setLessons([]);
    }
  };

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleUpdateCourse = async () => {
    setActionLoading(true);
    try {
      await axios.put(`/api/courses/${id}`, editedCourse, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setEditing(false);
      fetchCourse();
      showNotification('success', 'Course updated successfully!');
    } catch (error) {
      console.error('Error updating course:', error);
      showNotification('error', 'Failed to update course');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteCourse = async () => {
    if (!window.confirm('Delete this course?')) {
      setShowDeleteModal(false);
      return;
    }
    setActionLoading(true);
    try {
      await axios.delete(`/api/courses/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      navigate('/admin');
      showNotification('success', 'Course deleted successfully!');
    } catch (error) {
      console.error('Error deleting course:', error);
      showNotification('error', 'Failed to delete course');
    } finally {
      setActionLoading(false);
      setShowDeleteModal(false);
    }
  };

  const handleAddLesson = async () => {
    const formData = new FormData();
    formData.append('title', newLesson.title);
    formData.append('content', newLesson.content);
    if (newLesson.image) formData.append('image', newLesson.image);
    if (newLesson.audio) formData.append('audio', newLesson.audio);
    if (newLesson.video) formData.append('video', newLesson.video);

    setActionLoading(true);
    try {
      await axios.post(`/api/courses/${id}/lessons`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });
      setNewLesson({ title: '', content: '', image: null, audio: null, video: null });
      fetchLessons();
      setShowAddLessonModal(false);
      showNotification('success', 'Lesson added successfully!');
    } catch (error) {
      console.error('Error adding lesson:', error);
      showNotification('error', 'Failed to add lesson');
    } finally {
      setActionLoading(false);
    }
  };

  if (!course) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">
          <Loader className="spinner-icon" />
          <p>Loading course details...</p>
        </div>
        <style jsx>{`
          .loading-container {
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 60vh;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 20px;
            margin: 20px;
          }
          .loading-spinner {
            text-align: center;
            color: white;
          }
          .spinner-icon {
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin-bottom: 16px;
          }
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <>
      {/* Header Section */}
      <header className="dashboard-header-details">
        <div className="header-content">
          <div className="header-left">
            <div className="header-left-inner">
              <div className="header-icon">
                <BookOpen className="icon-medium" />
              </div>
              
              <button onClick={() => navigate('/admin')} className="back-button-details">
                <ChevronLeft size={20} />
                <span className='back-text'>Back</span>
              </button>
              <h1 className="page-title-details">Manage Course</h1>
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
      <main className="course-details-container">

      {/* Course Details Card */}
      <div className="course-card-details">
        <div className="card-header-details">
          <h2>Course Information</h2>
          <div className="card-actions-details">
            {!editing && (
              <>
                <button
                  onClick={() => setEditing(true)}
                  className="action-button-details edit-button-details"
                >
                  <Edit3 size={16} />
                  Edit
                </button>
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="action-button-details delete-button-details"
                >
                  <Trash2 size={16} />
                  Delete
                </button>
              </>
            )}
          </div>
        </div>

        <div className="card-content-details">
          {editing ? (
            <div className="edit-form-details">
              <div className="form-group-details">
                <label>Course Title</label>
                <input
                  type="text"
                  value={editedCourse.title}
                  onChange={(e) => setEditedCourse({ ...editedCourse, title: e.target.value })}
                  placeholder="Enter course title"
                />
              </div>
              <div className="form-group-details">
                <label>Description</label>
                <textarea
                  value={editedCourse.description}
                  onChange={(e) => setEditedCourse({ ...editedCourse, description: e.target.value })}
                  placeholder="Enter course description"
                  rows="4"
                />
              </div>
              <div className="form-actions-details">
                <button
                  onClick={handleUpdateCourse}
                  className="save-button-details"
                  disabled={actionLoading}
                >
                  {actionLoading ? <Loader className="loading-icon" /> : <Check size={16} />}
                  {actionLoading ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="cancel-button-details"
                  disabled={actionLoading}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="course-info-details">
              <h3 className="course-title-details">{course?.title}</h3>
              <p className="course-description-details">{course?.description}</p>
              <div className="course-meta-details">
                <span className="meta-item-details">
                  <strong>{lessons.length}</strong> Lessons
                </span>
                <span className="meta-item-details">
                  <strong>Active</strong> Status
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Lessons Section */}
      <div className="lessons-section-details">
        <div className="section-header-details">
          <h2>Course Lessons</h2>
          <button
            onClick={() => setShowAddLessonModal(true)}
            className="add-lesson-button-details"
          >
            <Plus size={16} />
            Add New Lesson
          </button>
        </div>

        <div className="lessons-grid-details">
          {lessons.map((lesson, index) => (
            <div
              key={lesson.id}
              className="lesson-card-details"
              onClick={() => navigate(`/admin/lessons/${lesson.id}`)}
            >
              <div className="lesson-number-details">{index + 1}</div>
              <h4 className="lesson-title-details">{lesson.title}</h4>
              <div className="lesson-arrow-details">→</div>
            </div>
          ))}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Delete Course</h3>
              <button onClick={() => setShowDeleteModal(false)} className="close-button">
                <X size={20} />
              </button>
            </div>
            <div className="modal-content">
              <div className="warning-icon">
                <AlertCircle size={48} />
              </div>
              <p>Are you sure you want to delete this course? This action cannot be undone.</p>
            </div>
            <div className="modal-actions">
              <button
                onClick={handleDeleteCourse}
                className="confirm-delete-button"
                disabled={actionLoading}
              >
                {actionLoading ? <Loader className="loading-icon" /> : null}
                {actionLoading ? 'Deleting...' : 'Delete Course'}
              </button>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="cancel-button"
                disabled={actionLoading}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Lesson Modal */}
      {showAddLessonModal && (
        <div className="modal-overlay" onClick={() => setShowAddLessonModal(false)}>
          <div className="modal large-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-details">
              <h3>Add New Lesson</h3>
              <button onClick={() => setShowAddLessonModal(false)} className="close-button">
                <X size={20} />
              </button>
            </div>
            <div className="modal-content-details">
              <div className="form-group-details">
                <label>Lesson Title *</label>
                <input
                  type="text"
                  value={newLesson.title}
                  onChange={(e) => setNewLesson({ ...newLesson, title: e.target.value })}
                  placeholder="Enter lesson title"
                />
              </div>
              <div className="form-group-details">
                <label>Lesson Content *</label>
                <textarea
                  value={newLesson.content}
                  onChange={(e) => setNewLesson({ ...newLesson, content: e.target.value })}
                  placeholder="Enter lesson content"
                  rows="4"
                />
              </div>
              <div className="file-uploads">
                <div className="upload-section">
                  <label>
                    <Upload size={16} />
                    Image (optional)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setNewLesson({ ...newLesson, image: e.target.files[0] })}
                  />
                </div>
                <div className="upload-section">
                  <label>
                    <Upload size={16} />
                    Audio (optional)
                  </label>
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={(e) => setNewLesson({ ...newLesson, audio: e.target.files[0] })}
                  />
                </div>
                <div className="upload-section">
                  <label>
                    <Upload size={16} />
                    Video (optional)
                  </label>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={(e) => setNewLesson({ ...newLesson, video: e.target.files[0] })}
                  />
                </div>
              </div>
            </div>
            <div className="modal-actions">
              <button
                onClick={handleAddLesson}
                className="add-button"
                disabled={actionLoading}
              >
                {actionLoading ? <Loader className="loading-icon" /> : <Plus size={16} />}
                {actionLoading ? 'Adding...' : 'Add Lesson'}
              </button>
              <button
                onClick={() => setShowAddLessonModal(false)}
                className="cancel-button"
                disabled={actionLoading}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notification Toast */}
      {notification && (
        <div className={`notification ${notification.type}`}>
          <div className="notification-content">
            {notification.type === 'success' ? (
              <Check size={20} />
            ) : (
              <AlertCircle size={20} />
            )}
            <span>{notification.message}</span>
          </div>
        </div>
      )}
      </main>
    </>
  );
};

export default CourseDetails;