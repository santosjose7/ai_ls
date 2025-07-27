import React, { useState } from 'react';

const EditCourseModal = ({
  course,
  editedCourse,
  setEditedCourse,
  onSaveCourse,
  onCancel,
  onAddLesson
}) => {
  const [lesson, setLesson] = useState({
    title: '',
    content: '',
    media: null,
    mediaType: '',
  });

  const handleLessonFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    let mediaType = '';
    if (file.type.startsWith('image/')) mediaType = 'image';
    else if (file.type.startsWith('audio/')) mediaType = 'audio';
    else if (file.type.startsWith('video/')) mediaType = 'video';

    setLesson({ ...lesson, media: file, mediaType });
  };

  const handleAddLessonClick = () => {
    if (!lesson.title || !lesson.content) {
      alert("Please fill in title and content.");
      return;
    }

    const formData = new FormData();
    formData.append('title', lesson.title);
    formData.append('content', lesson.content);
    if (lesson.media) {
      formData.append('media', lesson.media);
      formData.append('mediaType', lesson.mediaType);
    }

    onAddLesson(formData);
    setLesson({ title: '', content: '', media: null, mediaType: '' });
  };

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3>Edit Course</h3>
        <input
          type="text"
          placeholder="Course Title"
          value={editedCourse.title}
          onChange={(e) =>
            setEditedCourse({ ...editedCourse, title: e.target.value })
          }
        />
        <input
          type="text"
          placeholder="Description"
          value={editedCourse.description}
          onChange={(e) =>
            setEditedCourse({ ...editedCourse, description: e.target.value })
          }
        />
        <button onClick={onSaveCourse}>Save Course</button>
        <button onClick={onCancel}>Cancel</button>

        <hr style={{ margin: '1rem 0' }} />

        <h4>Add Lesson to Course</h4>
        <input
          type="text"
          placeholder="Lesson Title"
          value={lesson.title}
          onChange={(e) => setLesson({ ...lesson, title: e.target.value })}
        />
        <textarea
          placeholder="Lesson Content"
          value={lesson.content}
          onChange={(e) => setLesson({ ...lesson, content: e.target.value })}
        />
        <input type="file" onChange={handleLessonFileChange} />

        {lesson.media && (
          <div style={{ marginTop: '10px' }}>
            <strong>Preview:</strong>
            {lesson.mediaType === 'image' && (
              <img
                src={URL.createObjectURL(lesson.media)}
                alt="preview"
                style={{ maxWidth: '100%', height: 'auto' }}
              />
            )}
            {lesson.mediaType === 'audio' && (
              <audio controls src={URL.createObjectURL(lesson.media)} />
            )}
            {lesson.mediaType === 'video' && (
              <video controls width="100%">
                <source src={URL.createObjectURL(lesson.media)} />
              </video>
            )}
          </div>
        )}

        <button onClick={handleAddLessonClick} className="btn-add-lesson">
          Add Lesson
        </button>
      </div>
    </div>
  );
};

export default EditCourseModal;
