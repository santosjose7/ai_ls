import axios from 'axios';

export const askQuestion = async (question) => {
  const res = await axios.post('/api/chat', { question });
  return res.data;
};
