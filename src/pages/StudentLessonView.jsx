import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../hooks/useAuth';
import '../styles/LessonDetails.css';
import { ElevenLabsClient } from "@elevenlabs/client";


import { 
  BookOpen, 
  LogOut, 
  ChevronLeft, 
  Loader,
  Eye,
  Clock,
  BarChart3,
  CheckCircle,
  Star,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Share2,
  Download,
  Play,
  Pause,
  Volume2,
  VolumeX,
  SkipBack,
  SkipForward,
  Bookmark,
  BookmarkCheck,
  Bot,
  FileText,
  Send,
  RefreshCw,
  Award,
  Mic,
  MicOff,
  Square,
  PlayCircle,
  PauseCircle,
  X,
  Minimize2,
  Maximize2,
  Hand,
  ChevronRight,
  Zap,
  Brain,
  Plus
} from 'lucide-react';

const StudentLessonView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { token, user, logout } = useAuth();

  const client = new ElevenLabsClient({
    apiKey: import.meta.env.VITE_ELEVENLABS_API_KEY,
  });
  const [lesson, setLesson] = useState(null);
  const [activeTab, setActiveTab] = useState('content');
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [stats, setStats] = useState(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [rating, setRating] = useState(0);
  const [userRating, setUserRating] = useState(0);
  const [notes, setNotes] = useState('');
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const [isReading, setIsReading] = useState(false);
  
  // AI Teaching Assistant State
  const [aiQuery, setAiQuery] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [aiChatHistory, setAiChatHistory] = useState([]);
  
  // AI Teaching on Content Tab State
  const [isAiTeaching, setIsAiTeaching] = useState(false);
  const [aiTeachingText, setAiTeachingText] = useState('');
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [aiAvatarMinimized, setAiAvatarMinimized] = useState(false);
  const [aiTeachingProgress, setAiTeachingProgress] = useState(0);
  const [isAiInterrupted, setIsAiInterrupted] = useState(false);
  const [aiInterruptQuery, setAiInterruptQuery] = useState('');
  const [showInterruptDialog, setShowInterruptDialog] = useState(false);
  
  // Voice features
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [recognition, setRecognition] = useState(null);
  const [speechSupported, setSpeechSupported] = useState(false);
  
  // Quiz/Test State
  const [quizData, setQuizData] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [freeFormAnswers, setFreeFormAnswers] = useState({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState(0);
  const [showQuizResults, setShowQuizResults] = useState(false);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [aiQuizFeedback, setAiQuizFeedback] = useState({});

  // Navigation State
  const [lessonNavigation, setLessonNavigation] = useState(null);

  // Refs
  const utteranceRef = useRef(null);
  const progressIntervalRef = useRef(null);

  // Get course context from navigation state
  useEffect(() => {
  const fetchSignedUrl = async () => {
    const client = new ElevenLabsClient({ apiKey: import.meta.env.VITE_ELEVENLABS_API_KEY });
    
    const { signedUrl } = await client.conversationalAi.conversations.getSignedUrl({
      agentId: "agent_1901k19k1133fydtqzvbewhd00qm",
      sessionId: `lesson_${lesson.id}_${user.first_name}`,
      user: { firstName: user.first_name },
      session: {
        lessonTitle: lesson.title,
        lessonContent: lesson.content,
      },
    });

    console.log("Signed URL:", signedUrl);
    // use signedUrl in WebSocket or however you want
  };

  if (lesson?.title && user?.first_name) {
    fetchSignedUrl();
  }
}, [lesson, user]);

 
 useEffect(() => {
  const hardcodedLesson = location.state?.lessonData;
  if (hardcodedLesson) {
    setLesson(hardcodedLesson);
  } else {
    fetchLesson(); // fallback to backend
  }

  fetchLessonProgress();
  fetchUserNotes();
  fetchQuizData();
  fetchLessonNavigation();
  initializeSpeechRecognition();

  return () => {
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    window.speechSynthesis.cancel();
  };
}, [id]);


  // Initialize Speech Recognition
  const initializeSpeechRecognition = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognitionInstance = new SpeechRecognition();
      
      recognitionInstance.continuous = false;
      recognitionInstance.interimResults = false;
      recognitionInstance.lang = 'en-US';
      
      recognitionInstance.onstart = () => {
        setIsListening(true);
      };
      
      recognitionInstance.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        if (showInterruptDialog) {
          setAiInterruptQuery(transcript);
        } else {
          setAiQuery(transcript);
        }
        setIsListening(false);
      };
      
      recognitionInstance.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };
      
      recognitionInstance.onend = () => {
        setIsListening(false);
      };
      
      setRecognition(recognitionInstance);
      setSpeechSupported(true);
    } else {
      setSpeechSupported(false);
      console.log('Speech recognition not supported');
    }
  };

  const fetchLesson = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/lessons/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setLesson(res.data);
      
      // Fetch lesson stats
      try {
        const statsRes = await axios.get(`${API_BASE}/api/lessons/${id}/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setStats(statsRes.data);
      } catch (error) {
        console.error('Error fetching lesson stats:', error);
        setStats(null);
      }
    } catch (error) {
      console.error('Error fetching lesson:', error);
    }
  };

  const fetchLessonProgress = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/lessons/${id}/progress`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setIsCompleted(res.data.completed);
      setIsBookmarked(res.data.bookmarked);
      setUserRating(res.data.rating || 0);
    } catch (error) {
      console.error('Error fetching lesson progress:', error);
    }
  };

  const fetchUserNotes = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/lessons/${id}/notes`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotes(res.data.notes || '');
    } catch (error) {
      console.error('Error fetching user notes:', error);
    }
  };

  const fetchQuizData = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/lessons/${id}/quiz`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setQuizData(res.data);
    } catch (error) {
      console.error('Error fetching quiz data:', error);
    }
  };

  const fetchLessonNavigation = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/lessons/${id}/navigation`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setLessonNavigation(res.data);
    } catch (error) {
      console.error('Error fetching lesson navigation:', error);
      setLessonNavigation(null);
    }
  };

  const markAsCompleted = async () => {
    try {
      await axios.post(`${API_BASE}/api/lessons/${id}/complete`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setIsCompleted(true);
    } catch (error) {
      console.error('Error marking lesson as completed:', error);
    }
  };

  const toggleBookmark = async () => {
    try {
      const res = await axios.post(`${API_BASE}/api/lessons/${id}/bookmark`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setIsBookmarked(res.data.bookmarked);
    } catch (error) {
      console.error('Error toggling bookmark:', error);
    }
  };

  const shareLesson = async () => {
    try {
      const shareUrl = `${window.location.origin}/lesson/${id}`;
      
      if (navigator.share) {
        await navigator.share({
          title: lesson.title,
          text: `Check out this lesson: ${lesson.title}`,
          url: shareUrl,
        });
      } else {
        // Fallback to clipboard
        await navigator.clipboard.writeText(shareUrl);
        alert('Lesson URL copied to clipboard!');
      }
    } catch (error) {
      console.error('Error sharing lesson:', error);
      // Fallback to clipboard
      try {
        const shareUrl = `${window.location.origin}/lesson/${id}`;
        await navigator.clipboard.writeText(shareUrl);
        alert('Lesson URL copied to clipboard!');
      } catch (clipboardError) {
        console.error('Error copying to clipboard:', clipboardError);
      }
    }
  };

  const submitRating = async (newRating) => {
    try {
      await axios.post(`${API_BASE}/api/lessons/${id}/rate`, { rating: newRating }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUserRating(newRating);
    } catch (error) {
      console.error('Error submitting rating:', error);
    }
  };

  const saveNotes = async () => {
    try {
      await axios.post(`${API_BASE}/api/lessons/${id}/notes`, { notes }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert('Notes saved successfully!');
    } catch (error) {
      console.error('Error saving notes:', error);
      alert('Error saving notes. Please try again.');
    }
  };

  // AI Teaching Functions for Content Tab
  const startAiTeaching = async () => {
    if (isAiTeaching) {
      stopAiTeaching();
      return;
    }

    setIsAiTeaching(true);
    setIsLoadingAi(true);
    setIsAiInterrupted(false);
    
    try {
      const response = await axios.post(`${API_BASE}/api/ai/teach-lesson`, {
        lessonId: id,
        lessonContent: lesson?.content,
        lessonTitle: lesson?.title
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      const teachingContent = response.data.teachingContent;
      setAiTeachingText(teachingContent);
      
      speakAiTeaching(teachingContent);
      
    } catch (error) {
      console.error('Error starting AI teaching:', error);
      alert('AI teaching service unavailable. Please try again later.');
      setIsAiTeaching(false);
    } finally {
      setIsLoadingAi(false);
    }
  };

  const stopAiTeaching = () => {
    setIsAiTeaching(false);
    setIsAiSpeaking(false);
    setAiTeachingProgress(0);
    setIsAiInterrupted(false);
    setShowInterruptDialog(false);
    
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }
    
    if (utteranceRef.current) {
      window.speechSynthesis.cancel();
      utteranceRef.current = null;
    }
  };

  const interruptAiTeaching = () => {
    if (isAiTeaching && isAiSpeaking) {
      window.speechSynthesis.cancel();
      setIsAiSpeaking(false);
      setIsAiInterrupted(true);
      setShowInterruptDialog(true);
    }
  };

  const handleInterruptQuery = async () => {
    if (!aiInterruptQuery.trim()) return;
    
    setIsLoadingAi(true);
    setShowInterruptDialog(false);
    
    try {
      const response = await axios.post(`${API_BASE}/api/ai/interrupt-teaching`, {
        lessonId: id,
        query: aiInterruptQuery,
        teachingContext: aiTeachingText,
        lessonContent: lesson?.content
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      const interruptResponse = response.data.response;
      
      // Speak the interrupt response
      speakText(interruptResponse);
      
      // Add to chat history for reference
      const newInterrupt = {
        id: Date.now(),
        type: 'interrupt',
        query: aiInterruptQuery,
        response: interruptResponse,
        timestamp: new Date()
      };
      
      setAiChatHistory(prev => [...prev, newInterrupt]);
      setAiInterruptQuery('');
      
    } catch (error) {
      console.error('Error handling interrupt query:', error);
      alert('Unable to process your question. Please try again.');
    } finally {
      setIsLoadingAi(false);
      setIsAiInterrupted(false);
    }
  };

  const resumeAiTeaching = () => {
    if (isAiInterrupted && aiTeachingText) {
      setIsAiInterrupted(false);
      setShowInterruptDialog(false);
      speakAiTeaching(aiTeachingText);
    }
  };

  const speakAiTeaching = (text) => {
    if (!text) return;
    
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.8;
    utterance.pitch = 1;
    utterance.volume = 1;
    
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(voice => 
      voice.name.includes('Google') || 
      voice.name.includes('Microsoft') ||
      voice.lang.startsWith('en')
    );
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }
    
    utterance.onstart = () => {
      setIsAiSpeaking(true);
    };
    
    utterance.onend = () => {
      setIsAiSpeaking(false);
      if (!isAiInterrupted) {
        setIsAiTeaching(false);
        setAiTeachingProgress(100);
      }
    };
    
    utterance.onerror = () => {
      setIsAiSpeaking(false);
      setIsAiTeaching(false);
    };

    // Track progress
    let progress = 0;
    progressIntervalRef.current = setInterval(() => {
      if (progress < 95 && !isAiInterrupted) {
        progress += 1;
        setAiTeachingProgress(progress);
      } else {
        clearInterval(progressIntervalRef.current);
      }
    }, (utterance.text.length * 80) / 95);
    
    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  // Generate AI Quiz
  const generateAiQuiz = async () => {
    setIsGeneratingQuiz(true);
    
    try {
      const response = await axios.post(`${API_BASE}/api/ai/generate-quiz`, {
        lessonId: id,
        lessonContent: lesson?.content,
        lessonTitle: lesson?.title,
        questionCount: 10,
        includeMultipleChoice: true,
        includeFreeForm: true
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      setQuizData(response.data);
      setSelectedAnswers({});
      setFreeFormAnswers({});
      setQuizSubmitted(false);
      setShowQuizResults(false);
      setQuizScore(0);
      setAiQuizFeedback({});
      
    } catch (error) {
      console.error('Error generating AI quiz:', error);
      alert('Unable to generate quiz. Please try again later.');
    } finally {
      setIsGeneratingQuiz(false);
    }
  };

  // AI Teaching Assistant Functions (for AI Assistant Tab)
  const handleAiQuery = async () => {
    if (!aiQuery.trim()) return;
    
    setIsLoadingAi(true);
    try {
      const response = await axios.post(`/api/ai/teach`, {
        lessonId: id,
        query: aiQuery,
        lessonContext: lesson?.content,
        chatHistory: aiChatHistory
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      const newMessage = {
        id: Date.now(),
        type: 'user',
        message: aiQuery,
        timestamp: new Date()
      };
      
      const aiReply = {
        id: Date.now() + 1,
        type: 'ai',
        message: response.data.response,
        timestamp: new Date()
      };
      
      setAiChatHistory(prev => [...prev, newMessage, aiReply]);
      setAiQuery('');
      setAiResponse(response.data.response);
      
      speakText(response.data.response);
      
    } catch (error) {
      console.error('Error querying AI assistant:', error);
      alert('AI assistant is currently unavailable. Please try again later.');
    } finally {
      setIsLoadingAi(false);
    }
  };

  // Voice Input Functions
  const startListening = () => {
    if (recognition && !isListening) {
      recognition.start();
    }
  };

  const stopListening = () => {
    if (recognition && isListening) {
      recognition.stop();
    }
  };

  // Voice Output Functions
  const speakText = async (text) => {
    if (!text) return;

    try {
      const response = await axios.post(
        `${API_BASE}/api/tts`,
        { text },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          responseType: 'blob', // get audio as binary
        }
      );

      const audioBlob = new Blob([response.data], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);

      audio.onplay = () => setIsSpeaking(true);
      audio.onended = () => setIsSpeaking(false);
      audio.onerror = () => setIsSpeaking(false);

      audio.play();
    } catch (error) {
      console.error('Error playing ElevenLabs TTS audio:', error);
      setIsSpeaking(false);
    }
  };


  // Quiz Functions
  const handleAnswerSelect = (questionIndex, answerIndex) => {
    setSelectedAnswers(prev => ({
      ...prev,
      [questionIndex]: answerIndex
    }));
  };

  const handleFreeFormAnswer = (questionIndex, answer) => {
    setFreeFormAnswers(prev => ({
      ...prev,
      [questionIndex]: answer
    }));
  };

  const submitQuiz = async () => {
    try {
      const response = await axios.post(`${API_BASE}/api/lessons/${id}/quiz/submit`, {
        multipleChoiceAnswers: selectedAnswers,
        freeFormAnswers: freeFormAnswers,
        quizData: quizData
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      setQuizScore(response.data.score);
      setAiQuizFeedback(response.data.feedback);
      setQuizSubmitted(true);
      setShowQuizResults(true);
      
    } catch (error) {
      console.error('Error submitting quiz:', error);
      alert('Error submitting quiz. Please try again.');
    }
  };

  const resetQuiz = () => {
    setSelectedAnswers({});
    setFreeFormAnswers({});
    setQuizSubmitted(false);
    setShowQuizResults(false);
    setCurrentQuestion(0);
    setQuizScore(0);
    setAiQuizFeedback({});
  };

  const goToDashboard = () => {
    if (courseContext.fromDashboard) {
      navigate(-1);
    } else {
      navigate('/dashboard');
    }
  };

  const navigateToLesson = (lessonId) => {
    navigate(`/lesson/${lessonId}`, { 
      state: courseContext 
    });
  };

  const goToPreviousLesson = () => {
    if (lessonNavigation?.previousLesson) {
      navigateToLesson(lessonNavigation.previousLesson.id);
    }
  };

  const goToNextLesson = () => {
    if (lessonNavigation?.nextLesson) {
      navigateToLesson(lessonNavigation.nextLesson.id);
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
                <button onClick={goToDashboard} className="back-button">
                  <ChevronLeft size={22} />
                  {courseContext.fromDashboard ? 'Dashboard' : 'Back'}
                </button>
                {courseContext.courseTitle && (
                  <p className="course-breadcrumb">{courseContext.courseTitle}</p>
                )}
              </div>
            </div>
          </div>
          
          <div className="header-right">
            <div className="lesson-actions">
              <button
                onClick={toggleBookmark}
                className={`action-button ${isBookmarked ? 'bookmarked' : ''}`}
                title={isBookmarked ? 'Remove bookmark' : 'Bookmark lesson'}
              >
                {isBookmarked ? <BookmarkCheck size={20} color='blue'/> : <Bookmark size={20} color='blue'/>}
              </button>
              
              <button
                onClick={shareLesson}
                className="action-button"
                title="Share lesson"
              >
                <Share2 size={20} color='blue' />
              </button>
            </div>
            
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
          <div className="title-left">
            <h1 className="lesson-title">{lesson.title}</h1>
            {stats && (
              <div className="metadata">
                <span className="metadata-item">
                  <Eye className="metadata-icon" size={16} />
                  {stats.views} views
                </span>
                <span className="metadata-item">
                  <Clock className="metadata-icon" size={16} />
                  {stats.estimatedTime}
                </span>
                <span className="metadata-item">
                  <BarChart3 className="metadata-icon" size={16} />
                  {stats.difficulty}
                </span>
                <span className="metadata-item">
                  <Star className="metadata-icon" size={16} />
                  {stats.averageRating}/5 ({stats.totalRatings} reviews)
                </span>
              </div>
            )}
          </div>
          
          <div className="completion-section">
            {!isCompleted ? (
              <button onClick={markAsCompleted} className="complete-button">
                <CheckCircle size={20} />
                Mark as Complete
              </button>
            ) : (
              <div className="completed-badge">
                <CheckCircle size={20} />
                <span>Completed</span>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Buttons */}
        {lessonNavigation && (
          <div className="lesson-nav-top">
            <button 
              className="nav-button-top prev-button"
              onClick={goToPreviousLesson}
              disabled={!lessonNavigation.previousLesson}
            >
              <ChevronLeft size={16} />
              Previous
            </button>
            
            <span className="lesson-position">
              Lesson {lessonNavigation.currentPosition} of {lessonNavigation.totalLessons}
            </span>
            
            <button 
              className="nav-button-top next-button"
              onClick={goToNextLesson}
              disabled={!lessonNavigation.nextLesson}
            >
              Next
              <ChevronRight size={16} />
            </button>
          </div>
        )}

        {/* Tab Navigation */}
        <nav className="tab-navigation">
          {['content', 'ai-assistant', 'quiz', 'notes', 'discussion'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`tab-button ${activeTab === tab ? 'active' : ''}`}
            >
              {tab === 'ai-assistant' ? 'AI Assistant' : 
               tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>

        {/* AI Interrupt Dialog */}
        {showInterruptDialog && (
          <div className="interrupt-dialog-overlay">
            <div className="interrupt-dialog">
              <div className="interrupt-header">
                <Bot size={24} />
                <h3>Ask me anything</h3>
                <button onClick={() => setShowInterruptDialog(false)}>
                  <X size={20} />
                </button>
              </div>
              <div className="interrupt-content">
                <div className="interrupt-input-wrapper">
                  <input
                    type="text"
                    value={aiInterruptQuery}
                    onChange={(e) => setAiInterruptQuery(e.target.value)}
                    placeholder={isListening ? "Listening..." : "What would you like to know?"}
                    className={`interrupt-input ${isListening ? 'listening' : ''}`}
                    onKeyPress={(e) => e.key === 'Enter' && handleInterruptQuery()}
                    disabled={isLoadingAi || isListening}
                    autoFocus
                  />
                  <div className="interrupt-controls">
                    {speechSupported && (
                      <button
                        onClick={isListening ? stopListening : startListening}
                        className={`voice-button ${isListening ? 'listening' : ''}`}
                        disabled={isLoadingAi}
                      >
                        {isListening ? <MicOff size={20} /> : <Mic size={20} />}
                      </button>
                    )}
                    <button
                      onClick={handleInterruptQuery}
                      className="send-button"
                      disabled={isLoadingAi || !aiInterruptQuery.trim() || isListening}
                    >
                      {isLoadingAi ? <RefreshCw className="spinning" size={20} /> : <Send size={20} />}
                    </button>
                  </div>
                </div>
                <div className="interrupt-actions">
                  <button onClick={resumeAiTeaching} className="resume-button">
                    <Play size={16} />
                    Resume Teaching
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Floating AI Avatar (only on content tab) */}
        {activeTab === 'content' && (
          <div className={`floating-ai-avatar ${aiAvatarMinimized ? 'minimized' : ''}`}>
            <div className="ai-avatar-container">
              <div className="ai-avatar-header">
                <div className="ai-avatar-info">
                  <Bot className="ai-avatar-icon" size={24} />
                  <div className="ai-avatar-text">
                    <span className="ai-avatar-name">AI Teacher</span>
                    {isAiTeaching && (
                      <span className="ai-avatar-status">
                        {isAiInterrupted ? 'Paused' : 'Teaching...'}
                      </span>
                    )}
                  </div>
                </div>
                <div className="ai-avatar-controls">
                  {isAiTeaching && !isAiInterrupted && (
                    <button
                      onClick={interruptAiTeaching}
                      className="ai-control-button interrupt-button"
                      title="Ask a question"
                    >
                      <Hand size={16} />
                    </button>
                  )}
                  <button
                    onClick={() => setAiAvatarMinimized(!aiAvatarMinimized)}
                    className="ai-control-button"
                    title={aiAvatarMinimized ? 'Expand' : 'Minimize'}
                  >
                    {aiAvatarMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
                  </button>
                  <button
                    onClick={stopAiTeaching}
                    className="ai-control-button"
                    title="Close AI Teacher"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {!aiAvatarMinimized && (
                <div className="ai-avatar-content">
                  <div className="ai-play-controls">
                    <button
                      onClick={startAiTeaching}
                      className={`ai-play-button ${isAiTeaching ? 'active' : ''}`}
                      disabled={isLoadingAi}
                      title={isAiTeaching ? 'Stop AI Teaching' : 'Start AI Teaching'}
                    >
                      {isLoadingAi ? (
                        <RefreshCw className="spinning" size={24} />
                      ) : isAiTeaching ? (
                        <PauseCircle size={32} />
                      ) : (
                        <PlayCircle size={32} />
                      )}
                    </button>
                    <div className="ai-play-text">
                      {isLoadingAi ? 'Preparing...' :
                       isAiTeaching ? 'Stop Teaching' : 'Start AI Teaching'}
                    </div>
                  </div>

                  {isAiTeaching && (
                    <div className="ai-teaching-progress">
                      <div className="progress-bar">
                        <div 
                          className="progress-fill" 
                          style={{ width: `${aiTeachingProgress}%` }}
                        />
                      </div>
                      <div className="ai-teaching-indicators">
                        <div className={`teaching-indicator ${isAiSpeaking ? 'active' : ''}`}>
                          <Volume2 size={16} />
                          {isAiInterrupted ? 'Paused' : 'Speaking'}
                        </div>
                        {isAiTeaching && !isAiInterrupted && (
                          <div className="interrupt-hint">
                            <Hand size={14} />
                            Tap to ask questions
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {aiTeachingText && (
                    <div className="ai-teaching-transcript">
                      <p>{aiTeachingText}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab Content */}
        <div className="tab-content">
          {activeTab === 'content' && (
            <div className="content-tab">
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
                      <h4 className="media-title">Visual Guide</h4>
                      <img src={`${BASE_URL}${lesson.image_url}`} alt="Lesson visual" className="image" />
                    </div>
                  )}
                  {lesson.audio_url && (
                    <div className="media-item">
                      <h4 className="media-title">Audio Content</h4>
                      <div className="audio-player">
                        <audio 
                          controls 
                          src={`${BASE_URL}${lesson.audio_url}`} 
                          className="audio"
                          onTimeUpdate={(e) => setAudioCurrentTime(e.target.currentTime)}
                          onLoadedMetadata={(e) => setAudioDuration(e.target.duration)}
                        />
                      </div>
                    </div>
                  )}
                  {lesson.video_url && (
                    <div className="media-item">
                      <h4 className="media-title">Video Tutorial</h4>
                      <video controls src={`${BASE_URL}${lesson.video_url}`} className="video" />
                    </div>
                  )}
                </div>

                {/* Rating Section */}
                <div className="rating-section">
                  <h3 className="rating-title">Rate this lesson</h3>
                  <div className="star-rating">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => submitRating(star)}
                        className={`star-button ${star <= userRating ? 'active' : ''}`}
                      >
                        <Star size={24} fill={star <= userRating ? '#ffd700' : 'none'} />
                      </button>
                    ))}
                  </div>
                  {userRating > 0 && (
                    <p className="rating-feedback">Thanks for rating this lesson!</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'ai-assistant' && (
            <div className="ai-assistant-tab">
              <div className="ai-assistant-container">
                <div className="ai-header">
                  <Bot className="ai-icon" size={24} />
                  <h3 className="ai-title">AI Teaching Assistant</h3>
                  <p className="ai-subtitle">Ask me anything about this lesson!</p>
                </div>

                <div className="ai-chat-container">
                  <div className="ai-chat-history">
                    {aiChatHistory.length === 0 ? (
                      <div className="ai-welcome">
                        <p>👋 Hi! I'm your AI teaching assistant. I can help you:</p>
                        <ul>
                          <li>Explain complex concepts from this lesson</li>
                          <li>Provide additional examples</li>
                          <li>Answer your questions</li>
                          <li>Create practice problems</li>
                        </ul>
                        <p>What would you like to learn about?</p>
                      </div>
                    ) : (
                      aiChatHistory.map((chat) => (
                        <div key={chat.id} className={`chat-message ${chat.type}`}>
                          <div className="message-content">
                            {chat.type === 'interrupt' ? (
                              <div className="interrupt-message">
                                <div className="interrupt-query">
                                  <strong>Question:</strong> {chat.query}
                                </div>
                                <div className="interrupt-response">
                                  <strong>Answer:</strong> {chat.response}
                                </div>
                              </div>
                            ) : (
                              <p>{chat.message}</p>
                            )}
                            <div className="message-actions">
                              <span className="message-time">
                                {chat.timestamp.toLocaleTimeString()}
                              </span>
                              {(chat.type === 'ai' || chat.type === 'interrupt') && (
                                <button
                                  onClick={() => speakText(chat.response || chat.message)}
                                  className="speak-button"
                                  title="Listen to response"
                                  disabled={isSpeaking}
                                >
                                  <Volume2 size={16} />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="ai-input-container">
                    <div className="ai-voice-controls">
                      {isSpeaking && (
                        <button
                          onClick={stopSpeaking}
                          className="voice-control-button stop-speaking"
                          title="Stop speaking"
                        >
                          <Square size={20} />
                          Stop
                        </button>
                      )}
                    </div>

                    <div className="ai-input-wrapper">
                      <input
                        type="text"
                        value={aiQuery}
                        onChange={(e) => setAiQuery(e.target.value)}
                        placeholder={isListening ? "Listening..." : "Ask about this lesson..."}
                        className={`ai-input ${isListening ? 'listening' : ''}`}
                        onKeyPress={(e) => e.key === 'Enter' && handleAiQuery()}
                        disabled={isLoadingAi || isListening}
                      />
                      
                      <div className="input-controls">
                        {speechSupported && (
                          <button
                            onClick={isListening ? stopListening : startListening}
                            className={`voice-input-button ${isListening ? 'listening' : ''}`}
                            title={isListening ? "Stop listening" : "Voice input"}
                            disabled={isLoadingAi}
                          >
                            {isListening ? (
                              <MicOff size={20} />
                            ) : (
                              <Mic size={20} />
                            )}
                          </button>
                        )}
                        
                        <button
                          onClick={handleAiQuery}
                          className="ai-send-button"
                          disabled={isLoadingAi || !aiQuery.trim() || isListening}
                        >
                          {isLoadingAi ? (
                            <RefreshCw className="spinning" size={20} />
                          ) : (
                            <Send size={20} />
                          )}
                        </button>
                      </div>
                    </div>
                    
                    <div className="ai-suggestions">
                      <button onClick={() => setAiQuery("Can you explain this concept in simpler terms?")}>
                        Explain simply
                      </button>
                      <button onClick={() => setAiQuery("Give me an example of this concept")}>
                        Show example
                      </button>
                      <button onClick={() => setAiQuery("Create a practice question")}>
                        Practice question
                      </button>
                      <button onClick={() => setAiQuery("What are the key takeaways from this lesson?")}>
                        Key takeaways
                      </button>
                      <button onClick={() => setAiQuery("How does this apply in real life?")}>
                        Real applications
                      </button>
                      <button onClick={() => setAiQuery("What should I study next?")}>
                        Study guide
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'quiz' && (
            <div className="quiz-tab">
              <div className="quiz-container">
                {!quizData ? (
                  <div className="quiz-placeholder">
                    <div className="quiz-empty-state">
                      <Brain size={48} className="quiz-icon" />
                      <h3 className="quiz-title">No Quiz Available</h3>
                      <p className="quiz-text">
                        Generate an AI-powered quiz to test your understanding of this lesson.
                      </p>
                      <button 
                        onClick={generateAiQuiz}
                        className="generate-quiz-button"
                        disabled={isGeneratingQuiz}
                      >
                        {isGeneratingQuiz ? (
                          <>
                            <RefreshCw className="spinning" size={20} />
                            Generating Quiz...
                          </>
                        ) : (
                          <>
                            <Zap size={20} />
                            Generate AI Quiz
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ) : !showQuizResults ? (
                  <div className="quiz-content">
                    <div className="quiz-header">
                      <h3 className="quiz-title">AI Generated Quiz</h3>
                      <p className="quiz-subtitle">
                        Test your understanding of this lesson
                      </p>
                      <div className="quiz-progress">
                        <span>Questions: {quizData.questions?.length || 0}</span>
                        <span>Mixed Format: Multiple Choice & Free Form</span>
                      </div>
                    </div>

                    <div className="quiz-questions">
                      {quizData.questions?.map((question, qIndex) => (
                        <div key={qIndex} className="question-container">
                          <h4 className="question-title">
                            Question {qIndex + 1}: {question.question}
                          </h4>
                          
                          {question.type === 'multiple-choice' ? (
                            <div className="answers-grid">
                              {question.options?.map((option, oIndex) => (
                                <button
                                  key={oIndex}
                                  onClick={() => handleAnswerSelect(qIndex, oIndex)}
                                  className={`answer-option ${
                                    selectedAnswers[qIndex] === oIndex ? 'selected' : ''
                                  }`}
                                  disabled={quizSubmitted}
                                >
                                  <span className="answer-letter">
                                    {String.fromCharCode(65 + oIndex)}
                                  </span>
                                  <span className="answer-text">{option}</span>
                                </button>
                              ))}
                            </div>
                          ) : (
                            <div className="free-form-answer">
                              <textarea
                                value={freeFormAnswers[qIndex] || ''}
                                onChange={(e) => handleFreeFormAnswer(qIndex, e.target.value)}
                                placeholder="Type your answer here..."
                                className="free-form-textarea"
                                rows={4}
                                disabled={quizSubmitted}
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="quiz-actions">
                      <button
                        onClick={submitQuiz}
                        className="submit-quiz-button"
                        disabled={
                          Object.keys(selectedAnswers).length + Object.keys(freeFormAnswers).length !== quizData.questions?.length
                        }
                      >
                        <Award size={20} />
                        Submit Quiz
                      </button>
                      <button 
                        onClick={generateAiQuiz}
                        className="regenerate-quiz-button"
                        disabled={isGeneratingQuiz}
                      >
                        {isGeneratingQuiz ? (
                          <RefreshCw className="spinning" size={16} />
                        ) : (
                          <RefreshCw size={16} />
                        )}
                        Generate New Quiz
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="quiz-results">
                    <div className="results-header">
                      <Award size={48} className="results-icon" />
                      <h3 className="results-title">Quiz Complete!</h3>
                      <div className="score-display">
                        <span className="score-value">{quizScore}%</span>
                        <span className="score-label">Overall Score</span>
                      </div>
                    </div>

                    <div className="performance-breakdown">
                      <div className="performance-item">
                        <span className="performance-label">Correct Answers:</span>
                        <span className="performance-value">
                          {Math.round((quizScore / 100) * (quizData.questions?.length || 0))} / {quizData.questions?.length || 0}
                        </span>
                      </div>
                      <div className="performance-item">
                        <span className="performance-label">Performance:</span>
                        <span className={`performance-value ${
                          quizScore >= 80 ? 'excellent' : 
                          quizScore >= 60 ? 'good' : 'needs-improvement'
                        }`}>
                          {quizScore >= 80 ? 'Excellent!' : 
                           quizScore >= 60 ? 'Good Job!' : 'Keep Practicing!'}
                        </span>
                      </div>
                    </div>

                    {/* AI Feedback */}
                    {Object.keys(aiQuizFeedback).length > 0 && (
                      <div className="ai-feedback-section">
                        <h4 className="feedback-title">
                          <Bot size={20} />
                          AI Feedback
                        </h4>
                        <div className="feedback-items">
                          {Object.entries(aiQuizFeedback).map(([questionIndex, feedback]) => (
                            <div key={questionIndex} className="feedback-item">
                              <div className="feedback-question">
                                Question {parseInt(questionIndex) + 1}:
                              </div>
                              <div className="feedback-text">
                                {feedback}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="results-actions">
                      <button onClick={resetQuiz} className="retake-quiz-button">
                        <RefreshCw size={20} />
                        Retake Quiz
                      </button>
                      <button 
                        onClick={generateAiQuiz}
                        className="new-quiz-button"
                        disabled={isGeneratingQuiz}
                      >
                        <Plus size={20} />
                        Generate New Quiz
                      </button>
                      <button 
                        onClick={() => setActiveTab('content')} 
                        className="review-lesson-button"
                      >
                        <BookOpen size={20} />
                        Review Lesson
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'notes' && (
            <div className="notes-tab">
              <div className="notes-section">
                <h3 className="notes-title">My Notes</h3>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Take notes about this lesson..."
                  className="notes-textarea"
                  rows="10"
                />
                <button onClick={saveNotes} className="save-notes-button">
                  Save Notes
                </button>
              </div>
              
              <div className="study-tips">
                <h4 className="tips-title">Study Tips</h4>
                <ul className="tips-list">
                  <li>Take notes on key concepts as you learn</li>
                  <li>Practice the examples in your own environment</li>
                  <li>Review your notes before moving to the next lesson</li>
                  <li>Ask questions in the discussion section if you're stuck</li>
                  <li>Use the AI assistant to clarify difficult concepts</li>
                  <li>Take the quiz to test your understanding</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'discussion' && (
            <div className="discussion-tab">
              <div className="discussion-placeholder">
                <MessageSquare size={48} className="discussion-icon" />
                <h3 className="discussion-title">Discussion Coming Soon</h3>
                <p className="discussion-text">
                  Connect with other students, ask questions, and share insights about this lesson.
                </p>
                <button className="join-discussion-button">
                  Join the Discussion
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Footer */}
        {lessonNavigation && (
          <div className="lesson-navigation">
            <button 
              className="nav-button prev-button"
              onClick={goToPreviousLesson}
              disabled={!lessonNavigation.previousLesson}
            >
              <SkipBack size={20} />
              {lessonNavigation.previousLesson ? lessonNavigation.previousLesson.title : 'No Previous Lesson'}
            </button>
            
            <div className="lesson-progress">
              <span className="progress-text">
                Lesson {lessonNavigation.currentPosition} of {lessonNavigation.totalLessons}
              </span>
              <div className="progress-bar-nav">
                <div 
                  className="progress-fill-nav" 
                  style={{ width: `${(lessonNavigation.currentPosition / lessonNavigation.totalLessons) * 100}%` }}
                ></div>
              </div>
            </div>
            
            <button 
              className="nav-button next-button"
              onClick={goToNextLesson}
              disabled={!lessonNavigation.nextLesson}
            >
              {lessonNavigation.nextLesson ? lessonNavigation.nextLesson.title : 'No Next Lesson'}
              <SkipForward size={20} />
            </button>
          </div>
        )}
      </main>
    </>
  );
};

export default StudentLessonView;