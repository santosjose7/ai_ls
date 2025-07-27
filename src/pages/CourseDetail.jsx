import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import LessonSection from '../components/LessonSection';
import ProgressBar from '../components/ProgressBar';

const CourseDetail = () => {
  const { courseId } = useParams();
  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [currentLesson, setCurrentLesson] = useState(null);

  useEffect(() => {
    const fetchCourseData = async () => {
      try {
        const res = await axios.get(`/api/courses/${courseId}`);
        setCourse(res.data.course);
        setLessons(res.data.lessons);
      } catch (error) {
        console.error('Failed to load course:', error);
      }
    };

    fetchCourseData();
  }, [courseId]);

  const handleStartLesson = (lesson) => {
    setCurrentLesson(lesson);
  };

  if (!course) return <div>Loading course...</div>;

  return (
    <div className="course-detail-page">
      <h2>{course.title}</h2>
      <p>{course.description}</p>

      <ProgressBar courseId={courseId} />

      {currentLesson ? (
        <LessonSection
          lesson={currentLesson}
          onComplete={() => setCurrentLesson(null)}
        />
      ) : (
        <div className="lesson-list">
          <h3>Lessons</h3>
          <ul>
            {lessons.map((lesson) => (
              <li key={lesson.id}>
                <button onClick={() => handleStartLesson(lesson)}>
                  {lesson.title}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default CourseDetail;
