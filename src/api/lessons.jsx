import axios from 'axios';

export const getCourseById = async (id) => {
  const res = await axios.get(`/api/courses/${id}`);
  return res.data;
};

export const getLessonsByCourseId = async (courseId) => {
  const res = await axios.get(`/api/lessons?course_id=${courseId}`);
  return res.data;
};
