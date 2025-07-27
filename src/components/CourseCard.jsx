import React from 'react';
import '../styles/CourseCard.css'; 

const CourseCard = ({ course, onClick }) => {
  return (
    <div className="course-card" onClick={() => onClick(course.id)}>
      <h3>{course.title}</h3>
      <p>{course.description}</p>
    </div>
  );
};

export default CourseCard;
