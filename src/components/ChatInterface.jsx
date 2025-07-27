import React, { useState } from 'react';
import axios from 'axios';

const ChatInterface = ({ lessonId }) => {
  const [question, setQuestion] = useState('');
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleAsk = async () => {
    if (!question.trim()) return;

    setLoading(true);
    try {
      const res = await axios.post(`/api/chat/ask`, {
        lesson_id: lessonId,
        question,
      });

      setResponses((prev) => [
        ...prev,
        { type: 'user', text: question },
        { type: 'ai', text: res.data.answer },
      ]);

      setQuestion('');
    } catch (err) {
      setResponses((prev) => [
        ...prev,
        { type: 'user', text: question },
        { type: 'ai', text: 'Sorry, something went wrong.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chat-interface">
      <h4>Ask AI (Assistant)</h4>
      <div className="chat-box">
        {responses.map((msg, idx) => (
          <div key={idx} className={`message ${msg.type}`}>
            <span>{msg.text}</span>
          </div>
        ))}
      </div>

      <div className="chat-controls">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask something about this lesson..."
        />
        <button onClick={handleAsk} disabled={loading}>
          {loading ? 'Asking...' : 'Ask'}
        </button>
      </div>
    </div>
  );
};

export default ChatInterface;
