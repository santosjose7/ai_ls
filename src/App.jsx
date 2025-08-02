// App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
//import LoginRegister from './pages/LoginRegister';
//import AdminDashboard from './pages/AdminDashboard';
import StudentLessonView from './pages/StudentLessonView';
//import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    
      <Routes>
        <Route path="/" element={<StudentLessonView />} />
        
      </Routes>
   
  );
}

export default App;