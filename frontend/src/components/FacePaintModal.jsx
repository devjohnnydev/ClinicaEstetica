import { useEffect, useRef, useState } from 'react';
import { FiX, FiRotateCcw, FiTrash2, FiCheck } from 'react-icons/fi';

const COLORS = ['#ff2d55', '#ff9500', '#ffd60a', '#30d158', '#0a84ff', '#5e5ce6', '#bf5af2', '#111111', '#ffffff'];

export default function FacePaintModal({ open, baseImageSrc, initialImage, onClose, onSave }) {
  const canvasRef = useRef(null);
  const wrapperRef = useRef(null);
  const [ctxReady, setCtxReady] = useState(false);
  const [currentColor, setCurrentColor] = useState('#ff2d55');
  const [lineWidth, setLineWidth] = useState(4);
  const [history, setHistory] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [activePointerId, setActivePointerId] = useState(null);

  useEffect(() => {
    if (!open || !canvasRef.current || !baseImageSrc) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const maxW = Math.min(window.innerWidth - 80, 1000);
      const maxH = Math.min(window.innerHeight - 190, 900);
      const ratio = Math.min(maxW / img.width, maxH / img.height, 1);
      canvas.width = Math.floor(img.width * ratio);
      canvas.height = Math.floor(img.height * ratio);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      if (initialImage) {
        const edited = new Image();
        edited.onload = () => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(edited, 0, 0, canvas.width, canvas.height);
          setHistory([canvas.toDataURL('image/png')]);
          setCtxReady(true);
        };
        edited.src = initialImage;
      } else {
        setHistory([canvas.toDataURL('image/png')]);
        setCtxReady(true);
      }
    };
    img.src = baseImageSrc;
  }, [open, baseImageSrc, initialImage]);

  const getPoint = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const drawStart = (e) => {
    if (!ctxReady || !canvasRef.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (activePointerId !== null) return;
    setActivePointerId(e.pointerId);
    canvas.setPointerCapture(e.pointerId);
    const ctx = canvas.getContext('2d');
    const p = getPoint(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = currentColor;
    ctx.lineWidth = lineWidth;
    setIsDrawing(true);
  };

  const drawMove = (e) => {
    if (!isDrawing || e.pointerId !== activePointerId || !canvasRef.current) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext('2d');
    const p = getPoint(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  };

  const drawEnd = (e) => {
    if (!canvasRef.current || e.pointerId !== activePointerId) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.closePath();
    setIsDrawing(false);
    setActivePointerId(null);
    setHistory((prev) => [...prev, canvas.toDataURL('image/png')]);
  };

  const handleUndo = () => {
    if (history.length <= 1 || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const nextHistory = history.slice(0, -1);
    const snapshot = nextHistory[nextHistory.length - 1];
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      setHistory(nextHistory);
    };
    img.src = snapshot;
  };

  const handleClear = () => {
    if (!history.length || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      setHistory([history[0], canvas.toDataURL('image/png')]);
    };
    img.src = history[0];
  };

  const handleSave = () => {
    if (!canvasRef.current) return;
    onSave(canvasRef.current.toDataURL('image/png'));
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col">
      <div className="p-3 sm:p-4 border-b border-white/15 flex flex-wrap items-center gap-2">
        <button onClick={onClose} className="px-3 py-2 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-colors flex items-center gap-2">
          <FiX size={16} />
          Fechar
        </button>
        <div className="h-6 w-px bg-white/20" />
        {COLORS.map((color) => (
          <button
            key={color}
            onClick={() => setCurrentColor(color)}
            className={`w-7 h-7 rounded-full border-2 transition-transform ${currentColor === color ? 'border-white scale-110' : 'border-white/30'}`}
            style={{ backgroundColor: color }}
            title={color}
          />
        ))}
        <div className="ml-2 flex items-center gap-2 text-white text-sm">
          Traço
          <input type="range" min="1" max="16" value={lineWidth} onChange={(e) => setLineWidth(Number(e.target.value))} />
        </div>
        <button onClick={handleUndo} className="ml-auto px-3 py-2 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-colors flex items-center gap-2">
          <FiRotateCcw size={16} />
          Voltar
        </button>
        <button onClick={handleClear} className="px-3 py-2 rounded-xl bg-red-500/80 text-white hover:bg-red-500 transition-colors flex items-center gap-2">
          <FiTrash2 size={16} />
          Limpar
        </button>
        <button onClick={handleSave} className="px-3 py-2 rounded-xl bg-green-500 text-white hover:bg-green-600 transition-colors flex items-center gap-2">
          <FiCheck size={16} />
          Salvar
        </button>
      </div>
      <div ref={wrapperRef} className="flex-1 overflow-auto p-3 sm:p-6 flex items-center justify-center">
        <canvas
          ref={canvasRef}
          className="max-w-full h-auto bg-white rounded-xl shadow-2xl touch-none"
          onPointerDown={drawStart}
          onPointerMove={drawMove}
          onPointerUp={drawEnd}
          onPointerCancel={drawEnd}
        />
      </div>
    </div>
  );
}
