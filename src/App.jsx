// App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
//import LoginRegister from './pages/LoginRegister';
//import AdminDashboard from './pages/AdminDashboard';
import StudentLessonView from './pages/StudentLessonView';
import StudentLessonView1 from './pages/1';
import StudentSetup from './pages/Setup'
import StudentUploadPage from './components/StudentUploadPage';
//import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    
      <Routes>
        <Route path="/" element={<StudentUploadPage />} />
        <Route path="/upload" element={<StudentUploadPage />} />
        <Route path="/student-lesson-view" element={<StudentLessonView />} />
        
      </Routes>
   
  );
}

export default App;