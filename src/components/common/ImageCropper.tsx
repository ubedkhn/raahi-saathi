import { useState, useRef, useCallback, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ZoomIn, RotateCw } from "lucide-react";

interface ImageCropperProps {
  imageSrc: string;
  open: boolean;
  onClose: () => void;
  onCropComplete: (croppedBlob: Blob) => void;
}

const ImageCropper = ({ imageSrc, open, onClose, onCropComplete }: ImageCropperProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);

  const CANVAS_SIZE = 280;

  useEffect(() => {
    if (!imageSrc || !open) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imageRef.current = img;
      setImageLoaded(true);
      setZoom(1);
      setOffset({ x: 0, y: 0 });
    };
    img.src = imageSrc;
  }, [imageSrc, open]);

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Draw circular clip
    ctx.save();
    ctx.beginPath();
    ctx.arc(CANVAS_SIZE / 2, CANVAS_SIZE / 2, CANVAS_SIZE / 2, 0, Math.PI * 2);
    ctx.clip();

    // Calculate scaled dimensions maintaining aspect ratio
    const scale = zoom;
    const minDim = Math.min(img.width, img.height);
    const drawSize = (CANVAS_SIZE / minDim) * scale;
    const drawW = img.width * drawSize;
    const drawH = img.height * drawSize;
    const drawX = (CANVAS_SIZE - drawW) / 2 + offset.x;
    const drawY = (CANVAS_SIZE - drawH) / 2 + offset.y;

    ctx.drawImage(img, drawX, drawY, drawW, drawH);
    ctx.restore();

    // Draw circular border
    ctx.beginPath();
    ctx.arc(CANVAS_SIZE / 2, CANVAS_SIZE / 2, CANVAS_SIZE / 2 - 1, 0, Math.PI * 2);
    ctx.strokeStyle = "hsl(var(--primary))";
    ctx.lineWidth = 2;
    ctx.stroke();
  }, [zoom, offset, imageLoaded]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  const handlePointerDown = (e: React.PointerEvent) => {
    setDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    setOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handlePointerUp = () => setDragging(false);

  const handleCrop = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Create output canvas at higher res
    const outputCanvas = document.createElement("canvas");
    outputCanvas.width = 512;
    outputCanvas.height = 512;
    const outCtx = outputCanvas.getContext("2d");
    if (!outCtx) return;

    // Scale up the current canvas content
    outCtx.beginPath();
    outCtx.arc(256, 256, 256, 0, Math.PI * 2);
    outCtx.clip();

    const img = imageRef.current;
    if (!img) return;

    const scale = zoom;
    const minDim = Math.min(img.width, img.height);
    const ratio = 512 / CANVAS_SIZE;
    const drawSize = (CANVAS_SIZE / minDim) * scale;
    const drawW = img.width * drawSize * ratio;
    const drawH = img.height * drawSize * ratio;
    const drawX = ((CANVAS_SIZE - img.width * drawSize) / 2 + offset.x) * ratio;
    const drawY = ((CANVAS_SIZE - img.height * drawSize) / 2 + offset.y) * ratio;

    outCtx.drawImage(img, drawX, drawY, drawW, drawH);

    outputCanvas.toBlob(
      (blob) => {
        if (blob) onCropComplete(blob);
      },
      "image/jpeg",
      0.9
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Crop Profile Photo</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4">
          <canvas
            ref={canvasRef}
            width={CANVAS_SIZE}
            height={CANVAS_SIZE}
            className="cursor-grab active:cursor-grabbing touch-none rounded-full"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          />

          <div className="flex items-center gap-3 w-full px-4">
            <ZoomIn className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <Slider
              value={[zoom]}
              onValueChange={([v]) => setZoom(v)}
              min={0.5}
              max={3}
              step={0.05}
              className="flex-1"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleCrop}>Save Photo</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ImageCropper;
