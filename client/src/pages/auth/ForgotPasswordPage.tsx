import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiArrowLeft } from 'react-icons/hi';
import { authAPI } from '../../services/api';
import Button from '../../components/common/Button/Button';
import Input from '../../components/common/Input/Input';
import toast from 'react-hot-toast';
import './Auth.css';

const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error('Please enter your email');
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    try {
      await authAPI.forgotPassword({ email });
      setSent(true);
      toast.success('Password reset link sent to your email!');
    } catch (err: any) {
      const message =
        err.response?.data?.message || 'Email not found. Please check and try again.';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <button className="back-button" onClick={() => navigate('/login')}>
          <HiArrowLeft size={22} />
        </button>

        <div className="auth-header">
          <h1 className="auth-title">
            <span className="underline-text">Forgot</span> Password?
          </h1>
          <p className="auth-subtitle">
            {sent
              ? 'We\'ve sent a password reset OTP to your email. Check your inbox.'
              : 'Enter the email associated with your account and we\'ll send a reset code.'}
          </p>
        </div>

        {!sent ? (
          <form onSubmit={handleSubmit} className="auth-form">
            <Input
              label="Your email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
            />

            <Button
              type="submit"
              variant="primary"
              fullWidth
              size="lg"
              isLoading={isLoading}
            >
              Send Reset Code
            </Button>
          </form>
        ) : (
          <div className="auth-form">
            <Button
              variant="primary"
              fullWidth
              size="lg"
              onClick={() => navigate('/login')}
            >
              Back to Login
            </Button>

            <button
              className="auth-link forgot-link"
              style={{ background: 'none', border: 'none', cursor: 'pointer', width: '100%' }}
              onClick={() => {
                setSent(false);
                setEmail('');
              }}
            >
              Try a different email
            </button>
          </div>
        )}

        <p className="auth-link-text" style={{ marginTop: 16 }}>
          Remember your password?{' '}
          <a onClick={() => navigate('/login')} className="auth-link">
            Log in
          </a>
        </p>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
