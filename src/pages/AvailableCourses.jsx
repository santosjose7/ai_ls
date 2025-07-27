import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { BookOpen, ChevronRight, User, LogOut, Bell, Search, Home } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

import '../styles/AvailableCourses.css';




const AvailableCourses = () => {
	const { token, user, logout } = useAuth();
	const navigate = useNavigate();
	const [courses, setCourses] = useState([]);
	const [search, setSearch] = useState('');
	
	const gradients = [
		'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
		'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
		'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
		'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
		'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
		'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
		'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
		'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
		'linear-gradient(135deg, #ff8a80 0%, #ea80fc 100%)',
		'linear-gradient(135deg, #8fd3f4 0%, #84fab0 100%)',
		'linear-gradient(135deg, #d299c2 0%, #fef9d7 100%)',
		'linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%)',
		'linear-gradient(135deg, #fdbb2d 0%, #22c1c3 100%)',
		'linear-gradient(135deg, #e0c3fc 0%, #9bb5ff 100%)',
		'linear-gradient(135deg, #ffeaa7 0%, #fab1a0 100%)',
		'linear-gradient(135deg, #74b9ff 0%, #0984e3 100%)',
		'linear-gradient(135deg, #fd79a8 0%, #fdcb6e 100%)',
		'linear-gradient(135deg, #6c5ce7 0%, #a29bfe 100%)',
		'linear-gradient(135deg, #fd63a6 0%, #ffb88c 100%)',
		'linear-gradient(135deg, #52c234 0%, #061700 100%)',
	];

	const getCourseGradient = (courseId, index) => {
		const seed = courseId ? courseId.toString() : index.toString();
		const hash = seed.split('').reduce((a, b) => {
			a = ((a << 5) - a) + b.charCodeAt(0);
			return a & a;
		}, 0);
		return gradients[Math.abs(hash) % gradients.length];
	};


	
	const addBtnRef = useRef(null);
	useEffect(() => {
		fetchCourses();
	}, []);

	const fetchCourses = async () => {
		try {
			const response = await fetch('/api/courses', {
				headers: {
					Authorization: `Bearer ${token}`,
					'Content-Type': 'application/json',
				},
			});
			const data = await response.json();
			setCourses(data);
		} catch (error) {
			console.error('Error fetching available courses:', error);
		}
	};

	const handleEnroll = async courseId => {
		try {
			await fetch(`/api/student/enroll/${courseId}`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${token}`,
					'Content-Type': 'application/json',
				},
			});
			alert('Enrolled successfully!');
			fetchCourses();
		} catch (error) {
			alert('Failed to enroll.');
		}
	};

	const filteredCourses = courses.filter(course =>
		course.title.toLowerCase().includes(search.toLowerCase())
	);
	

	return (
		
		<>
			{/* Header */}
			<header className="header-student">
				<div className="header-content-student">
					<div className="header-left-student">
						<div className="logo-section-student">
							<div className="logo-icon-student" onClick={() => navigate('/student')} style={{ cursor: 'pointer' }}>
								<Home className="icon-sm" />
							</div>
							<div className="logo-text-student">
								<h1 className="logo-title-student">Available Courses</h1>
								<p className="logo-subtitle-student">Browse and enroll</p>
							</div>

						</div>
					</div>
					<div className="header-right-student">
						<div className="search-container-student">
							<Search className="search-icon-student" />
							<input
								type="text"
								placeholder="Search courses..."
								className="search-input-student"
								value={search}
								onChange={e => setSearch(e.target.value)}
							/>
						</div>
						<button className="notification-btn-student">
							<Bell className="icon-xs" />
							<span className="notification-dot-student"></span>
						</button>
						<div className="user-section-available">
							<div className="user-info-available">
								<p className="user-name-available">
									{user?.first_name || 'Student'} {user?.last_name}
								</p>
								<p className="user-email-available">{user?.email}</p>
							</div>
							
							<button
								onClick={() => {
									logout();
									navigate('/login');
								}}
								className="logout-btn-available"
							>
								<LogOut className="icon-small" />
								<span className="logout-text-available">Logout</span>
							</button>
						</div>
					</div>
				</div>
			</header>
			<div className="main-content-available">
			{/* Main Content */}
			<div className="course-management-section">
			<div className="course-list-container">
				<h2 className="courses-title">Available Courses</h2>
				<div className="courses-grid">
					{filteredCourses.length === 0 ? (
						<p className="no-courses-available">No courses found.</p>
					) : (
						filteredCourses.map((course, index) => (
							<div
								key={course.id}
								className="course-card"
								style={{ background: getCourseGradient(course.id, index) }}
							>
								<div className="course-header">
									<div className="course-icon">
										<BookOpen className="icon-medium" />
									</div>
									<h3 className="course-title">{course.title}</h3>
								</div>
								<p className="course-description">{course.description}</p>
								<div className="course-footer">
								
									<button
										className="enroll-btn-available"
										onClick={() => handleEnroll(course.id)}
									>
										Enroll <ChevronRight className="icon-xs" />
									</button>
								</div>
							</div>
						))
					)}
				</div>
			</div>
			</div>
			</div>
		</>
	);
};

export default AvailableCourses;