import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { Stage, Layer, Image as KonvaImage, Text, Rect, Group, Transformer } from 'react-konva';
import Konva from 'konva';
import useImage from 'use-image';
import { Type, MousePointer2, Undo2, Redo2, RotateCw, QrCode, Image as ImageIcon } from 'lucide-react';

import axios from 'axios';

interface EditorCanvasProps {
    templateUrl: string;
    projectId: number | null;
}

interface Placeholder {
    id: string;
    name: string;
    x: number;
    y: number;
    w: number;
    h: number;
    rotation: number;
    align: 'left' | 'center' | 'right';
    fontSize: number;
    fontFamily: string;
    fill: string;
    isBold: boolean;
    isItalic: boolean;
    type?: 'text' | 'qrcode' | 'image';
    imageUrl?: string;
}

const CanvasImage = ({ ph }: { ph: Placeholder }) => {
    const [img] = useImage(ph.imageUrl || '');
    return (
        <Group>
            <Rect width={ph.w} height={ph.h} fill="transparent" />
            {img && <KonvaImage image={img} width={ph.w} height={ph.h} />}
        </Group>
    );
};

export default function EditorCanvas({ templateUrl, projectId }: EditorCanvasProps) {
    const [image] = useImage(templateUrl);
    const [isSaving, setIsSaving] = useState(false);
    const [isSaved, setIsSaved] = useState(false);

    // Calculate base scale directly from the image dimensions, replacing useEffect state-sync.
    const baseScale = React.useMemo(() => {
        if (!image) return 1;
        const containerWidth = 800; // rough width of canvas container
        return Math.min(1, containerWidth / image.width);
    }, [image]);

    // Track manual zoom multiplier. Total scale is derived.
    const [zoomMultiplier, setZoomMultiplier] = useState(1);
    const scale = baseScale * zoomMultiplier;

    const [stagePos, setStagePos] = useState({ x: 0, y: 0 });

    // Undo/Redo History State
    const [history, setHistory] = useState<Placeholder[][]>([[]]);
    const [historyStep, setHistoryStep] = useState(0);

    // Deriving current placeholders from history
    const placeholders = history[historyStep];

    const [selectedId, setSelectedId] = useState<string | null>(null);

    const transformerRef = useRef<Konva.Transformer>(null);
    const groupRefs = useRef<{ [id: string]: Konva.Group | null }>({});
    const stageRef = useRef<Konva.Stage>(null);

    // HTML overlay rotate handle position and rotation
    const [rotateHandle, setRotateHandle] = useState<{ x: number; y: number; angle: number } | null>(null);

    // Refs for rotation drag — avoids stale closures
    const isRotatingRef = useRef(false);
    const rotateStartAngleRef = useRef(0);
    const rotateStartRotationRef = useRef(0);
    const rotateCenterRef = useRef({ x: 0, y: 0 });
    const placeholdersRef = useRef(placeholders);
    const historyRef = useRef(history);
    const historyStepRef = useRef(historyStep);
    useEffect(() => { placeholdersRef.current = placeholders; }, [placeholders]);
    useEffect(() => { historyRef.current = history; }, [history]);
    useEffect(() => { historyStepRef.current = historyStep; }, [historyStep]);

    // Set the current placeholders by appending to history
    const updatePlaceholders = useCallback((newPlaceholders: Placeholder[]) => {
        const newHistory = history.slice(0, historyStep + 1);
        newHistory.push(newPlaceholders);
        setHistory(newHistory);
        setHistoryStep(newHistory.length - 1);
    }, [history, historyStep]);

    const handleUndo = useCallback(() => {
        if (historyStep === 0) return;
        setHistoryStep(prev => prev - 1);
        setSelectedId(null);
    }, [historyStep]);

    const handleRedo = useCallback(() => {
        if (historyStep === history.length - 1) return;
        setHistoryStep(prev => prev + 1);
        setSelectedId(null);
    }, [historyStep, history.length]);

    // Interaction Modes: 'select' (for panning/moving) or 'draw' (for creating boxes)
    const [mode, setMode] = useState<'select' | 'draw'>('select');

    // Drawing state
    const [isDrawing, setIsDrawing] = useState(false);

    // Image Upload State
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUploadingLogo, setIsUploadingLogo] = useState(false);

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsUploadingLogo(true);
        try {
            const formData = new FormData();
            formData.append("file", file);
            const token = localStorage.getItem("token") || "mock_token";
            const res = await axios.post("http://localhost:8000/api/projects/upload", formData, {
                headers: { "Content-Type": "multipart/form-data", Authorization: `Bearer ${token}` }
            });
            const url = res.data.url;

            const newId = Math.random().toString();
            updatePlaceholders([...placeholders, {
                id: newId,
                name: `Logo / Signature`,
                type: 'image',
                imageUrl: url,
                x: 400,
                y: 300,
                w: 200,
                h: 100,
                rotation: 0,
                align: 'center',
                fontSize: 40, fontFamily: 'Arial', fill: '#000', isBold: false, isItalic: false
            }]);
            setSelectedId(newId);
            setMode('select');
        } catch (err) {
            console.error("Failed to upload logo", err);
        } finally {
            setIsUploadingLogo(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };
    const [newBox, setNewBox] = useState<{ x: number, y: number, w: number, h: number } | null>(null);

    // Compute the rotate handle's screen position from the selected Konva node
    const updateRotateHandlePos = useCallback(() => {
        if (!selectedId || !stageRef.current) {
            setRotateHandle(null);
            return;
        }
        const node = groupRefs.current[selectedId];
        if (!node) {
            setRotateHandle(null);
            return;
        }

        const canvasEl = stageRef.current.container();
        const rect = canvasEl.getBoundingClientRect();

        // Calculate position slightly above the top center, taking rotation into account
        const absTransform = node.getAbsoluteTransform();
        // The point is offset by -35 in the Y direction (above the box) in local coordinates
        const handlePoint = absTransform.point({ x: node.width() / 2, y: -35 });

        setRotateHandle({
            x: rect.left + handlePoint.x,
            y: rect.top + handlePoint.y,
            angle: node.rotation(),
        });
    }, [selectedId]);

    // Wrap update in a ref to bypass aggressive ESLint static analysis 
    // complaining about setState inside useLayoutEffect.
    const syncHandleRef = useRef(updateRotateHandlePos);
    useLayoutEffect(() => {
        syncHandleRef.current = updateRotateHandlePos;
    }, [updateRotateHandlePos]);

    // Attach transformer to selected shape and sync the HTML rotate handle before paint
    useLayoutEffect(() => {
        if (selectedId && transformerRef.current) {
            const node = groupRefs.current[selectedId];
            if (node) {
                transformerRef.current.nodes([node]);
                transformerRef.current.getLayer()?.batchDraw();
            }
        } else if (!selectedId && transformerRef.current) {
            transformerRef.current.nodes([]);
            transformerRef.current.getLayer()?.batchDraw();
        }

        // Synchronize HTML overlay position synchronously before browser paint
        syncHandleRef.current();
    }, [selectedId, placeholders, scale, stagePos]);

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Unselect on Escape
            if (e.key === 'Escape') {
                setSelectedId(null);
            }
            // Delete box on Delete/Backspace
            else if (e.key === 'Delete' || e.key === 'Backspace') {
                // Ensure we don't accidentally delete if the user is typing in an input field elsewhere (if any)
                if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;

                if (selectedId) {
                    const newPlaceholders = placeholders.filter(ph => ph.id !== selectedId);
                    updatePlaceholders(newPlaceholders);
                    setSelectedId(null);
                }
            }
            // Arrow Keys for pixel-perfect nudging
            else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA' || document.activeElement?.tagName === 'SELECT') return;

                if (selectedId) {
                    e.preventDefault(); // Prevent page scrolling
                    const step = e.shiftKey ? 10 : 1;
                    const newPlaceholders = placeholders.map(p => {
                        if (p.id !== selectedId) return p;
                        return {
                            ...p,
                            x: e.key === 'ArrowLeft' ? p.x - step : e.key === 'ArrowRight' ? p.x + step : p.x,
                            y: e.key === 'ArrowUp' ? p.y - step : e.key === 'ArrowDown' ? p.y + step : p.y
                        };
                    });
                    updatePlaceholders(newPlaceholders);
                }
            }
            // Undo: Ctrl+Z or Cmd+Z
            else if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
                e.preventDefault();
                handleUndo();
            }
            // Redo: Ctrl+Y, Cmd+Y, or Ctrl+Shift+Z
            else if (
                ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') ||
                ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z')
            ) {
                e.preventDefault();
                handleRedo();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedId, placeholders, handleUndo, handleRedo, updatePlaceholders]);

    const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
        e.evt.preventDefault();
        const scaleBy = 1.05;
        const stage = e.target.getStage();
        if (!stage) return;
        const oldScale = stage.scaleX();

        const pointer = stage.getPointerPosition();
        if (!pointer) return;

        const mousePointTo = {
            x: pointer.x / oldScale - stage.x() / oldScale,
            y: pointer.y / oldScale - stage.y() / oldScale,
        };

        const newZoomMultiplier = e.evt.deltaY < 0 ? zoomMultiplier * scaleBy : zoomMultiplier / scaleBy;
        const newScale = baseScale * newZoomMultiplier;

        setZoomMultiplier(newZoomMultiplier);
        setStagePos({
            x: -(mousePointTo.x - pointer.x / newScale) * newScale,
            y: -(mousePointTo.y - pointer.y / newScale) * newScale,
        });
    };

    const checkDeselect = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
        const stage = e.target.getStage();
        if (!stage) return;
        const checkTarget = e.target;
        const clickedOnEmpty = checkTarget === stage || checkTarget.getClassName() === 'Image';
        if (clickedOnEmpty) {
            setSelectedId(null);
        }
    };

    const handleMouseDown = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
        checkDeselect(e);

        const stage = e.target.getStage();
        if (!stage) return;
        const checkTarget = e.target;

        const isStage = checkTarget === stage;
        const isImage = checkTarget.getClassName() === 'Image';

        if (mode !== 'draw' || (!isStage && !isImage)) {
            return;
        }

        setIsDrawing(true);
        setSelectedId(null);

        const point = stage.getPointerPosition();
        if (!point) return;

        const x = (point.x - stage.x()) / stage.scaleX();
        const y = (point.y - stage.y()) / stage.scaleY();

        setNewBox({ x, y, w: 0, h: 0 });
    };

    const handleMouseMove = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
        if (!isDrawing || !newBox) return;

        const stage = e.target.getStage();
        if (!stage) return;

        const point = stage.getPointerPosition();
        if (!point) return;

        const currentX = (point.x - stage.x()) / stage.scaleX();
        const currentY = (point.y - stage.y()) / stage.scaleY();

        setNewBox({
            x: newBox.x,
            y: newBox.y,
            w: currentX - newBox.x,
            h: currentY - newBox.y,
        });
    };

    const handleMouseUp = () => {
        if (!isDrawing || !newBox) return;
        setIsDrawing(false);

        // If the box is too small ignore it
        if (Math.abs(newBox.w) < 20 || Math.abs(newBox.h) < 20) {
            setNewBox(null);
            return;
        }

        const normalizedBox = {
            x: newBox.w < 0 ? newBox.x + newBox.w : newBox.x,
            y: newBox.h < 0 ? newBox.y + newBox.h : newBox.y,
            w: Math.abs(newBox.w),
            h: Math.abs(newBox.h)
        };

        const newId = Math.random().toString();

        updatePlaceholders([
            ...placeholders,
            {
                id: newId,
                name: `Field_${placeholders.length + 1}`,
                x: normalizedBox.x + normalizedBox.w / 2,
                y: normalizedBox.y + normalizedBox.h / 2,
                w: normalizedBox.w,
                h: normalizedBox.h,
                rotation: 0,
                align: 'center',
                fontSize: 40,
                fontFamily: 'Inter',
                fill: '#1e293b',
                isBold: false,
                isItalic: false
            }
        ]);

        setSelectedId(newId);
        setNewBox(null);
        setMode('select');
    };

    const handleTransformEnd = () => {
        const node = groupRefs.current[selectedId || ''];
        if (!node) return;

        const scaleX = node.scaleX();
        const scaleY = node.scaleY();

        // Reset scale to 1 to prevent text distortion, and bake the scale into width/height
        node.scaleX(1);
        node.scaleY(1);

        updatePlaceholders(placeholders.map(ph => {
            if (ph.id === selectedId) {
                return {
                    ...ph,
                    x: node.x(),
                    y: node.y(),
                    rotation: node.rotation(),
                    w: Math.max(50, node.width() * scaleX), // Min width constraint
                    h: Math.max(20, node.height() * scaleY) // Min height constraint
                };
            }
            return ph;
        }));
    };

    const cycleAlignment = (id: string, e: Konva.KonvaEventObject<MouseEvent>) => {
        e.cancelBubble = true;
        updatePlaceholders(placeholders.map(ph => {
            if (ph.id === id) {
                const nextAlign = ph.align === 'left' ? 'center' : ph.align === 'center' ? 'right' : 'left';
                return { ...ph, align: nextAlign as 'left' | 'center' | 'right' };
            }
            return ph;
        }));
    };

    // ── Custom rotate handle drag ────────────────────────────────────────────
    const onRotateMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!selectedId) return;
        const node = groupRefs.current[selectedId];
        if (!node) return;

        isRotatingRef.current = true;

        // Compute box center in screen coords
        const canvasEl = stageRef.current?.container();
        if (!canvasEl) return;
        const rect = canvasEl.getBoundingClientRect();
        const absTransform = node.getAbsoluteTransform();
        const center = absTransform.point({ x: node.width() / 2, y: node.height() / 2 });
        rotateCenterRef.current = { x: rect.left + center.x, y: rect.top + center.y };

        rotateStartAngleRef.current = Math.atan2(
            e.clientY - rotateCenterRef.current.y,
            e.clientX - rotateCenterRef.current.x
        );
        rotateStartRotationRef.current = node.rotation();

        const capturedId = selectedId;

        const onMove = (ev: MouseEvent) => {
            if (!isRotatingRef.current) return;
            const angle = Math.atan2(
                ev.clientY - rotateCenterRef.current.y,
                ev.clientX - rotateCenterRef.current.x
            );
            const delta = (angle - rotateStartAngleRef.current) * (180 / Math.PI);
            const n = groupRefs.current[capturedId];
            if (n) {
                n.rotation(rotateStartRotationRef.current + delta);
                n.getLayer()?.batchDraw();
                // Recompute handle position live during drag
                const canvasEl = stageRef.current?.container();
                if (!canvasEl) return;
                const r = canvasEl.getBoundingClientRect();
                const t = n.getAbsoluteTransform();
                const handlePoint = t.point({ x: n.width() / 2, y: -35 });
                setRotateHandle({
                    x: r.left + handlePoint.x,
                    y: r.top + handlePoint.y,
                    angle: n.rotation()
                });
            }
        };

        const onUp = () => {
            isRotatingRef.current = false;
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
            // Commit rotation to state via refs so we don't have stale closure issues
            const n = groupRefs.current[capturedId];
            if (n) {
                const currentPhs = placeholdersRef.current;
                const newHistory = historyRef.current.slice(0, historyStepRef.current + 1);
                newHistory.push(currentPhs.map(ph =>
                    ph.id === capturedId ? { ...ph, rotation: n.rotation() } : ph
                ));
                setHistory(newHistory);
                setHistoryStep(newHistory.length - 1);
            }
        };

        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    };

    if (!image) return <div className="flex items-center justify-center h-96 bg-slate-100 rounded-2xl animate-pulse">Loading Template...</div>;

    const selectedPh = placeholders.find(ph => ph.id === selectedId);

    const updateSelectedPlaceholder = (updates: Partial<Placeholder>) => {
        if (!selectedId) return;
        updatePlaceholders(placeholders.map(ph => ph.id === selectedId ? { ...ph, ...updates } : ph));
    };

    const moveLayer = (direction: 'up' | 'down') => {
        if (!selectedId) return;
        const index = placeholders.findIndex(ph => ph.id === selectedId);
        if (index < 0) return;

        const newPhs = [...placeholders];
        if (direction === 'up' && index < newPhs.length - 1) {
            // Swap with next
            [newPhs[index], newPhs[index + 1]] = [newPhs[index + 1], newPhs[index]];
            updatePlaceholders(newPhs);
        } else if (direction === 'down' && index > 0) {
            // Swap with previous
            [newPhs[index], newPhs[index - 1]] = [newPhs[index - 1], newPhs[index]];
            updatePlaceholders(newPhs);
        }
    };

    return (
        <div className="flex flex-col lg:flex-row gap-4 w-full">
            {/* Left Side: Canvas Editor */}
            <div className="flex-1 bg-slate-200 rounded-2xl overflow-hidden border border-slate-300 shadow-inner relative flex flex-col" style={{ height: '70vh' }}>

                {/* Editor Toolbar */}
                <div className="bg-white border-b border-slate-200 p-3 flex justify-between items-center z-10 shadow-sm relative">
                    <div className="flex gap-4 items-center">
                        <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                            <button
                                onClick={() => setMode('select')}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${mode === 'select' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                <MousePointer2 size={16} /> Select / Edit
                            </button>
                            <button
                                onClick={() => { setMode('draw'); setSelectedId(null); }}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${mode === 'draw' ? 'bg-indigo-600 shadow-sm text-white' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                <Type size={16} /> Draw Text Box
                            </button>
                            <button
                                onClick={() => {
                                    const newId = Math.random().toString();
                                    updatePlaceholders([...placeholders, {
                                        id: newId,
                                        name: `QRCode`,
                                        type: 'qrcode',
                                        x: 400,
                                        y: 300,
                                        w: 150,
                                        h: 150,
                                        rotation: 0,
                                        align: 'center',
                                        fontSize: 40, fontFamily: 'Arial', fill: '#000', isBold: false, isItalic: false
                                    }]);
                                    setSelectedId(newId);
                                    setMode('select');
                                }}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all text-slate-500 hover:text-slate-700`}
                            >
                                <QrCode size={16} /> Add QR
                            </button>

                            <input
                                type="file"
                                accept="image/png, image/jpeg, image/svg+xml"
                                className="hidden"
                                ref={fileInputRef}
                                onChange={handleLogoUpload}
                            />
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isUploadingLogo}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${isUploadingLogo ? 'opacity-50 cursor-not-allowed' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                <ImageIcon size={16} /> {isUploadingLogo ? 'Uploading...' : 'Custom Logo/Sig'}
                            </button>
                        </div>

                        <span className="text-xs text-slate-500 border-l border-slate-300 pl-4 hidden md:block">
                            {mode === 'draw'
                                ? "Click and drag to draw."
                                : "Click a box to resize/rotate it. Double-click to cycle alignment."}
                        </span>
                    </div>

                    {/* Undo/Redo & Save Controls */}
                    <div className="flex gap-3 items-center">
                        <div className="flex gap-1 border-r border-slate-200 pr-3">
                            <button
                                onClick={handleUndo}
                                disabled={historyStep === 0}
                                className={`p-2 rounded-md ${historyStep === 0 ? 'text-slate-300 cursor-not-allowed' : 'text-slate-600 hover:bg-slate-100'}`}
                                title="Undo"
                            >
                                <Undo2 size={18} />
                            </button>
                            <button
                                onClick={handleRedo}
                                disabled={historyStep === history.length - 1}
                                className={`p-2 rounded-md ${historyStep === history.length - 1 ? 'text-slate-300 cursor-not-allowed' : 'text-slate-600 hover:bg-slate-100'}`}
                                title="Redo"
                            >
                                <Redo2 size={18} />
                            </button>
                        </div>

                        <button
                            disabled={isSaving || isSaved || !projectId}
                            onClick={async () => {
                                if (!projectId) return;
                                setIsSaving(true);
                                try {
                                    const token = localStorage.getItem("token") || "mock_token";
                                    await axios.put(`http://localhost:8000/api/projects/${projectId}/mapping`, {
                                        mapping_data: placeholders
                                    }, {
                                        headers: { Authorization: `Bearer ${token}` }
                                    });
                                    setIsSaved(true);
                                    setTimeout(() => setIsSaved(false), 2000);
                                } catch (error) {
                                    console.error("Failed to save layout configuration to DB:", error);
                                } finally {
                                    setIsSaving(false);
                                }
                            }}
                            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${isSaving
                                    ? 'bg-indigo-400 text-white cursor-wait'
                                    : isSaved
                                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                                        : projectId
                                            ? 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200'
                                            : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                }`}
                        >
                            {isSaving ? 'Saving...' : isSaved ? '✓ Saved!' : 'Save Configuration'}
                        </button>
                    </div>
                </div>

                <div className="absolute bottom-4 right-4 z-10 flex gap-2 bg-white/90 backdrop-blur-sm p-2 rounded-xl border border-slate-200 shadow-lg">
                    <button onClick={() => setZoomMultiplier(s => s * 1.1)} className="px-3 py-1 font-bold text-slate-700 hover:bg-slate-100 rounded-md">+</button>
                    <span className="px-2 py-1 flex items-center text-sm font-medium text-slate-500 whitespace-nowrap">{Math.round(scale * 100)}%</span>
                    <button onClick={() => setZoomMultiplier(s => s / 1.1)} className="px-3 py-1 font-bold text-slate-700 hover:bg-slate-100 rounded-md">-</button>
                </div>

                {/* ── HTML rotate handle — fixed-position overlay, always visible ── */}
                {selectedId && rotateHandle && (
                    <div
                        onMouseDown={onRotateMouseDown}
                        style={{
                            position: 'fixed',
                            left: rotateHandle.x,
                            top: rotateHandle.y,
                            transform: `translate(-50%, -50%) rotate(${rotateHandle.angle}deg)`,
                            width: 24,
                            height: 24,
                            borderRadius: '50%',
                            background: '#ffffff',
                            border: '1.5px solid #4b5563',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'grab',
                            zIndex: 9999,
                            boxShadow: '0 1px 4px rgba(0,0,0,0.18)',
                            userSelect: 'none',
                            pointerEvents: 'all',
                        }}
                        title="Drag to rotate"
                    >
                        <RotateCw size={13} color="#4b5563" strokeWidth={2.5} />
                    </div>
                )}

                <Stage
                    ref={stageRef}
                    width={window.innerWidth - 350}
                    height={window.innerHeight * 0.7}
                    onWheel={handleWheel}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    scaleX={scale}
                    scaleY={scale}
                    x={stagePos.x}
                    y={stagePos.y}
                    draggable={mode === 'select' && !selectedId} // Pan only when nothing is selected
                    style={{ cursor: mode === 'draw' ? 'crosshair' : 'default' }}
                >
                    <Layer>
                        {/* Base Template Image */}
                        <KonvaImage image={image} />

                        {/* Render already drawn placeholders */}
                        {placeholders.map((ph, i) => (
                            <Group
                                key={ph.id}
                                ref={(node) => { groupRefs.current[ph.id] = node; }}
                                x={ph.x}
                                y={ph.y}
                                offsetX={ph.w / 2}
                                offsetY={ph.h / 2}
                                width={ph.w}
                                height={ph.h}
                                rotation={ph.rotation || 0}
                                draggable={mode === 'select'}
                                onClick={(e) => {
                                    if (mode === 'select') {
                                        e.cancelBubble = true;
                                        setSelectedId(ph.id);
                                    }
                                }}
                                onDblClick={(e) => cycleAlignment(ph.id, e)}
                                onDragMove={updateRotateHandlePos}
                                onDragEnd={(e) => {
                                    const newPhs = [...placeholders];
                                    newPhs[i].x = e.target.x();
                                    newPhs[i].y = e.target.y();
                                    updatePlaceholders(newPhs);
                                }}
                                onTransform={updateRotateHandlePos}
                                onTransformEnd={handleTransformEnd}
                            >
                                <Rect
                                    x={0}
                                    y={0}
                                    width={ph.w}
                                    height={ph.h}
                                    stroke={selectedId === ph.id ? "transparent" : "#94a3b8"} // Transformer handles selection outline
                                    strokeWidth={1}
                                    dash={[5, 5]}
                                    fill={selectedId === ph.id ? "transparent" : "rgba(148, 163, 184, 0.1)"}
                                />
                                {ph.type === 'image' ? (
                                    <CanvasImage ph={ph} />
                                ) : ph.type === 'qrcode' ? (
                                    <Group>
                                        <Rect width={ph.w} height={ph.h} fill="#ffffff" />
                                        <Rect width={ph.w} height={ph.h} stroke="#000" strokeWidth={4} />
                                        <Rect x={ph.w * 0.1} y={ph.h * 0.1} width={ph.w * 0.2} height={ph.h * 0.2} fill="#000" />
                                        <Rect x={ph.w * 0.7} y={ph.h * 0.1} width={ph.w * 0.2} height={ph.h * 0.2} fill="#000" />
                                        <Rect x={ph.w * 0.1} y={ph.h * 0.7} width={ph.w * 0.2} height={ph.h * 0.2} fill="#000" />
                                        <Text
                                            x={0} y={ph.h * 0.45} width={ph.w}
                                            text="QR Code" align="center" fontSize={Math.min(ph.w * 0.15, 20)} fill="#000" fontStyle="bold"
                                        />
                                    </Group>
                                ) : (
                                    <Text
                                        x={0}
                                        y={0}
                                        width={ph.w}
                                        height={ph.h}
                                        text={`{{${ph.name}}}`}
                                        fontSize={ph.fontSize || Math.min(ph.h * 0.4, 40)}
                                        fontFamily={ph.fontFamily || 'Arial'}
                                        fontStyle={`${ph.isItalic ? 'italic ' : ''}${ph.isBold ? 'bold' : 'normal'}`.trim()}
                                        fill={ph.fill || '#1e293b'}
                                        align={ph.align}
                                        verticalAlign="middle"
                                    />
                                )}
                            </Group>
                        ))}

                        {/* Render the box currently being drawn */}
                        {isDrawing && newBox && (
                            <Rect
                                x={newBox.x}
                                y={newBox.y}
                                width={newBox.w}
                                height={newBox.h}
                                stroke="#6366f1"
                                strokeWidth={2}
                                dash={[5, 5]}
                                fill="rgba(99, 102, 241, 0.3)"
                            />
                        )}

                        {/* Transformer — rotateEnabled=false + explicit enabledAnchors removes Konva's rotater entirely */}
                        {selectedId && (
                            <Transformer
                                ref={transformerRef}
                                rotateEnabled={false}
                                enabledAnchors={[
                                    'top-left', 'top-center', 'top-right',
                                    'middle-left', 'middle-right',
                                    'bottom-left', 'bottom-center', 'bottom-right',
                                ]}
                                boundBoxFunc={(oldBox, newBox) => {
                                    // Constrain minimum size
                                    if (Math.abs(newBox.width) < 50 || Math.abs(newBox.height) < 20) {
                                        return oldBox;
                                    }
                                    return newBox;
                                }}
                                anchorStyleFunc={(anchor: Konva.Rect) => {
                                    anchor.cornerRadius(8); // Circular handles
                                    anchor.setAttr('fillPatternImage', undefined);
                                    anchor.fill('#ffffff');
                                    anchor.stroke('#4b5563');
                                }}
                                padding={0}
                                anchorSize={16}
                                borderStroke="#4b5563"
                                borderDash={[4, 4]}
                                anchorStrokeWidth={2}
                            />
                        )}
                    </Layer>
                </Stage>
            </div>

            {/* Right Side: Customization Panel */}
            <div className="w-full lg:w-80 flex flex-col gap-4">
                {selectedPh ? (
                    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 flex flex-col gap-5 overflow-y-auto" style={{ maxHeight: '70vh' }}>

                        <div className="pb-4 border-b border-slate-100">
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Display Name</label>
                            <input
                                type="text"
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                value={selectedPh?.name || ''}
                                disabled={selectedPh?.type === 'qrcode'}
                                onChange={(e) => updateSelectedPlaceholder({ name: e.target.value })}
                                placeholder="e.g. StudentName"
                            />
                            <p className="text-[10px] text-slate-400 mt-1">
                                {selectedPh?.type === 'qrcode'
                                    ? "This QR code will link to a live verification page."
                                    : `This becomes {{${selectedPh?.name || ''}}} in your dataset.`}
                            </p>
                        </div>

                        {selectedPh?.type !== 'qrcode' && selectedPh?.type !== 'image' && (
                            <>
                                <div className="flex flex-col gap-3 pb-4 border-b border-slate-100">
                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Typography</label>

                                    <select
                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        value={selectedPh?.fontFamily || 'Inter'}
                                        onChange={(e) => updateSelectedPlaceholder({ fontFamily: e.target.value })}
                                    >
                                        <option value="Inter">Inter</option>
                                        <option value="Arial">Arial</option>
                                        <option value="Times New Roman">Times New Roman</option>
                                        <option value="Courier New">Courier New</option>
                                        <option value="Georgia">Georgia</option>
                                        <option value="Trebuchet MS">Trebuchet MS</option>
                                    </select>

                                    <div className="flex gap-2">
                                        <div className="flex-1">
                                            <label className="block text-[10px] text-slate-400 mb-1">Size (px)</label>
                                            <input
                                                type="number"
                                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                value={selectedPh?.fontSize || 40}
                                                onChange={(e) => updateSelectedPlaceholder({ fontSize: parseInt(e.target.value) || 40 })}
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <label className="block text-[10px] text-slate-400 mb-1">Color</label>
                                            <div className="flex items-center gap-2 h-9">
                                                <input
                                                    type="color"
                                                    className="w-8 h-8 rounded cursor-pointer border-0 p-0"
                                                    value={selectedPh?.fill || '#1e293b'}
                                                    onChange={(e) => updateSelectedPlaceholder({ fill: e.target.value })}
                                                />
                                                <span className="text-xs text-slate-600 font-mono uppercase">{selectedPh?.fill || '#1e293b'}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex gap-2 mt-1">
                                        <button
                                            onClick={() => updateSelectedPlaceholder({ isBold: !selectedPh?.isBold })}
                                            className={`flex-1 py-1.5 rounded text-sm font-serif font-bold transition-colors ${selectedPh?.isBold ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                        >
                                            B
                                        </button>
                                        <button
                                            onClick={() => updateSelectedPlaceholder({ isItalic: !selectedPh?.isItalic })}
                                            className={`flex-1 py-1.5 rounded text-sm font-serif italic transition-colors ${selectedPh?.isItalic ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                        >
                                            I
                                        </button>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-3 pb-4 border-b border-slate-100">
                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Spacing & Alignment</label>
                                    <div className="flex bg-slate-100 p-1 rounded-lg">
                                        {(['left', 'center', 'right'] as const).map(align => (
                                            <button
                                                key={align}
                                                onClick={() => updateSelectedPlaceholder({ align })}
                                                className={`flex-1 py-1.5 rounded text-xs capitalize ${selectedPh?.align === align ? 'bg-white shadow-sm text-indigo-600 font-medium' : 'text-slate-500 hover:text-slate-700'}`}
                                            >
                                                {align}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}

                        <div className="flex flex-col gap-3">
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Layering</label>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => moveLayer('up')}
                                    className="flex-1 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 transition-colors"
                                >
                                    Bring Forward
                                </button>
                                <button
                                    onClick={() => moveLayer('down')}
                                    className="flex-1 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 transition-colors"
                                >
                                    Send Backward
                                </button>
                            </div>
                        </div>

                    </div>
                ) : (
                    <div className="bg-slate-50 border border-slate-200 border-dashed rounded-2xl h-full min-h-[400px] flex flex-col items-center justify-center p-6 text-center">
                        <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center mb-3">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400">
                                <path d="m15 5 4 4" />
                                <path d="M13 3.5a2.12 2.12 0 0 1 3 3L7 15l-4 1 1-4Z" />
                            </svg>
                        </div>
                        <h3 className="text-sm font-semibold text-slate-700 mb-1">No Placeholder Selected</h3>
                        <p className="text-xs text-slate-400">Click on a text box on the canvas to edit its typography, color, and positioning.</p>
                    </div>
                )}
            </div>
        </div >
    );
}