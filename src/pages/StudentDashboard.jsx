import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { BookOpen, Users, Award, Clock, Play, Pause, Volume2, VolumeX, MessageSquare, TrendingUp, Calendar, Star, ChevronRight, User, LogOut, Bell, Search } from 'lucide-react';

import '../styles/StudentDashboard.css';

const StudentDashboard = () => {
  const { token, user, logout } = useAuth();
  const navigate = useNavigate();

  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [isAiGreetingVisible, setIsAiGreetingVisible] = useState(true);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [aiGreetingText, setAiGreetingText] = useState("");
  const [search, setSearch] = useState('');
  const [showDescOverlay, setShowDescOverlay] = useState(false);
  const [descOverlayText, setDescOverlayText] = useState('');
  const speechSynthRef = useRef(null);

  // Predefined gradient combinations for courses
  const gradients = [
    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
    'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
  ];

  const getCourseGradient = (courseId, index) => {
    return gradients[index % gradients.length];
  };

  useEffect(() => {
    fetchEnrolledCourses();
    if (user?.first_name) {
      generateAiGreeting();
    }
  }, [user]);

  const fetchEnrolledCourses = async () => {
  // FAKE COURSES FOR DEMO PURPOSES
  const fakeCourses = [
    {
      id: 'course1',
      title: 'Introduction to Mathematics',
      description: 'Learn the basics of algebra, geometry, and arithmetic in this foundational math course.',
      progress: 75,
      grade: 88,
      dueAssignments: 1,
      completedLessons: 6,
      totalLessons: 8,
      lastAccessed: '2 days ago',
      nextLesson: 'Algebra Basics',
      nextLessonId: 'lesson101',
    },
    {
      id: 'course2',
      title: 'Fundamentals of Python Programming',
      description: 'Dive into Python with hands-on coding examples, from variables to loops and functions.',
      progress: 40,
      grade: 72,
      dueAssignments: 2,
      completedLessons: 4,
      totalLessons: 10,
      lastAccessed: '5 days ago',
      nextLesson: 'Loops and Iteration',
      nextLessonId: 'lesson202',
    },
    {
      id: 'course3',
      title: 'World History: Ancient Civilizations',
      description: 'Explore the rise and fall of ancient societies from Egypt, Rome, Mesopotamia, and more.',
      progress: 90,
      grade: 94,
      dueAssignments: 0,
      completedLessons: 9,
      totalLessons: 10,
      lastAccessed: 'yesterday',
      nextLesson: 'The Roman Empire',
      nextLessonId: 'lesson303',
    },
  ];

  // You could persist this to localStorage if needed
  setEnrolledCourses(fakeCourses);
};

  const generateAiGreeting = () => {
    if (!user?.first_name) return;
    
    const greetings = [
      `Welcome back, ${user.first_name}! Ready to continue your learning journey today?`,
      `Hello ${user.first_name}! You have some exciting lessons waiting for you.`,
      `Hi there, ${user.first_name}! Let's make today another step forward in your education.`,
      `Good to see you again, ${user.first_name}! Your dedication to learning is inspiring.`
    ];
    
    const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];
    setAiGreetingText(randomGreeting);
  };

  const handleVoiceToggle = () => {
    if (isVoiceEnabled && isAiSpeaking) {
      // Stop current speech
      if (speechSynthRef.current) {
        window.speechSynthesis.cancel();
        setIsAiSpeaking(false);
      }
    } else if (isVoiceEnabled && !isAiSpeaking) {
      // Start speech
      const utterance = new SpeechSynthesisUtterance(aiGreetingText);
      utterance.rate = 0.9;
      utterance.pitch = 1.1;
      utterance.onstart = () => setIsAiSpeaking(true);
      utterance.onend = () => setIsAiSpeaking(false);
      speechSynthRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    }
    
    if (!isVoiceEnabled) {
      setIsVoiceEnabled(true);
      setTimeout(() => {
        const utterance = new SpeechSynthesisUtterance(aiGreetingText);
        utterance.rate = 0.9;
        utterance.pitch = 1.1;
        utterance.onstart = () => setIsAiSpeaking(true);
        utterance.onend = () => setIsAiSpeaking(false);
        speechSynthRef.current = utterance;
        window.speechSynthesis.speak(utterance);
      }, 100);
    }
  };

  const handleContinueLesson = (course) => {
    // Navigate to the lesson details page with the next lesson ID
    if (course.nextLesson) {
      navigate(`/student/lesson/${course.nextLessonId}`);
    } else {
      // Fallback: navigate to course overview
     
    }
  };

  const getOverallProgress = () => {
    if (enrolledCourses.length === 0) return 0;
    return Math.round(enrolledCourses.reduce((sum, course) => sum + course.progress, 0) / enrolledCourses.length);
  };

  const getTotalDueAssignments = () => {
    return enrolledCourses.reduce((sum, course) => sum + course.dueAssignments, 0);
  };

  const getAverageGrade = () => {
    if (enrolledCourses.length === 0) return 0;
    return Math.round(enrolledCourses.reduce((sum, course) => sum + course.grade, 0) / enrolledCourses.length);
  };

  // Filter enrolled courses by search
  const filteredCourses = enrolledCourses.filter(course =>
    course.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      {/* Header */}
      <header className="header-student">
        <div className="header-content-student">
          <div className="header-left-student">
            <div className="logo-section-student">
              <div className="logo-icon-student">
                <BookOpen className="icon-sm" />
              </div>
              <div className="logo-text-student">
                <h1 className="logo-title-student">Learning Hub</h1>
                <p className="logo-subtitle-student">Student Portal</p>
              </div>
            </div>
          </div>
          
          <div className="header-right-student">
            <div className="search-container-student">
              <Search className="search-icon-student" />
              <input
                type="text"
                placeholder="Search courses..."
                className="search-input-student"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            
            <button className="notification-btn-student">
              <Bell className="icon-xs" />
              <span className="notification-dot-student"></span>
            </button>
            
            <div className="user-section-student">
              <div className="user-info-student">
                <p className="user-name-student">
                  {user?.first_name || 'Student'} {user?.last_name}
                </p>
                <p className="user-email-student">{user?.email}</p>
              </div>
              
              <button
                onClick={logout}
                className="logout-btn-student"
              >
                <LogOut className="icon-small" />
                <span className="logout-text-student">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* AI Greeting Section */}
      {isAiGreetingVisible && user && aiGreetingText && (
        <div className="ai-greeting-wrapper-student">
          <div className="ai-greeting-card-student">
            <div className="ai-greeting-overlay-student"></div>
            <div className="ai-greeting-content-student">
              <div className="ai-greeting-left-student">
                <div className="ai-avatar-student">
                  <MessageSquare className="icon-sm" />
                </div>
                <div className="ai-text-student">
                  <h3 className="ai-title-student">AI Assistant</h3>
                  <p className="ai-message-student">{aiGreetingText}</p>
                </div>
              </div>
              
              <div className="ai-greeting-right-student">
                <button
                  onClick={handleVoiceToggle}
                  className={`voice-btn-student ${isVoiceEnabled ? 'voice-enabled-student' : 'voice-disabled-student'}`}
                >
                  {isAiSpeaking ? (
                    <Pause className="icon-xs" />
                  ) : isVoiceEnabled ? (
                    <Volume2 className="icon-xs" />
                  ) : (
                    <VolumeX className="icon-xs" />
                  )}
                  <span className="voice-text-student">
                    {isAiSpeaking ? 'Speaking...' : isVoiceEnabled ? 'Voice On' : 'Enable Voice'}
                  </span>
                </button>
                
                <button
                  onClick={() => setIsAiGreetingVisible(false)}
                  className="close-btn-student"
                >
                  <ChevronRight className="icon-xs close-icon-student" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="main-content-student">
        {/* Stats Cards */}
        <div className="stats-grid-student">
          <div className="stat-card-student">
            <div className="stat-content-student">
              <div className="stat-info-student">
                <p className="stat-label-student">Enrolled Courses</p>
                <p className="stat-value-student">{enrolledCourses.length}</p>
              </div>
              <div className="stat-icon-student blue-student">
                <BookOpen className="icon-sm" />
              </div>
            </div>
          </div>
          
          <div className="stat-card-student">
            <div className="stat-content-student">
              <div className="stat-info-student">
                <p className="stat-label-student">Overall Progress</p>
                <p className="stat-value-student">{getOverallProgress()}%</p>
              </div>
              <div className="stat-icon-student green-student">
                <TrendingUp className="icon-sm" />
              </div>
            </div>
          </div>
          
          <div className="stat-card-student">
            <div className="stat-content-student">
              <div className="stat-info-student">
                <p className="stat-label-student">Due Assignments</p>
                <p className="stat-value-student">{getTotalDueAssignments()}</p>
              </div>
              <div className="stat-icon-student orange-student">
                <Clock className="icon-sm" />
              </div>
            </div>
          </div>
          
          <div className="stat-card-student">
            <div className="stat-content-student">
              <div className="stat-info-student">
                <p className="stat-label-student">Average Grade</p>
                <p className="stat-value-student">{getAverageGrade()}%</p>
              </div>
              <div className="stat-icon-student purple-student">
                <Award className="icon-sm" />
              </div>
            </div>
          </div>
        </div>

        {/* Course Grid */}
        <div className="courses-section-student">
          <div className="section-header-student">
            <div className="section-title-student">
              <h2 className="title-student">My Courses</h2>
              <p className="subtitle-student">Continue your learning journey</p>
            </div>
            <button
              className="browse-btn-student"
              onClick={() => navigate('/courses')}
            >
              <Search className="icon-xs" />
              <span>Browse Courses</span>
            </button>
          </div>

          {filteredCourses.length === 0 ? (
            <div className="empty-state-student">
              <BookOpen className="empty-icon-student" />
              <h3 className="empty-title-student">No courses enrolled yet</h3>
              <p className="empty-description-student">Start your learning journey by enrolling in your first course</p>
              <button
                className="empty-action-btn-student"
                onClick={() => navigate('/courses')}
              >
                Browse Available Courses
              </button>
            </div>
          ) : (
            <div className="courses-grid-student">
              {filteredCourses.map((course, index) => (
                <div key={course.id} className="course-card-student">
                  <div 
                    className="course-header-student"
                    style={{ background: getCourseGradient(course.id, index) }}
                  >
                    <div className="course-header-overlay-student"></div>
                    <div className="course-header-icon-student">
                      <BookOpen className="icon-sm" />
                    </div>
                    <div className="course-grade-badge-student">
                      <span className="grade-text-student">{course.grade}% avg</span>
                    </div>
                  </div>
                  
                  <div className="course-content-student">
                    <div className="course-title-section-student">
                      <h3 className="course-title-student">{course.title}</h3>
                      <ChevronRight className="course-arrow-student" />
                    </div>
                    
                    <p className="course-description-student">
                      {course.description.length > 40
                        ? (
                          <>
                            {course.description.slice(0, 30)}...
                            <button
                              className="desc-more-btn-student"
                              onClick={() => {
                                setDescOverlayText(course.description);
                                setShowDescOverlay(true);
                              }}
                            >More</button>
                          </>
                        )
                        : course.description
                      }
                    </p>
                    
                    <div className="course-details-student">
                      <div className="progress-section-student">
                        <div className="progress-header-student">
                          <span className="progress-label-student">Progress</span>
                          <span className="progress-value-student">{course.progress}%</span>
                        </div>
                        <div className="progress-bar-student">
                          <div
                            className="progress-fill-student"
                            style={{ width: `${course.progress}%` }}
                          ></div>
                        </div>
                      </div>
                      
                      <div className="course-stats-student">
                        <span className="lesson-count-student">
                          {course.completedLessons}/{course.totalLessons} lessons
                        </span>
                        <span className="last-accessed-student">
                          Last accessed {course.lastAccessed}
                        </span>
                      </div>
                      
                      <div className="course-footer-student">
                        {course.dueAssignments > 0 && (
                          <div className="due-assignments-student">
                            <Clock className="icon-xs" />
                            <span className="due-text-student">{course.dueAssignments} due</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <button 
                      className="continue-btn-student"
                      onClick={() => handleContinueLesson(course)}
                    >
                      <Play className="continue-icon-student" />
                      Continue: {course.nextLesson}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="quick-actions-grid-student">
          <div className="action-card-student">
            <div className="action-header-student">
              <div className="action-icon-student blue-student">
                <Calendar className="icon-xs" />
              </div>
              <h3 className="action-title-student">Upcoming Deadlines</h3>
            </div>
            <div className="action-content-student">
              <div className="deadline-item-student">
                <div className="deadline-info-student">
                  <p className="deadline-title-student">No upcoming assignments</p>
                  <p className="deadline-subtitle-student">You're all caught up!</p>
                </div>
              </div>
            </div>
          </div>

          <div className="action-card-student">
            <div className="action-header-student">
              <div className="action-icon-student green-student">
                <Star className="icon-xs" />
              </div>
              <h3 className="action-title-student">Recent Achievements</h3>
            </div>
            <div className="action-content-student">
              <div className="achievement-item-student">
                <div className="achievement-badge-student">
                  <Award className="icon-xs" />
                </div>
                <div className="achievement-info-student">
                  <p className="achievement-title-student">No achievements yet</p>
                  <p className="achievement-subtitle-student">Complete courses to earn achievements</p>
                </div>
              </div>
            </div>
          </div>

          <div className="action-card-student">
            <div className="action-header-student">
              <div className="action-icon-student purple-student">
                <Users className="icon-xs" />
              </div>
              <h3 className="action-title-student">Study Groups</h3>
            </div>
            <div className="action-content-student">
              <div className="study-group-info-student">
                <p className="study-group-title-student">No study groups yet</p>
                <p className="study-group-subtitle-student">Join or create a study group to collaborate</p>
              </div>
              <button className="study-group-btn-student">
                Find study groups →
              </button>
            </div>
          </div>
        </div>

        {/* Description Overlay */}
        {showDescOverlay && (
          <div className="desc-overlay-student">
            <div className="desc-modal-student">
              <button
                className="desc-close-btn-student"
                onClick={() => setShowDescOverlay(false)}
              >Close</button>
              <div className="desc-full-text-student">{descOverlayText}</div>
            </div>
          </div>
        )}
      </main>
    </>
  );
};

export default StudentDashboard;