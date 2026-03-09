import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiArrowLeft } from 'react-icons/hi';
import { useAuthStore } from '../../stores/authStore';
import Button from '../../components/common/Button/Button';
import Input from '../../components/common/Input/Input';
import toast from 'react-hot-toast';
import './Auth.css';

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { register } = useAuthStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = 'Name is required';
    if (!email.trim()) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = 'Invalid email address';
    if (!password) newErrors.password = 'Password is required';
    else if (password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    if (password !== confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    try {
      await register({ name, email, password, confirmPassword });
      toast.success('Registration successful! Check your email for OTP.');
      navigate('/verify-otp', { state: { email } });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Registration failed');
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
            <span className="underline-text">Create</span> an Account
          </h1>
          <p className="auth-subtitle">
            Get chatting with friends and family today by signing up for our chat app!
          </p>
        </div>

        <form onSubmit={handleRegister} className="auth-form">
          <Input
            label="Your name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name"
            error={errors.name}
          />

          <Input
            label="Your email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            error={errors.email}
          />

          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            error={errors.password}
          />

          <Input
            label="Confirm Password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm your password"
            error={errors.confirmPassword}
          />

          <Button
            type="submit"
            variant="primary"
            fullWidth
            size="lg"
            isLoading={isLoading}
          >
            Create an account
          </Button>
        </form>

        <p className="auth-link-text" style={{ marginTop: 16 }}>
          Already have an account?{' '}
          <a onClick={() => navigate('/login')} className="auth-link">
            Log in
          </a>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
