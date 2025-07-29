import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Eye, Clock, BarChart3, Star, CheckCircle, ChevronLeft, ChevronRight, Bot,
  X, MicOff, Mic, RefreshCw, Send, Play, Maximize2, Minimize2, PauseCircle,
  PlayCircle, Volume2, Hand, Brain, Zap, Award, Plus, BookOpen, SkipBack,
  SkipForward, MessageSquare
} from 'lucide-react';
import { ElevenLabsProvider, VoiceAssistant } from '@elevenlabs/react';

const StudentLessonView = ({ user }) => {
  const location = useLocation();
  const [lesson, setLesson] = useState({ title: '', content: '', image_url: '', audio_url: '', video_url: '' });
  const [stats, setStats] = useState(null);
  const [lessonNavigation, setLessonNavigation] = useState(null);
  const [activeTab, setActiveTab] = useState('content');
  const [isCompleted, setIsCompleted] = useState(false);
  const [isAiTeaching, setIsAiTeaching] = useState(false);
  const [isAiInterrupted, setIsAiInterrupted] = useState(false);
  const [aiAvatarMinimized, setAiAvatarMinimized] = useState(false);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [aiTeachingProgress, setAiTeachingProgress] = useState(0);
  const [aiTeachingText, setAiTeachingText] = useState('');
  const [aiInterruptQuery, setAiInterruptQuery] = useState('');
  const [showInterruptDialog, setShowInterruptDialog] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [quizData, setQuizData] = useState(null);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [freeFormAnswers, setFreeFormAnswers] = useState({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState(0);
  const [aiQuizFeedback, setAiQuizFeedback] = useState({});
  const [notes, setNotes] = useState('');
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const BASE_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    const hardcodedLesson = location.state?.lessonData;
    if (hardcodedLesson) {
      setLesson(hardcodedLesson);
    }
  }, [location]);

  const markAsCompleted = () => setIsCompleted(true);
  const goToPreviousLesson = () => {};
  const goToNextLesson = () => {};
  const startListening = () => setIsListening(true);
  const stopListening = () => setIsListening(false);
  const handleInterruptQuery = () => {};
  const resumeAiTeaching = () => setIsAiInterrupted(false);
  const interruptAiTeaching = () => setShowInterruptDialog(true);
  const stopAiTeaching = () => setIsAiTeaching(false);
  const startAiTeaching = () => setIsAiTeaching(true);
  const submitRating = (star) => {};
  const generateAiQuiz = () => {};
  const handleAnswerSelect = (qIndex, oIndex) => {};
  const handleFreeFormAnswer = (qIndex, value) => {};
  const submitQuiz = () => {};
  const resetQuiz = () => {};
  const saveNotes = () => {};

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

          <div className="tab-navigation">
            {['content', 'quiz', 'notes', 'discussion'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`tab-button ${activeTab === tab ? 'active' : ''}`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          <div className="tab-content">
            {activeTab === 'content' && (
              <div className="lesson-content">
                {lesson.content.split(/\n\s*\n|\n/).map((section, idx) => (
                  <div key={idx} className={`content-section color-${idx % 4}`}>
                    {section}
                  </div>
                ))}
              </div>
            )}
            {activeTab === 'notes' && (
              <div className="notes-section">
                <h3>Notes</h3>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
                <button onClick={saveNotes}>Save Notes</button>
              </div>
            )}
            {activeTab === 'discussion' && (
              <div className="discussion-section">
                <h3>Discussion</h3>
                <p>Coming soon...</p>
              </div>
            )}
            {activeTab === 'quiz' && (
              <div className="quiz-section">
                <h3>Quiz</h3>
                <p>Quiz functionality not implemented in this version.</p>
              </div>
            )}
          </div>
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
