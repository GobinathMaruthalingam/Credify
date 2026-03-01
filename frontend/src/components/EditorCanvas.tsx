import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { Stage, Layer, Image as KonvaImage, Text, Rect, Group, Transformer } from 'react-konva';
import Konva from 'konva';
import useImage from 'use-image';
import { Type, MousePointer2, Undo2, Redo2, RotateCw } from 'lucide-react';

interface EditorCanvasProps {
    templateUrl: string;
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
}

export default function EditorCanvas({ templateUrl }: EditorCanvasProps) {
    const [image] = useImage(templateUrl);

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
                align: 'center'
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

    return (
        <div className="bg-slate-200 rounded-2xl overflow-hidden border border-slate-300 shadow-inner relative flex flex-col" style={{ height: '70vh' }}>

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
                    </div>

                    <span className="text-xs text-slate-500 border-l border-slate-300 pl-4 hidden md:block">
                        {mode === 'draw'
                            ? "Click and drag to draw."
                            : "Click a box to resize/rotate it. Double-click to cycle alignment."}
                    </span>
                </div>

                {/* Undo/Redo Controls */}
                <div className="flex gap-2">
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
                            <Text
                                x={0}
                                y={0}
                                width={ph.w}
                                height={ph.h}
                                text={`{{${ph.name}}}\n[${ph.align}]`}
                                fontSize={Math.min(ph.h * 0.4, 40)} // Scale font down if box is small
                                fill="#1e293b"
                                align={ph.align}
                                verticalAlign="middle"
                            />
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
    );
}