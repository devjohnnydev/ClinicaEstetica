import { useRef, useEffect, useState } from 'react';
import { FiTrash2 } from 'react-icons/fi';

export default function SignatureCanvas({ onSave, label = "Assinatura", hint }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasContent, setHasContent] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    // Set canvas size
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = 200;
    
    ctx.strokeStyle = '#3A3A3A';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Handle resize
    const handleResize = () => {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const newRect = canvas.parentElement.getBoundingClientRect();
      canvas.width = newRect.width;
      canvas.height = 200;
      ctx.putImageData(imageData, 0, 0);
      ctx.strokeStyle = '#3A3A3A';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    if (e.touches) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const startDrawing = (e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    setHasContent(true);
  };

  const stopDrawing = (e) => {
    if (e) e.preventDefault();
    setIsDrawing(false);
    if (hasContent && onSave) {
      const canvas = canvasRef.current;
      onSave(canvas.toDataURL('image/png'));
    }
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasContent(false);
    if (onSave) onSave(null);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-dark/60">{label}</label>
        {hasContent && (
          <button
            type="button"
            onClick={clear}
            className="text-xs text-dark/40 hover:text-red-400 flex items-center gap-1 transition-colors"
          >
            <FiTrash2 size={12} />
            Limpar
          </button>
        )}
      </div>
      <div className="relative rounded-2xl overflow-hidden border-2 border-dashed border-secondary hover:border-accent transition-colors">
        <canvas
          ref={canvasRef}
          className="signature-canvas w-full"
          style={{ touchAction: 'none' }}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
        {!hasContent && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none px-4 text-center">
            <p className="text-dark/20 text-sm">
              {hint || 'Assine aqui — use mouse, touch ou caneta digital'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
