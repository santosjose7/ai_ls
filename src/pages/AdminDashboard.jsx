import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Plus, BookOpen, Users, Settings, LogOut, X, Check } from 'lucide-react';
import '../styles/AdminDashboard.css';

const AdminDashboard = () => {
  const { token, user, logout } = useAuth();
  const navigate = useNavigate();

  const [courses, setCourses] = useState([]);
  const [newCourse, setNewCourse] = useState({ title: '', description: '' });
  const [showModal, setShowModal] = useState(false);
  const addBtnRef = useRef(null);

  // Predefined gradient combinations
  const gradients = [
    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
    'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
    'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
    'linear-gradient(135deg, #ff8a80 0%, #ea80fc 100%)',
    'linear-gradient(135deg, #8fd3f4 0%, #84fab0 100%)',
    'linear-gradient(135deg, #d299c2 0%, #fef9d7 100%)',
    'linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%)',
    'linear-gradient(135deg, #fdbb2d 0%, #22c1c3 100%)',
    'linear-gradient(135deg, #e0c3fc 0%, #9bb5ff 100%)',
    'linear-gradient(135deg, #ffeaa7 0%, #fab1a0 100%)',
    'linear-gradient(135deg, #74b9ff 0%, #0984e3 100%)',
    'linear-gradient(135deg, #fd79a8 0%, #fdcb6e 100%)',
    'linear-gradient(135deg, #6c5ce7 0%, #a29bfe 100%)',
    'linear-gradient(135deg, #fd63a6 0%, #ffb88c 100%)',
    'linear-gradient(135deg, #52c234 0%, #061700 100%)',
  ];

  // Function to get a consistent gradient for each course
  const getCourseGradient = (courseId, index) => {
    // Use courseId if available, otherwise use index
    const seed = courseId ? courseId.toString() : index.toString();
    const hash = seed.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    return gradients[Math.abs(hash) % gradients.length];
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const openModal = () => {
    setShowModal(true);
  };

  const fetchCourses = async () => {
    try {
      const res = await axios.get('/api/courses', {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });
      setCourses(res.data);
    } catch (error) {
      console.error('Error fetching courses:', error);
    }
  };

  const handleAddCourse = async () => {
    try {
      await axios.post('/api/courses', newCourse, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });
      setNewCourse({ title: '', description: '' });
      setShowModal(false);
      fetchCourses();
    } catch (error) {
      console.error('Error adding course:', error);
    }
  };

  const handleCourseClick = (courseId) => {
    navigate(`/admin/courses/${courseId}`);
  };

  if (user?.role !== 'admin') {
    return (
      <div className="access-denied-container">
        <div className="access-denied-card">
          <div className="access-denied-content">
            <div className="access-denied-icon">
              <X className="icon-large" />
            </div>
            <h2 className="access-denied-title">Access Denied</h2>
            <p className="access-denied-text">You don't have permission to access this area.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-content">
          <div className="header-left">
            <div className="header-left-inner">
              <div className="header-icon">
                <BookOpen className="icon-medium" />
              </div>
              <div>
                <h1 className="header-title">
                  Admin Dashboard
                </h1>
                <p className="header-subtitle">Course Management System</p>
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
      <main className="main-content">
        {/* Stats Cards */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-card-content">
              <div>
                <p className="stat-label">Total Courses</p>
                <p className="stat-value">{courses.length}</p>
              </div>
              <div className="stat-icon stat-icon-blue">
                <BookOpen className="icon-medium" />
              </div>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-card-content">
              <div>
                <p className="stat-label">Total Students</p>
                <p className="stat-value">{courses.reduce((sum, course) => sum + (course.students || 0), 0)}</p>
              </div>
              <div className="stat-icon stat-icon-green">
                <Users className="icon-medium" />
              </div>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-card-content">
              <div>
                <p className="stat-label">Active Courses</p>
                <p className="stat-value">{courses.filter(c => c.status === 'active').length}</p>
              </div>
              <div className="stat-icon stat-icon-purple">
                <Settings className="icon-medium" />
              </div>
            </div>
          </div>
        </div>

        {/* Course Management Section */}
        <div className="course-management-section">
          <div className="section-header">
            <div className="section-header-left">
              <div>
                <h2 className="section-title">Course Management</h2>
                <p className="section-subtitle">Create and manage your institution's courses</p>
              </div>
              <button
                ref={addBtnRef}
                onClick={openModal}
                className="add-course-btn"
              >
                <Plus className="icon-medium" />
                <span className='add-course-text'>Add Course</span>
              </button>
            </div>
          </div>

          {/* Course List */}
          <div className="course-list-container">
            {courses.length === 0 ? (
              <div className="empty-state">
                <BookOpen className="empty-icon" />
                <h3 className="empty-title">No courses yet</h3>
                <p className="empty-text">Get started by creating your first course</p>
                <button
                  onClick={openModal}
                  className="create-course-btn"
                >
                  Create Course
                </button>
              </div>
            ) : (
              <div className="courses-grid">
                {courses.map((course, index) => (
                  <div
                    key={course.id}
                    onClick={() => handleCourseClick(course.id)}
                    className="course-card"
                    style={{
                      background: getCourseGradient(course.id, index)
                    }}
                  >
                    <div className="course-card-content">
                      <div className="course-info">
                        <div className="course-header">
                          <h3 className="course-title">
                            {course.title}
                          </h3>
                          {course.status && (
                            <span className={`status-badge ${course.status === 'active' ? 'status-active' : 'status-inactive'}`}>
                              {course.status}
                            </span>
                          )}
                        </div>
                        <p className="course-description">
                          {course.description.length > 20 ? `${course.description.slice(0, 20)}...` : course.description}
                        </p>

                        {course.students !== undefined && (
                          <div className="course-stats">
                            <div className="student-count">
                              <Users className="icon-small" />
                              <span>{course.students} students</span>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="course-icon">
                        <BookOpen className="icon-medium" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <div className="modal-header-content">
                <h3 className="modal-title">Add New Course</h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="modal-close-btn"
                >
                  <X className="icon-small" />
                </button>
              </div>
            </div>
            
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Course Title</label>
                <input
                  type="text"
                  placeholder="Enter course title"
                  value={newCourse.title}
                  onChange={e => setNewCourse({ ...newCourse, title: e.target.value })}
                  className="form-input"
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  placeholder="Enter course description"
                  value={newCourse.description}
                  onChange={e => setNewCourse({ ...newCourse, description: e.target.value })}
                  rows={3}
                  className="form-textarea"
                />
              </div>
            </div>
            
            <div className="modal-footer">
              <button
                onClick={() => setShowModal(false)}
                className="cancel-btn"
              >
                Cancel
              </button>
              <button
                onClick={handleAddCourse}
                disabled={!newCourse.title || !newCourse.description}
                className="submit-btn"
              >
                <Check className="icon-small" />
                <span>Add Course</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AdminDashboard;