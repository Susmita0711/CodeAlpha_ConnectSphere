import { ArrowRight, HeartHandshake, LockKeyhole, Sparkles, Users } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function About() {
  return <main className="about-page section-shell">
    <div className="about-hero"><span className="section-kicker">A LITTLE ABOUT US</span><h1>Work feels better<br />when we <span className="text-gradient">work together.</span></h1><p>ConnectSphere brings your conversations and collaboration into one thoughtfully designed space — so teams can focus on the work that matters.</p><Link to="/register" className="button button-primary button-large">Bring your team together <ArrowRight size={17} /></Link></div>
    <div className="about-values">{[[Users, 'People first', 'Built around the real moments when teams come together.'], [LockKeyhole, 'Privacy matters', 'Secure sign-in and encrypted peer-to-peer media are part of the foundation.'], [HeartHandshake, 'Better together', 'Simple tools make it easier for everyone to contribute.'], [Sparkles, 'Room to create', 'A shared whiteboard and screen bring ideas to life.']].map(([Icon, title, text]) => <article className="feature-card" key={title}><span className="feature-icon"><Icon size={20} /></span><h3>{title}</h3><p>{text}</p></article>)}</div>
    <footer className="footer"><span>ConnectSphere — Connect. Collaborate. Communicate.</span><Link to="/">Back home</Link></footer>
  </main>;
}
