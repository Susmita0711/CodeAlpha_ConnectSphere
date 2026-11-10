import { Link, useNavigate } from 'react-router-dom';
import { AudioLines, ArrowLeft, ArrowRight, Eye, EyeOff, LockKeyhole, Mail, UserRound } from 'lucide-react';
import { useState } from 'react';
import api from '../api';
import { useAuth } from '../auth';

export default function AuthPage({ mode }) {
  const isRegister = mode === 'register';
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const { data } = await api.post(`/auth/${isRegister ? 'register' : 'login'}`, { ...(isRegister ? { name } : {}), email, password });
      signIn(data);
      navigate('/dashboard');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not reach ConnectSphere. Check that the server is running.');
    } finally { setBusy(false); }
  };
  return <main className="auth-page">
    <div className="auth-showcase"><Link to="/" className="brand"><span className="brand-mark"><AudioLines size={20} /></span>connect<span className="brand-accent">sphere</span></Link><div className="auth-showcase-copy"><span className="section-kicker">CONNECT. COLLABORATE. COMMUNICATE.</span><h1>Good work<br />starts with<br /><span className="text-gradient">good connection.</span></h1><p>One place to meet, share ideas and move forward — together.</p></div><div className="auth-showcase-bottom"><span>✦</span> Thoughtfully made for teams, wherever they are.</div></div>
    <div className="auth-form-side"><Link className="back-link" to="/"><ArrowLeft size={16} /> Back to home</Link><div className="auth-card"><span className="section-kicker">{isRegister ? 'YOUR TEAM SPACE AWAITS' : 'WELCOME BACK'}</span><h2>{isRegister ? 'Create your account' : 'Welcome back'}</h2><p className="auth-subtitle">{isRegister ? 'Start bringing your team together.' : 'Sign in to pick up where you left off.'}</p>
      <form onSubmit={submit} className="auth-form">
        {isRegister && <label className="form-field"><span>Your name</span><div className="input-wrap"><UserRound size={17} /><input autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Alex Morgan" minLength="2" maxLength="60" required /></div></label>}
        <label className="form-field"><span>Email address</span><div className="input-wrap"><Mail size={17} /><input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" required /></div></label>
        <label className="form-field"><span>Password</span><div className="input-wrap"><LockKeyhole size={17} /><input type={showPassword ? 'text' : 'password'} autoComplete={isRegister ? 'new-password' : 'current-password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={isRegister ? 'At least 8 characters' : 'Your password'} minLength={isRegister ? '8' : undefined} required /><button type="button" className="password-toggle" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></label>
        {error && <div className="form-error" role="alert">{error}</div>}
        <button type="submit" className="button button-primary button-large auth-submit" disabled={busy}>{busy ? <><span className="spinner spinner-small" /> Please wait…</> : <>{isRegister ? 'Create account' : 'Sign in'} <ArrowRight size={17} /></>}</button>
      </form>
      <p className="auth-switch">{isRegister ? 'Already have an account?' : 'New to ConnectSphere?'} <Link to={isRegister ? '/login' : '/register'}>{isRegister ? 'Sign in' : 'Create an account'}</Link></p>
      <p className="auth-privacy"><LockKeyhole size={13} /> Your account information is kept secure.</p>
    </div></div>
  </main>;
}
