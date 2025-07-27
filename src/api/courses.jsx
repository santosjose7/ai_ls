import axios from 'axios';

export const getCourses = async () => {
  const response = await axios.get('/api/courses');
  return response.data;
};
