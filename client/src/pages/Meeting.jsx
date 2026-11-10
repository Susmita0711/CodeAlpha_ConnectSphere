import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, Copy, Download, FileUp, LoaderCircle, Mic, MicOff, MonitorUp, MoreHorizontal, PhoneOff, Plus, Users, Video, VideoOff, X } from 'lucide-react';
import { io } from 'socket.io-client';
import api from '../api';
import { useAuth } from '../auth';
import VideoTile from '../components/VideoTile';
import Whiteboard from '../components/Whiteboard';

const serverUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
const bytes = (size) => size < 1024 * 1024 ? `${(size / 1024).toFixed(0)} KB` : `${(size / 1024 / 1024).toFixed(1)} MB`;

export default function Meeting() {
  const { roomId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const socketRef = useRef(null);
  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const peersRef = useRef(new Map());
  const peerNamesRef = useRef(new Map());
  const [socket, setSocket] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteTiles, setRemoteTiles] = useState([]);
  const [participantCount, setParticipantCount] = useState(1);
  const [audioOn, setAudioOn] = useState(true);
  const [videoOn, setVideoOn] = useState(true);
  const [screenOn, setScreenOn] = useState(false);
  const [activeTab, setActiveTab] = useState('people');
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [meetingError, setMeetingError] = useState('');
  const [copied, setCopied] = useState(false);
  const [connected, setConnected] = useState(false);
  const [deviceWarning, setDeviceWarning] = useState('');

  const removePeer = useCallback((id) => {
    const peer = peersRef.current.get(id);
    if (peer) peer.pc.close();
    peersRef.current.delete(id);
    setRemoteTiles((current) => current.filter((tile) => tile.id !== id));
  }, []);

  const createPeer = useCallback((id, name, initiator, iceServers) => {
    if (peersRef.current.has(id)) return peersRef.current.get(id);
    const pc = new RTCPeerConnection({ iceServers });
    const peer = { pc, name, videoSender: null, pendingCandidates: [] };
    peersRef.current.set(id, peer);
    const stream = localStreamRef.current;
    if (stream) {
      for (const track of stream.getAudioTracks()) {
        const sender = pc.addTrack(track, stream);
      }
    }
    const videoTrack = screenStreamRef.current?.getVideoTracks()[0] || stream?.getVideoTracks()[0];
    if (videoTrack) peer.videoSender = pc.addTrack(videoTrack, screenStreamRef.current || stream);
    else peer.videoSender = pc.addTransceiver('video', { direction: 'sendrecv' }).sender;
    pc.onicecandidate = (event) => {
      if (event.candidate) socketRef.current?.emit('webrtc:signal', { to: id, candidate: event.candidate.toJSON() });
    };
    pc.ontrack = (event) => {
      const remoteStream = event.streams[0];
      setRemoteTiles((current) => {
        const existing = current.find((tile) => tile.id === id);
        const nextTile = { id, name, stream: remoteStream, audio: existing?.audio ?? true, video: existing?.video ?? true, screen: existing?.screen ?? false };
        return existing ? current.map((tile) => tile.id === id ? nextTile : tile) : [...current, nextTile];
      });
    };
    pc.onconnectionstatechange = () => {
      if (['failed', 'closed'].includes(pc.connectionState)) removePeer(id);
    };
    if (initiator) {
      pc.createOffer().then((offer) => pc.setLocalDescription(offer)).then(() => {
        socketRef.current?.emit('webrtc:signal', { to: id, description: pc.localDescription });
      }).catch((error) => setMeetingError(`Could not start a peer connection: ${error.message}`));
    }
    return peer;
  }, [removePeer]);

  useEffect(() => {
    let active = true;
    let connection;
    const join = async () => {
      try {
        const { data: rtcConfig } = await api.get('/rtc-config');
        if (!active) return;
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
          if (!active) { stream.getTracks().forEach((track) => track.stop()); return; }
          localStreamRef.current = stream;
          setLocalStream(stream);
        } catch (error) {
          setDeviceWarning(error.name === 'NotAllowedError' ? 'Camera and microphone access was denied. You can still join and listen.' : 'Camera or microphone is unavailable. You can still join the room.');
          setAudioOn(false);
          setVideoOn(false);
        }
        connection = io(serverUrl, { auth: { token: localStorage.getItem('connectsphere-token') }, transports: ['websocket', 'polling'] });
        socketRef.current = connection;
        setSocket(connection);
        connection.on('connect', () => {
          connection.emit('room:join', roomId, async (result) => {
            if (result?.error) { setMeetingError(result.error); return; }
            setConnected(true);
            setParticipantCount((result.peers?.length || 0) + 1);
            result.peers?.forEach((peer) => peerNamesRef.current.set(peer.socketId, peer.user.name));
            if (result.peers?.length === 0) setRemoteTiles([]);
            try {
              const { data } = await api.get(`/files/${roomId}`);
              if (active) setFiles(data.files);
            } catch (error) {
              if (active) setMeetingError(error.response?.data?.message || 'Could not load meeting files.');
            }
          });
        });
        connection.on('connect_error', (error) => setMeetingError(error.message === 'Authentication required.' ? 'Your session expired. Please sign in again.' : 'Could not connect to the meeting server.'));
        connection.on('participant:joined', ({ socketId, user: peerUser }) => {
          peerNamesRef.current.set(socketId, peerUser.name);
          createPeer(socketId, peerUser.name, true, rtcConfig.iceServers);
          setParticipantCount((count) => count + 1);
        });
        connection.on('participants:count', setParticipantCount);
        connection.on('file:shared', (file) => setFiles((current) => current.some((item) => item.id === file.id) ? current : [file, ...current]));
        connection.on('participant:left', ({ socketId }) => { peerNamesRef.current.delete(socketId); removePeer(socketId); });
        connection.on('participant:media', ({ socketId, audio, video, screen }) => {
          setRemoteTiles((current) => current.map((tile) => tile.id === socketId ? { ...tile, audio, video, screen } : tile));
        });
        connection.on('webrtc:signal', async ({ from, description, candidate }) => {
          let peer = peersRef.current.get(from);
          if (!peer) peer = createPeer(from, peerNamesRef.current.get(from) || 'Teammate', false, rtcConfig.iceServers);
          try {
            if (description) {
              await peer.pc.setRemoteDescription(description);
              for (const queuedCandidate of peer.pendingCandidates.splice(0)) {
                await peer.pc.addIceCandidate(queuedCandidate);
              }
              if (description.type === 'offer') {
                const answer = await peer.pc.createAnswer();
                await peer.pc.setLocalDescription(answer);
                connection.emit('webrtc:signal', { to: from, description: peer.pc.localDescription });
              }
            } else if (candidate) {
              if (peer.pc.remoteDescription) await peer.pc.addIceCandidate(candidate);
              else peer.pendingCandidates.push(candidate);
            }
          } catch (error) {
            setMeetingError(`A peer connection could not be established: ${error.message}`);
          }
        });
        connection.on('disconnect', () => setConnected(false));
      } catch (error) {
        if (active) setMeetingError(error.response?.data?.message || 'Could not prepare the meeting. Check the server and your sign-in.');
      }
    };
    join();
    return () => {
      active = false;
      connection?.disconnect();
      peersRef.current.forEach(({ pc }) => pc.close());
      peersRef.current.clear();
      localStreamRef.current?.getTracks().forEach((track) => track.stop());
      screenStreamRef.current?.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
      screenStreamRef.current = null;
      socketRef.current = null;
    };
  }, [roomId, createPeer, removePeer]);

  const emitMedia = (audio = audioOn, video = videoOn, screen = screenOn) => socketRef.current?.emit('participant:media', { audio, video, screen });
  const toggleAudio = () => {
    const next = !audioOn;
    localStreamRef.current?.getAudioTracks().forEach((track) => { track.enabled = next; });
    setAudioOn(next);
    emitMedia(next, videoOn, screenOn);
  };
  const toggleVideo = () => {
    const next = !videoOn;
    localStreamRef.current?.getVideoTracks().forEach((track) => { track.enabled = next; });
    setVideoOn(next);
    emitMedia(audioOn, next, screenOn);
  };
  const toggleScreen = async () => {
    if (screenOn) {
      const cameraTrack = localStreamRef.current?.getVideoTracks()[0] || null;
      peersRef.current.forEach((peer) => peer.videoSender?.replaceTrack(cameraTrack));
      screenStreamRef.current?.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
      setScreenOn(false);
      emitMedia(audioOn, videoOn, false);
      return;
    }
    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      const track = displayStream.getVideoTracks()[0];
      screenStreamRef.current = displayStream;
      peersRef.current.forEach((peer) => {
        if (peer.videoSender) peer.videoSender.replaceTrack(track);
        else peer.videoSender = peer.pc.addTrack(track, displayStream);
      });
      track.onended = () => {
        const cameraTrack = localStreamRef.current?.getVideoTracks()[0] || null;
        peersRef.current.forEach((peer) => peer.videoSender?.replaceTrack(cameraTrack));
        screenStreamRef.current?.getTracks().forEach((item) => item.stop());
        screenStreamRef.current = null;
        setScreenOn(false);
        emitMedia(audioOn, videoOn, false);
      };
      setScreenOn(true);
      emitMedia(audioOn, videoOn, true);
    } catch (error) {
      if (error.name !== 'NotAllowedError') setMeetingError('Screen sharing could not start in this browser.');
    }
  };
  const leaveMeeting = () => {
    socketRef.current?.emit('room:leave');
    navigate('/dashboard');
  };
  const copyMeetingId = async () => {
    try { await navigator.clipboard.writeText(roomId); setCopied(true); window.setTimeout(() => setCopied(false), 1600); }
    catch { setMeetingError('Could not copy the meeting ID.'); }
  };
  const uploadFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) { setMeetingError('Files must be 20 MB or smaller.'); return; }
    const form = new FormData();
    form.append('file', file);
    setUploading(true);
    try {
      const { data } = await api.post(`/files/${roomId}`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
      setFiles((current) => [data.file, ...current]);
    } catch (error) { setMeetingError(error.response?.data?.message || 'File upload failed.'); }
    finally { setUploading(false); }
  };
  const downloadFile = async (file) => {
    try {
      const { data } = await api.get(`/files/${roomId}/${file.id}`, { responseType: 'blob' });
      const url = URL.createObjectURL(data);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = file.name;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch { setMeetingError('Could not download this file.'); }
  };

  return <main className="meeting-page">
    <header className="meeting-topbar"><div className="meeting-brand"><Link to="/dashboard" className="meeting-back" aria-label="Back to dashboard"><ArrowLeft size={18} /></Link><span className="brand-mark"><Video size={18} /></span><div><strong>ConnectSphere</strong><small>Meeting room</small></div></div><div className="meeting-room-meta"><span className={`connection-indicator${connected ? ' online' : ''}`} />{connected ? 'Connected' : 'Connecting'}<span className="meeting-meta-divider" /><span className="meeting-id-label">ID <strong>{roomId}</strong></span><button className="icon-btn copy-meeting" title="Copy meeting ID" onClick={copyMeetingId}>{copied ? <Check size={15} /> : <Copy size={15} />}</button></div><div className="meeting-top-right"><span className="participant-counter"><Users size={16} /> {participantCount}</span><button className="meeting-more" aria-label="More options"><MoreHorizontal size={19} /></button></div></header>
    {meetingError && <div className="meeting-alert" role="alert">{meetingError}<button onClick={() => setMeetingError('')} aria-label="Dismiss"><X size={15} /></button></div>}
    {deviceWarning && <div className="meeting-alert meeting-warning" role="status">{deviceWarning}<button onClick={() => setDeviceWarning('')} aria-label="Dismiss"><X size={15} /></button></div>}
    <div className="meeting-layout">
      <section className="meeting-stage"><div className="stage-heading"><div><span className="section-kicker">YOUR SHARED SPACE</span><h1>Let's make it happen.</h1></div><span className="stage-live"><i /> LIVE MEETING</span></div>
        <div className={`video-grid${remoteTiles.length + 1 > 2 ? ' video-grid-many' : ''}`}>
          <VideoTile stream={screenOn ? screenStreamRef.current : localStream} name={user?.name} local audio={audioOn} video={videoOn} screen={screenOn} />
          {remoteTiles.map((tile) => <VideoTile key={tile.id} stream={tile.stream} name={tile.name} audio={tile.audio} video={tile.video} screen={tile.screen} />)}
          {!remoteTiles.length && <div className="invite-tile"><div className="invite-illustration"><div className="invite-orbit invite-orbit-one" /><div className="invite-orbit invite-orbit-two" /><span><Plus size={21} /></span></div><strong>Your room is ready</strong><p>Share the meeting ID to invite someone in.</p><button className="button button-quiet button-small" onClick={copyMeetingId}>{copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Copied!' : 'Copy meeting ID'}</button></div>}
        </div>
        <div className="meeting-controls"><div className="meeting-control-group"><button className={`round-control${!audioOn ? ' control-off' : ''}`} onClick={toggleAudio} title={audioOn ? 'Mute microphone' : 'Unmute microphone'}>{audioOn ? <Mic size={19} /> : <MicOff size={19} />}<span>{audioOn ? 'Mute' : 'Unmute'}</span></button><button className={`round-control${!videoOn ? ' control-off' : ''}`} onClick={toggleVideo} title={videoOn ? 'Turn camera off' : 'Turn camera on'}>{videoOn ? <Video size={19} /> : <VideoOff size={19} />}<span>{videoOn ? 'Camera' : 'Camera off'}</span></button><button className={`round-control${screenOn ? ' control-on' : ''}`} onClick={toggleScreen} title={screenOn ? 'Stop sharing screen' : 'Share screen'}><MonitorUp size={19} /><span>{screenOn ? 'Stop share' : 'Share screen'}</span></button><button className="round-control" onClick={() => setActiveTab('whiteboard')} title="Open whiteboard"><span className="control-draw">✎</span><span>Whiteboard</span></button></div><button className="leave-button" onClick={leaveMeeting}><PhoneOff size={19} /><span>Leave</span></button></div>
      </section>
      <aside className="meeting-sidebar"><div className="sidebar-tabs"><button className={activeTab === 'people' ? 'sidebar-tab active' : 'sidebar-tab'} onClick={() => setActiveTab('people')}><Users size={16} /> People <span>{participantCount}</span></button><button className={activeTab === 'files' ? 'sidebar-tab active' : 'sidebar-tab'} onClick={() => setActiveTab('files')}><FileUp size={16} /> Files</button><button className={activeTab === 'whiteboard' ? 'sidebar-tab active' : 'sidebar-tab'} onClick={() => setActiveTab('whiteboard')}><span className="tab-draw">✎</span> Board</button></div>
        {activeTab === 'people' && <div className="sidebar-content people-content"><div className="sidebar-section-heading"><div><h3>In this meeting</h3><p>Everyone in your room</p></div><span className="online-count">{participantCount} online</span></div><div className="participant-list"><div className="participant-row"><span className="avatar avatar-small">{user?.name?.charAt(0).toUpperCase()}</span><span className="participant-name">{user?.name} <small>You</small></span><span className={`participant-mic${audioOn ? '' : ' is-muted'}`}>{audioOn ? <Mic size={15} /> : <MicOff size={15} />}</span></div>{remoteTiles.map((tile) => <div className="participant-row" key={tile.id}><span className="avatar avatar-small">{tile.name?.charAt(0).toUpperCase()}</span><span className="participant-name">{tile.name}</span><span className={`participant-mic${tile.audio ? '' : ' is-muted'}`}>{tile.audio ? <Mic size={15} /> : <MicOff size={15} />}</span></div>)}</div><div className="sidebar-invite"><div className="invite-small-icon"><Plus size={16} /></div><strong>Bring someone in</strong><p>Share your meeting ID with a teammate.</p><button onClick={copyMeetingId} className="button button-outline button-small">{copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Copied!' : 'Copy meeting ID'}</button></div></div>}
        {activeTab === 'files' && <div className="sidebar-content files-content"><div className="sidebar-section-heading"><div><h3>Shared files</h3><p>Resources for this meeting</p></div><label className={`upload-button${uploading ? ' is-uploading' : ''}`} title="Upload a file">{uploading ? <LoaderCircle size={16} className="spin" /> : <Plus size={17} />}<input type="file" onChange={uploadFile} disabled={uploading} accept=".pdf,.txt,.csv,.json,.zip,.docx,.xlsx,.pptx,.png,.jpg,.jpeg,.gif,.webp,.mp3,.wav,.mp4" /></label></div><p className="file-limit">PDF, images, documents and media · max 20 MB</p>{files.length ? <div className="shared-files">{files.map((file) => <div className="file-row" key={file.id}><span className="file-type-icon"><FileUp size={17} /></span><div className="file-info"><strong title={file.name}>{file.name}</strong><small>{bytes(file.size)} · {new Date(file.uploadedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small></div><button className="icon-btn" title="Download file" onClick={() => downloadFile(file)}><Download size={16} /></button></div>)}</div> : <div className="files-empty"><FileUp size={22} /><strong>Nothing shared yet</strong><span>Upload a file to share it with everyone here.</span><label className="button button-outline button-small">Choose a file<input type="file" onChange={uploadFile} disabled={uploading} /></label></div>}</div>}
        {activeTab === 'whiteboard' && <div className="sidebar-content board-intro"><div className="board-mini-icon">✎</div><h3>Shared whiteboard</h3><p>Sketch out an idea together. Every stroke appears for everyone in this meeting.</p><button className="button button-outline button-small" onClick={() => document.querySelector('.whiteboard-panel')?.scrollIntoView({ behavior: 'smooth' })}>Open whiteboard</button></div>}
        <div className="sidebar-footer"><span className="security-dot" /> Your meeting is private and encrypted</div>
      </aside>
    </div>
    <section className="whiteboard-panel" id="whiteboard"><div className="whiteboard-panel-heading"><div><span className="section-kicker">MAKE IDEAS VISIBLE</span><h2>Team whiteboard</h2></div><span className="board-live"><i /> SYNCED LIVE</span></div><Whiteboard socket={socket} /></section>
  </main>;
}
