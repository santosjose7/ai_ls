import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import '../styles/LoginRegister.css';

const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [isRegister, setIsRegister] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    role: 'student',
    dob: '',
    address: '',
    phone: '',
  });
  const [error, setError] = useState('');

  const toggleForm = () => {
    setIsRegister(!isRegister);
    setError('');
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      password: '',
      role: 'student',
      dob: '',
      address: '',
      phone: '',
    });
  };

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    // Hardcoded accounts
    const defaultUsers = [
      {
        email: 'admin@gmail.com',
        password: 'Admin',
        role: 'admin',
        first_name: 'Admin',
        last_name: 'User',
      },
      {
        email: 'student@gmail.com',
        password: 'Student',
        role: 'student',
        first_name: '123Student',
        last_name: 'John',
      },
    ];

    // LocalStorage users
    const storedUsers = JSON.parse(localStorage.getItem('users')) || [];

    if (isRegister) {
      const userExists = [...defaultUsers, ...storedUsers].some(
        u => u.email === formData.email
      );
      if (userExists) {
        setError('User already exists.');
        return;
      }

      const newUser = {
        ...formData,
        role: 'student',
      };
      localStorage.setItem('users', JSON.stringify([...storedUsers, newUser]));
      alert('✅ Registration successful! You can now log in.');
      setIsRegister(false);
      return;
    }

    // Try login
    const allUsers = [...defaultUsers, ...storedUsers];
    const user = allUsers.find(
      u => u.email === formData.email && u.password === formData.password
    );

    if (!user) {
      setError('Invalid email or password.');
      return;
    }

    const fakeToken = 'demo-token';
    login(fakeToken, user);

    if (user.role === 'admin') {
      navigate('/admin');
    } else {
      navigate('/student');
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-toggle">
        <button className={!isRegister ? 'active' : ''} onClick={() => setIsRegister(false)}>
          Log In
        </button>
        <button className={isRegister ? 'active' : ''} onClick={() => setIsRegister(true)}>
          Register
        </button>
      </div>

      <h2>{isRegister ? 'Create an Account' : 'Log In'}</h2>
      {error && <p className="auth-error">{error}</p>}

      <form onSubmit={handleSubmit} className="auth-form">
        {isRegister && (
          <>
            <input
              type="text"
              name="first_name"
              placeholder="First Name"
              value={formData.first_name}
              onChange={handleChange}
              required
            />
            <input
              type="text"
              name="last_name"
              placeholder="Last Name"
              value={formData.last_name}
              onChange={handleChange}
              required
            />
            <input
              type="date"
              name="dob"
              placeholder="Date of Birth"
              value={formData.dob}
              onChange={handleChange}
              required
            />
            <input
              type="text"
              name="address"
              placeholder="Address"
              value={formData.address}
              onChange={handleChange}
              required
            />
            <input
              type="text"
              name="phone"
              placeholder="Phone"
              value={formData.phone}
              onChange={handleChange}
              required
            />
          </>
        )}

        <input
          type="email"
          name="email"
          placeholder="Email Address"
          value={formData.email}
          onChange={handleChange}
          required
        />

        <input
          type="password"
          name="password"
          placeholder="Password"
          value={formData.password}
          onChange={handleChange}
          required
        />

        <button type="submit">{isRegister ? 'Register' : 'Log In'}</button>
      </form>

      <p>
        {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
        <button
          onClick={toggleForm}
          style={{ color: '#007bff', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          {isRegister ? 'Log In' : 'Register'}
        </button>
      </p>
    </div>
  );
};

export default LoginPage;
