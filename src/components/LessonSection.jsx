import React, { useEffect, useState } from 'react';
import axios from 'axios';
import ChatInterface from './ChatInterface';

const LessonSection = ({ lesson, onComplete }) => {
  const [content, setContent] = useState('');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchLesson = async () => {
      try {
        const res = await axios.get(`/api/lessons/${lesson.id}`);
        setContent(res.data.content);
        setQuestion(res.data.question);
      } catch (err) {
        console.error('Error loading lesson:', err);
      }
    };

    fetchLesson();
  }, [lesson.id]);

  const handleSubmitAnswer = async () => {
    setIsSubmitting(true);
    try {
      const res = await axios.post(`/api/lessons/${lesson.id}/submit`, { answer });
      setFeedback(res.data.feedback);

      // Optional: mark lesson complete
      await axios.post(`/api/progress/${lesson.id}/complete`);
    } catch (err) {
      setFeedback('An error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="lesson-section">
      <h3>{lesson.title}</h3>
      <div className="lesson-content">
        <p>{content}</p>
      </div>

      <div className="lesson-question">
        <p><strong>Question:</strong> {question}</p>
        <input
          type="text"
          placeholder="Your answer"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
        />
        <button onClick={handleSubmitAnswer} disabled={isSubmitting}>
          Submit Answer
        </button>
        {feedback && <p className="feedback">{feedback}</p>}
      </div>

      <ChatInterface lessonId={lesson.id} />

      <button onClick={onComplete} className="back-btn">
        Back to Lessons
      </button>
    </div>
  );
};

export default LessonSection;
