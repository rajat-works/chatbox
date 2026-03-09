import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiArrowLeft } from 'react-icons/hi';
import { useAuthStore } from '../../stores/authStore';
import Button from '../../components/common/Button/Button';
import Input from '../../components/common/Input/Input';
import toast from 'react-hot-toast';
import './Auth.css';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }
    setIsLoading(true);
    try {
      const result = await login(email, password);
      if (result.requiresVerification) {
        toast('Account not verified. Check your email for OTP.');
        navigate('/verify-otp', { state: { email } });
      } else {
        toast.success('Login successful!');
        navigate('/');
      }
    } catch (err: any) {
      const message = err.response?.data?.message || 'Invalid email or password';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <button className="back-button" onClick={() => navigate('/welcome')}>
          <HiArrowLeft size={22} />
        </button>

        <div className="auth-header">
          <h1 className="auth-title">
            <span className="underline-text">Log in</span> to Chatbox
          </h1>
          <p className="auth-subtitle">
            Welcome back! Sign in with your email to continue.
          </p>
        </div>

        <form onSubmit={handleLogin} className="auth-form">
          <Input
            label="Your email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
          />

          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
          />

          <Button
            type="submit"
            variant="primary"
            fullWidth
            size="lg"
            isLoading={isLoading}
          >
            Log in
          </Button>
        </form>

        <a
          onClick={() => navigate('/forgot-password')}
          className="auth-link forgot-link"
        >
          Forgot password?
        </a>

        <p className="auth-link-text" style={{ marginTop: 16 }}>
          Don't have an account?{' '}
          <a onClick={() => navigate('/register')} className="auth-link">
            Sign up
          </a>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
