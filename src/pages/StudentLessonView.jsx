import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../hooks/useAuth';
import '../styles/LessonDetails.css';
import { ElevenLabsClient } from "@elevenlabs/client";
import { ElevenLabsProvider, VoiceAssistant } from '@elevenlabs/react';

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
  const hardcodedLesson = location.state?.lessonData;
  if (hardcodedLesson) {
    setLesson(hardcodedLesson);
  } else {
     // fallback to backend
  }

  fetchLessonProgress();
  fetchUserNotes();
  fetchQuizData();
  fetchLessonNavigation();
  initializeSpeechRecognition();

  // Hardcoded lesson and user values
  const lesson = {
    id: "lesson 1",
    title: "Introduction to Fractions",
    content: "Fractions represent parts of a whole. For example, 1/2 means half.",
  };

  const user = {
    first_name: "Kevin"
  };


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
      <ElevenLabsProvider apiKey={import.meta.env.VITE_ELEVENLABS_API_KEY}>
        <main className="container-lessons-page">
          <div className="title-section">
            <div className="title-left">
              <h1 className="lesson-title">{lesson.title}</h1>
              {stats && (
                <div className="metadata">
                  <span className="metadata-item"><Eye size={16} />{stats.views} views</span>
                  <span className="metadata-item"><Clock size={16} />{stats.estimatedTime}</span>
                  <span className="metadata-item"><BarChart3 size={16} />{stats.difficulty}</span>
                  <span className="metadata-item"><Star size={16} />{stats.averageRating}/5 ({stats.totalRatings} reviews)</span>
                </div>
              )}
            </div>
            <div className="completion-section">
              {!isCompleted ? (
                <button onClick={markAsCompleted} className="complete-button">
                  <CheckCircle size={20} /> Mark as Complete
                </button>
              ) : (
                <div className="completed-badge">
                  <CheckCircle size={20} /> <span>Completed</span>
                </div>
              )}
            </div>
          </div>

          {/* Other content like navigation, tabs, quizzes, notes, etc. goes here... */}
        </main>

        <VoiceAssistant
          agentId="agent_1901k19k1133fydtqzvbewhd00qm"
          session={{
            user: { firstName: user?.first_name || "Student" },
            session: {
              lessonTitle: lesson?.title || "Untitled",
              lessonContent: lesson?.content || "No content available",
            },
          }}
          position="bottom-right"
          draggable
          showInitialMessage
        />
      </ElevenLabsProvider>
    </>
  );
};
export default StudentLessonView;