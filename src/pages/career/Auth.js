import React, { useEffect, useState } from 'react';
import InputField from './components/InputField';
import { authAPI } from './services/api';

const MODES = {
  LOGIN: 'login',
  REGISTER: 'register',
  FORGOT: 'forgot',
  RESET: 'reset',
};

export default function Auth({ onLogin, onBack, resetIntent, onResetResolved }) {
  const [mode, setMode] = useState(resetIntent?.token ? MODES.RESET : MODES.LOGIN);
  const [values, setValues] = useState({
    name: '',
    email: resetIntent?.email || '',
    password: '',
    confirm: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (resetIntent?.token) {
      setMode(MODES.RESET);
      setValues((current) => ({ ...current, email: resetIntent.email || current.email }));
    } else if (mode === MODES.RESET) {
      setMode(MODES.LOGIN);
    }
  }, [mode, resetIntent]);

  const set = (key, val) => setValues((current) => ({ ...current, [key]: val }));

  const switchMode = (nextMode) => {
    if (mode === MODES.RESET && nextMode !== MODES.RESET && onResetResolved) {
      onResetResolved();
    }
    setError('');
    setSuccess('');
    setMode(nextMode);
  };

  const handleSubmit = async () => {
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (mode === MODES.LOGIN) {
        const data = await authAPI.login(values.email, values.password);
        onLogin(data.user, data.token);
      } else if (mode === MODES.REGISTER) {
        if (values.password !== values.confirm) throw new Error("Passwords don't match");
        if (values.password.length < 6) throw new Error('Password must be at least 6 characters');

        await authAPI.register(values.name, values.email, values.password);
        setSuccess('Account created! Please log in.');
        setValues((current) => ({ ...current, password: '', confirm: '' }));
        setMode(MODES.LOGIN);
      } else if (mode === MODES.FORGOT) {
        await authAPI.forgotPassword(values.email);
        setSuccess('Reset link sent to your email!');
      } else {
        if (values.password !== values.confirm) throw new Error("Passwords don't match");
        if (values.password.length < 6) throw new Error('Password must be at least 6 characters');
        if (!resetIntent?.token) throw new Error('Reset link is missing or invalid');

        await authAPI.resetPassword(resetIntent.token, values.password);
        setSuccess('Password reset! Please log in with your new password.');
        setValues((current) => ({ ...current, password: '', confirm: '' }));
        if (onResetResolved) onResetResolved();
        setMode(MODES.LOGIN);
      }
    } catch (err) {
      setError(err.message);
    }

    setLoading(false);
  };

  return (
    <div className="career-auth" onKeyDown={(event) => event.key === 'Enter' && handleSubmit()}>
      <button className="career-auth__back" onClick={onBack}>
        {'\u2190'} Back to Portfolio
      </button>

      <div className="career-auth__card">
        <div className="career-auth__brand">
          <div className="career-auth__icon">{'\u26A1'}</div>
          <h2 className="career-auth__heading">Career Upgrade</h2>
          <p className="career-auth__sub">
            {mode === MODES.LOGIN && 'Welcome back'}
            {mode === MODES.REGISTER && 'Create your account'}
            {mode === MODES.FORGOT && 'Reset your password'}
            {mode === MODES.RESET && 'Choose a new password'}
          </p>
        </div>

        {mode !== MODES.FORGOT && mode !== MODES.RESET && (
          <div className="career-auth__tabs">
            <button
              className={`career-auth__tab ${mode === MODES.LOGIN ? 'active' : ''}`}
              onClick={() => switchMode(MODES.LOGIN)}
            >
              Login
            </button>
            <button
              className={`career-auth__tab ${mode === MODES.REGISTER ? 'active' : ''}`}
              onClick={() => switchMode(MODES.REGISTER)}
            >
              Register
            </button>
          </div>
        )}

        <div className="career-auth__fields">
          {mode === MODES.REGISTER && (
            <InputField
              label="Full Name"
              value={values.name}
              onChange={(value) => set('name', value)}
              placeholder="Sai Kiran"
            />
          )}

          {mode !== MODES.RESET && (
            <InputField
              label="Email"
              type="email"
              value={values.email}
              onChange={(value) => set('email', value)}
              placeholder="you@example.com"
            />
          )}

          {mode === MODES.RESET && values.email && (
            <div className="career-alert career-alert--success">
              Resetting password for <strong>{values.email}</strong>
            </div>
          )}

          {mode !== MODES.FORGOT && (
            <InputField
              label={mode === MODES.RESET ? 'New Password' : 'Password'}
              type="password"
              value={values.password}
              onChange={(value) => set('password', value)}
              placeholder={'\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022'}
            />
          )}

          {(mode === MODES.REGISTER || mode === MODES.RESET) && (
            <InputField
              label="Confirm Password"
              type="password"
              value={values.confirm}
              onChange={(value) => set('confirm', value)}
              placeholder={'\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022'}
            />
          )}
        </div>

        {error && <div className="career-alert career-alert--error">{error}</div>}
        {success && <div className="career-alert career-alert--success">{success}</div>}

        <button
          className="career-btn career-btn--primary career-btn--full"
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading
            ? 'Please wait...'
            : mode === MODES.LOGIN
              ? `Login ${'\u2192'}`
              : mode === MODES.REGISTER
                ? 'Create Account'
                : mode === MODES.FORGOT
                  ? 'Send Reset Link'
                  : 'Set New Password'}
        </button>

        <div className="career-auth__footer">
          {mode === MODES.LOGIN && (
            <>
              <button className="career-auth__link" onClick={() => switchMode(MODES.FORGOT)}>
                Forgot password?
              </button>
              <span className="career-auth__hint">
                New user?{' '}
                <button
                  className="career-auth__link career-auth__link--accent"
                  onClick={() => switchMode(MODES.REGISTER)}
                >
                  Register here
                </button>
              </span>
            </>
          )}

          {mode === MODES.FORGOT && (
            <button
              className="career-auth__link career-auth__link--accent"
              onClick={() => switchMode(MODES.LOGIN)}
            >
              {'\u2190'} Back to login
            </button>
          )}

          {mode === MODES.RESET && (
            <button
              className="career-auth__link career-auth__link--accent"
              onClick={() => switchMode(MODES.LOGIN)}
            >
              {'\u2190'} Back to login
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
