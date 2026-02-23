import React, { useState } from 'react';
import InputField from './components/InputField';
import { authAPI } from './services/api';

const MODES = { LOGIN: 'login', REGISTER: 'register', FORGOT: 'forgot' };

export default function Auth({ onLogin, onBack }) {
  const [mode, setMode] = useState(MODES.LOGIN);
  const [values, setValues] = useState({ name: '', email: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (key, val) => setValues(v => ({ ...v, [key]: val }));

  const handleSubmit = async () => {
    setError(''); setSuccess(''); setLoading(true);
    try {
      if (mode === MODES.LOGIN) {
        const data = await authAPI.login(values.email, values.password);
        onLogin(data.user, data.token);

      } else if (mode === MODES.REGISTER) {
        if (values.password !== values.confirm) throw new Error("Passwords don't match");
        if (values.password.length < 6) throw new Error('Password must be at least 6 characters');
        await authAPI.register(values.name, values.email, values.password);
        setSuccess('Account created! Please login.');
        setMode(MODES.LOGIN);

      } else {
        await authAPI.forgotPassword(values.email);
        setSuccess('Reset link sent to your email!');
      }
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  return (
    <div className="career-auth" onKeyDown={e => e.key === 'Enter' && handleSubmit()}>
      <button className="career-auth__back" onClick={onBack}>
        ← Back to Portfolio
      </button>

      <div className="career-auth__card">
        <div className="career-auth__brand">
          <div className="career-auth__icon">⚡</div>
          <h2 className="career-auth__heading">Career Upstep</h2>
          <p className="career-auth__sub">
            {mode === MODES.LOGIN && 'Welcome back'}
            {mode === MODES.REGISTER && 'Create your account'}
            {mode === MODES.FORGOT && 'Reset your password'}
          </p>
        </div>

        {mode !== MODES.FORGOT && (
          <div className="career-auth__tabs">
            <button
              className={`career-auth__tab ${mode === MODES.LOGIN ? 'active' : ''}`}
              onClick={() => setMode(MODES.LOGIN)}
            >
              Login
            </button>
            <button
              className={`career-auth__tab ${mode === MODES.REGISTER ? 'active' : ''}`}
              onClick={() => setMode(MODES.REGISTER)}
            >
              Register
            </button>
          </div>
        )}

        <div className="career-auth__fields">
          {mode === MODES.REGISTER && (
            <InputField label="Full Name" value={values.name} onChange={v => set('name', v)} placeholder="Sai Kiran" />
          )}
          <InputField label="Email" type="email" value={values.email} onChange={v => set('email', v)} placeholder="you@example.com" />
          {mode !== MODES.FORGOT && (
            <InputField label="Password" type="password" value={values.password} onChange={v => set('password', v)} placeholder="••••••••" />
          )}
          {mode === MODES.REGISTER && (
            <InputField label="Confirm Password" type="password" value={values.confirm} onChange={v => set('confirm', v)} placeholder="••••••••" />
          )}
        </div>

        {error && <div className="career-alert career-alert--error">{error}</div>}
        {success && <div className="career-alert career-alert--success">{success}</div>}

        <button
          className="career-btn career-btn--primary career-btn--full"
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? 'Please wait...'
            : mode === MODES.LOGIN ? 'Login →'
            : mode === MODES.REGISTER ? 'Create Account'
            : 'Send Reset Link'}
        </button>

        <div className="career-auth__footer">
          {mode === MODES.LOGIN && (
            <>
              <button className="career-auth__link" onClick={() => setMode(MODES.FORGOT)}>
                Forgot password?
              </button>
              <span className="career-auth__hint">
                New user?{' '}
                <button className="career-auth__link career-auth__link--accent" onClick={() => setMode(MODES.REGISTER)}>
                  Register here
                </button>
              </span>
            </>
          )}
          {mode === MODES.FORGOT && (
            <button className="career-auth__link career-auth__link--accent" onClick={() => setMode(MODES.LOGIN)}>
              ← Back to login
            </button>
          )}
        </div>
      </div>
    </div>
  );
}