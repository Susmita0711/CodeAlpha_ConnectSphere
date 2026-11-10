import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, CalendarDays, Check, Clipboard, Clock3, Copy, Plus, Sparkles, Video, Users } from 'lucide-react';
import { useAuth } from '../auth';

function createMeetingId() {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [meetingId, setMeetingId] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [recentMeetings, setRecentMeetings] = useState(() => {
    try { return JSON.parse(localStorage.getItem('connectsphere-recent-meetings') || '[]'); } catch { return []; }
  });
  const openMeeting = (id = createMeetingId()) => {
    const normalized = id.trim();
    if (!/^[a-zA-Z0-9_-]{6,64}$/.test(normalized)) {
      setError('Meeting IDs must be 6–64 letters, numbers, dashes or underscores.');
      return;
    }
    setError('');
    const next = [{ id: normalized, joinedAt: new Date().toISOString() }, ...recentMeetings.filter((item) => item.id !== normalized)].slice(0, 4);
    setRecentMeetings(next);
    localStorage.setItem('connectsphere-recent-meetings', JSON.stringify(next));
    navigate(`/meeting/${normalized}`);
  };
  const copyId = async (id) => {
    try {
      await navigator.clipboard.writeText(id);
      setCopied(id);
      window.setTimeout(() => setCopied(false), 1800);
    } catch { setError('Clipboard access is unavailable in this browser.'); }
  };
  const displayDate = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date());
  return <main className="dashboard-page section-shell">
    <div className="dashboard-welcome"><div><span className="section-kicker">YOUR SPACE, YOUR PEOPLE</span><h1>Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, {user?.name?.split(' ')[0]} <span className="wave">✦</span></h1><p>{displayDate} <span className="inline-divider">·</span> Ready to bring your team together?</p></div><div className="dashboard-date"><CalendarDays size={17} /> {displayDate}</div></div>
    <div className="dashboard-grid">
      <section className="dashboard-main">
        <div className="dashboard-hero-card"><div className="dashboard-card-orb" /><div className="dashboard-card-copy"><span className="hero-card-tag"><Sparkles size={14} /> YOUR TEAM IS ONE CLICK AWAY</span><h2>Make something<br />great happen today.</h2><p>Start a new room or jump into a meeting already in progress.</p><button className="button button-primary button-large" onClick={() => openMeeting()}><Plus size={18} /> Create a meeting</button></div><div className="dashboard-card-art"><div className="art-ring ring-one" /><div className="art-ring ring-two" /><div className="art-center"><Video size={28} /></div><div className="art-orbit orbit-a">J</div><div className="art-orbit orbit-b">M</div><div className="art-orbit orbit-c">A</div></div></div>
        <div className="dashboard-panel join-panel"><div className="panel-title"><span className="panel-icon"><Users size={17} /></span><div><h3>Join a meeting</h3><p>Have a meeting ID? Enter it here to join your team.</p></div></div><form className="join-form" onSubmit={(event) => { event.preventDefault(); openMeeting(meetingId); }}><input aria-label="Meeting ID" value={meetingId} onChange={(event) => setMeetingId(event.target.value)} placeholder="Enter meeting ID" /><button className="button button-primary" type="submit">Join meeting <ArrowRight size={16} /></button></form>{error && <p className="inline-error" role="alert">{error}</p>}</div>
        <div className="dashboard-panel recent-panel"><div className="panel-heading"><div><span className="section-kicker">PICK UP WHERE YOU LEFT OFF</span><h3>Recent meetings</h3></div><Clock3 size={18} /></div>{recentMeetings.length ? <div className="recent-list">{recentMeetings.map((item) => <div className="recent-item" key={item.id}><span className="recent-icon"><Video size={17} /></span><div className="recent-info"><strong>Meeting room</strong><small>{item.id} <span>·</span> {new Date(item.joinedAt).toLocaleDateString()}</small></div><button className="icon-btn copy-btn" aria-label="Copy meeting ID" onClick={() => copyId(item.id)}>{copied === item.id ? <Check size={16} /> : <Copy size={16} />}</button><button className="button button-quiet button-small" onClick={() => openMeeting(item.id)}>Rejoin <ArrowRight size={14} /></button></div>)}</div> : <div className="empty-recent"><span><Clipboard size={19} /></span><div><strong>No meetings just yet</strong><p>Your recent rooms will be waiting here when you need them.</p></div></div>}</div>
      </section>
      <aside className="dashboard-aside"><div className="profile-card"><div className="profile-cover"><div className="cover-star">✦</div></div><div className="profile-content"><span className="avatar avatar-profile">{user?.name?.charAt(0).toUpperCase()}</span><div className="profile-name"><h3>{user?.name}</h3><span><i /> Your personal workspace</span></div><div className="profile-divider" /><div className="profile-detail"><span>Email address</span><strong>{user?.email}</strong></div><div className="profile-detail"><span>Account</span><strong className="account-active"><i /> Active</strong></div></div></div><div className="tip-card"><span className="tip-icon"><Sparkles size={17} /></span><span className="section-kicker">A LITTLE TIP</span><h3>Good things start with a link.</h3><p>Create your room and share its meeting ID with anyone you want to bring in.</p><button className="tip-link" onClick={() => openMeeting()}>Create a meeting <ArrowRight size={15} /></button></div><div className="dashboard-security"><span><span className="security-pulse" /> Private by design</span><small>Your media streams stay peer-to-peer</small></div></aside>
    </div>
    <footer className="footer dashboard-footer"><span>ConnectSphere — Connect. Collaborate. Communicate.</span><span>Make space for good work.</span></footer>
  </main>;
}
