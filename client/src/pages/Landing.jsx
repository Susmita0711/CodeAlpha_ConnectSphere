import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Check, CirclePlay, FileUp, LockKeyhole, MonitorUp, Pencil, ShieldCheck, Sparkles, Users, Video } from 'lucide-react';
import { useAuth } from '../auth';

const features = [
  { icon: Video, title: 'Crystal-clear conversations', text: 'Meet face to face with secure, peer-to-peer video and audio.' },
  { icon: MonitorUp, title: 'Share your screen', text: 'Bring everyone onto the same page with one-click screen sharing.' },
  { icon: Pencil, title: 'Think out loud, together', text: 'Sketch, map ideas and collaborate on a live shared whiteboard.' },
  { icon: FileUp, title: 'Files in the flow', text: 'Share meeting resources with your team, right when they need them.' }
];

export default function Landing() {
  const { user } = useAuth();
  return (
    <main>
      <section className="hero section-shell">
        <div className="hero-copy">
          <div className="eyebrow"><span className="eyebrow-dot" /> A better way to work together</div>
          <h1>Big ideas happen<br />when we <span className="text-gradient">connect.</span></h1>
          <p className="hero-tagline">Connect. Collaborate. Communicate.</p>
          <p className="hero-description">Bring your people, ideas and conversations together. A calm, focused space for your best work — wherever work happens.</p>
          <div className="hero-actions">
            <Link to={user ? '/dashboard' : '/register'} className="button button-primary button-large">{user ? 'Go to your workspace' : 'Start a meeting'} <ArrowRight size={17} /></Link>
            <a href="#features" className="button button-quiet button-large"><CirclePlay size={18} /> Explore features</a>
          </div>
          <div className="hero-proof"><div className="proof-avatars"><span>J</span><span>M</span><span>A</span><span>+</span></div><span>Made for teams that make things happen</span></div>
        </div>
        <div className="hero-visual">
          <div className="hero-glow" />
          <div className="workspace-window">
            <div className="workspace-top"><span className="brand-mark"><AudioLines size={15} /></span><strong>ConnectSphere</strong><span className="workspace-separator" /><span>Your collaboration space</span><span className="workspace-user">A</span></div>
            <div className="workspace-body">
              <div className="workspace-sidebar"><span className="workspace-sidebar-title">YOUR SPACE</span><span className="workspace-side-item active"><Video size={13} /> Meetings</span><span className="workspace-side-item"><Pencil size={13} /> Whiteboard</span><span className="workspace-side-item"><FileUp size={13} /> Shared files</span></div>
              <div className="workspace-main"><span className="workspace-overline">ONE SPACE TO WORK TOGETHER</span><h3>Make room for good ideas.</h3><div className="workspace-tools"><div className="workspace-tool-card"><span className="workspace-tool-icon blue"><Video size={16} /></span><strong>Meet</strong><small>Face-to-face conversations</small><span className="workspace-tool-link">Audio & video <ArrowRight size={11} /></span></div><div className="workspace-tool-card"><span className="workspace-tool-icon teal"><Pencil size={16} /></span><strong>Create</strong><small>Ideas, drawn together</small><span className="workspace-tool-link">Live whiteboard <ArrowRight size={11} /></span></div><div className="workspace-tool-card"><span className="workspace-tool-icon violet"><FileUp size={16} /></span><strong>Share</strong><small>Keep resources in reach</small><span className="workspace-tool-link">Room files <ArrowRight size={11} /></span></div></div><div className="workspace-note"><span className="workspace-note-icon"><Sparkles size={14} /></span><span><strong>Everything in its place</strong><small>Meet, sketch and share — together.</small></span><span className="workspace-note-dots">•••</span></div></div>
            </div>
          </div>
          <div className="floating-card floating-secure"><ShieldCheck size={18} /><div><strong>Private by design</strong><small>Encrypted peer-to-peer</small></div><Check size={16} /></div>
          <div className="floating-card floating-people"><Users size={18} /><div><strong>Good to see you</strong><small>Your team is here</small></div></div>
        </div>
      </section>
      <section className="trust-strip section-shell">
        <span>EVERYTHING YOUR TEAM NEEDS TO</span><div><b>MEET</b><i /> <b>THINK</b><i /> <b>MAKE</b><i /> <b>MOVE FORWARD</b></div>
      </section>
      <section className="features-section section-shell" id="features">
        <div className="section-heading"><span className="section-kicker">BUILT FOR THE WAY YOU WORK</span><h2>One space. <span className="text-gradient">More momentum.</span></h2><p>The right tools, right where the conversation is happening.</p></div>
        <div className="feature-grid">{features.map(({ icon: Icon, title, text }, index) => <article className="feature-card" key={title}><span className={`feature-icon feature-icon-${index}`}><Icon size={20} /></span><h3>{title}</h3><p>{text}</p><span className="feature-arrow"><ArrowUpRight size={17} /></span></article>)}</div>
      </section>
      <section className="cta-section section-shell">
        <div className="cta-panel"><div className="cta-orb" /><div className="cta-content"><span className="section-kicker">YOUR NEXT GREAT CONVERSATION STARTS HERE</span><h2>Make room for<br />better teamwork.</h2><p>Get everyone together in seconds. No complicated setup, just a space to connect.</p><Link to={user ? '/dashboard' : '/register'} className="button button-primary button-large">{user ? 'Open workspace' : 'Create your free account'} <ArrowRight size={17} /></Link></div><div className="cta-checklist"><p><Check size={16} /> Video, audio & screen sharing</p><p><Check size={16} /> Shared whiteboard & files</p><p><LockKeyhole size={16} /> Private, secure meetings</p></div></div>
      </section>
      <footer className="footer section-shell"><Link to="/" className="brand"><span className="brand-mark"><Video size={18} /></span>connect<span className="brand-accent">sphere</span></Link><span>Connect. Collaborate. Communicate.</span><Link to="/about">About ConnectSphere</Link></footer>
    </main>
  );
}
