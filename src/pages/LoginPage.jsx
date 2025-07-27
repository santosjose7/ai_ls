import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import '../styles/LoginRegister.css';

const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [isRegister, setIsRegister] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
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

  const handleSubmit = async (e) => {
  e.preventDefault();
  const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';

  try {
    const res = await axios.post(endpoint, formData);

    console.log("✅ Login success"); 
    if (!res.data.token) {
      console.error("❌ No token received from backend!");
      setError("Login failed: no token received");
      return;
    }

    login(res.data.token, res.data.user); // This sets token to context + localStorage

    if (res.data.user.role === 'admin') {
      navigate('/admin');
    } else {
      navigate('/student');
    }

  } catch (err) {
    console.error("❌ Login error:", err.response?.data || err.message);
    setError('Authentication failed. Please check your credentials.');
  }
};

  return (
    <div className="auth-container">
      <div className="auth-toggle">
        <button
          className={!isRegister ? 'active' : ''}
          onClick={() => setIsRegister(false)}
        >
          Log In
        </button>
        <button
          className={isRegister ? 'active' : ''}
          onClick={() => setIsRegister(true)}
        >
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

        <button type="submit">
          {isRegister ? 'Register' : 'Log In'}
        </button>
      </form>

      <p>
        {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
        <button onClick={toggleForm} style={{ color: '#007bff', background: 'none', border: 'none', cursor: 'pointer' }}>
          {isRegister ? 'Log In' : 'Register'}
        </button>
      </p>
    </div>
  );
};

export default LoginPage;
