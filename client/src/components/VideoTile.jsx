import { useEffect, useRef } from 'react';
import { Mic, MicOff, VideoOff } from 'lucide-react';

export default function VideoTile({ stream, name, local = false, audio = true, video = true, screen = false }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream || null;
  }, [stream]);
  return (
    <div className={`video-tile${local ? ' video-tile-local' : ''}`}>
      {stream && (video || screen) ? (
        <video ref={ref} autoPlay playsInline muted={local} className={screen ? 'screen-video' : ''} />
      ) : (
        <div className="video-placeholder"><span className="avatar avatar-video">{name?.charAt(0).toUpperCase()}</span><VideoOff size={17} /></div>
      )}
      <span className="video-name">{local ? `${name || 'You'} (You)` : name || 'Guest'}{screen ? ' · sharing screen' : ''}</span>
      <span className="video-audio" title={audio ? 'Microphone on' : 'Microphone off'}>
        {audio ? <Mic size={14} /> : <MicOff size={14} />}
      </span>
    </div>
  );
}
