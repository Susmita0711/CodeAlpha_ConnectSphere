import { useEffect, useRef, useState } from 'react';
import { Eraser, RotateCcw, Trash2 } from 'lucide-react';

const colors = ['#e85d75', '#f4a261', '#f1c453', '#42b883', '#42a5f5', '#8676f4', '#17233b'];

export default function Whiteboard({ socket }) {
  const canvasRef = useRef(null);
  const drawingRef = useRef(false);
  const previousRef = useRef(null);
  const [color, setColor] = useState(colors[0]);
  const [size, setSize] = useState(4);
  const [eraser, setEraser] = useState(false);

  const context = () => canvasRef.current?.getContext('2d');
  const drawSegment = (line) => {
    const canvas = canvasRef.current;
    const ctx = context();
    if (!canvas || !ctx) return;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = line.size;
    ctx.globalCompositeOperation = line.erase ? 'destination-out' : 'source-over';
    ctx.strokeStyle = line.color;
    ctx.beginPath();
    ctx.moveTo(line.x0 * canvas.clientWidth, line.y0 * canvas.clientHeight);
    ctx.lineTo(line.x1 * canvas.clientWidth, line.y1 * canvas.clientHeight);
    ctx.stroke();
    ctx.restore();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, rect.width * ratio);
      canvas.height = Math.max(1, rect.height * ratio);
      canvas.getContext('2d')?.setTransform(ratio, 0, 0, ratio, 0, 0);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!socket) return undefined;
    const onDraw = (line) => drawSegment(line);
    const onClear = () => context()?.clearRect(0, 0, canvasRef.current?.width || 0, canvasRef.current?.height || 0);
    socket.on('whiteboard:draw', onDraw);
    socket.on('whiteboard:clear', onClear);
    return () => {
      socket.off('whiteboard:draw', onDraw);
      socket.off('whiteboard:clear', onClear);
    };
  }, [socket]);

  const point = (event) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: (event.clientX - rect.left) / rect.width, y: (event.clientY - rect.top) / rect.height };
  };
  const start = (event) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    drawingRef.current = true;
    previousRef.current = point(event);
  };
  const move = (event) => {
    if (!drawingRef.current || !previousRef.current) return;
    const next = point(event);
    const line = { x0: previousRef.current.x, y0: previousRef.current.y, x1: next.x, y1: next.y, color, size, erase: eraser };
    drawSegment(line);
    socket?.emit('whiteboard:draw', line);
    previousRef.current = next;
  };
  const stop = () => { drawingRef.current = false; previousRef.current = null; };
  const clear = () => {
    context()?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    socket?.emit('whiteboard:clear');
  };

  return <div className="whiteboard-wrap">
    <div className="whiteboard-toolbar"><div className="color-options">{colors.map((item) => <button key={item} title={`Use ${item}`} aria-label={`Use ${item}`} className={`color-dot${color === item && !eraser ? ' selected' : ''}`} style={{ backgroundColor: item }} onClick={() => { setColor(item); setEraser(false); }} />)}</div><span className="toolbar-divider" /><label className="brush-size">Brush <input type="range" min="2" max="18" value={size} onChange={(event) => setSize(Number(event.target.value))} /><span>{size}px</span></label><button className={`tool-button${eraser ? ' tool-active' : ''}`} title="Eraser" onClick={() => setEraser(!eraser)}><Eraser size={16} /> Eraser</button><button className="tool-button clear-tool" onClick={clear}><Trash2 size={16} /> Clear</button></div>
    <canvas ref={canvasRef} className="whiteboard-canvas" onPointerDown={start} onPointerMove={move} onPointerUp={stop} onPointerCancel={stop} onPointerLeave={stop} />
    <div className="whiteboard-hint"><RotateCcw size={13} /> Your team's strokes appear here in real time</div>
  </div>;
}
