import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Navigate } from 'react-router-dom';

import LoginPage from './pages/LoginPage';
import CourseList from './pages/CourseList';
import CourseDetail from './pages/CourseDetail';
import CourseDetails from './pages/CourseDetails';
import LessonDetails from './pages/LessonDetails';
import AvailableCourses from './pages/AvailableCourses';

import AdminDashboard from './pages/AdminDashboard';
import StudentDashboard from './pages/StudentDashboard';
import StudentLessonView from './pages/StudentLessonView';

import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';


const App = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          
          {/* Admin only */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          {/* Student only */}
          <Route
            path="/student"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <StudentDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/courses/:id"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <CourseDetail />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/courses/:id"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <CourseDetails />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/lessons/:id"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <LessonDetails />
              </ProtectedRoute>
            }
          />

          <Route
            path="/student/lesson/:id"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <StudentLessonView />
              </ProtectedRoute>
            }
          />
          <Route path="/courses" element={<AvailableCourses />} />

          {/* Default route */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;
