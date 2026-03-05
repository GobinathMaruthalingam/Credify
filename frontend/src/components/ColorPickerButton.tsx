import { useState, useEffect, useRef } from 'react';
import ReactQuill from 'react-quill-new';

// ─── Color Palette ──────────────────────────────────────────────────────────
const BASIC_COLORS = [
    '#000000', '#333333', '#555555', '#777777', '#999999', '#bbbbbb', '#dddddd', '#ffffff',
];
const STANDARD_COLORS = [
    '#ff0000', '#ff4500', '#ff9900', '#ffcc00', '#99cc00',
    '#00aa44', '#00aacc', '#0066ff', '#6600ff', '#cc00cc',
];


// ─── Props ───────────────────────────────────────────────────────────────────
interface Props {
    /** 'color' for text color, 'background' for highlight */
    format: 'color' | 'background';
    /** Default/initial active color */
    defaultColor: string;
    /** Tooltip label on the main button */
    label: string;
    /** SVG icon node */
    icon: React.ReactNode;
    quillRef: React.RefObject<ReactQuill | null>;
}

export default function ColorPickerButton({ format, defaultColor, label, icon, quillRef }: Props) {
    const [open, setOpen] = useState(false);
    const [activeColor, setActiveColor] = useState(defaultColor);
    const containerRef = useRef<HTMLDivElement>(null);
    const savedSelRef = useRef<{ index: number; length: number } | null>(null);

    // Close on outside click
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const handleToggle = () => {
        // Save selection before picker steals focus
        const editor = (quillRef.current as any)?.getEditor?.();
        if (editor) savedSelRef.current = editor.getSelection();
        setOpen(prev => !prev);
    };

    const applyColor = (color: string) => {
        const editor = (quillRef.current as any)?.getEditor?.();
        if (editor) {
            if (savedSelRef.current) editor.setSelection(savedSelRef.current);
            editor.format(format, color === 'transparent' ? false : color);
        }
        setActiveColor(color);
        setOpen(false);
    };

    return (
        <div ref={containerRef} className="cq-color-picker" style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 0 }}>
            {/* Main button: icon + color bar */}
            <button
                className="cq-color-icon-btn"
                data-tooltip={label}
                onClick={handleToggle}
                style={{ position: 'relative', borderRadius: '6px' }}
                title=""
            >
                <span className="cq-icon-inner">
                    {icon}
                    <span className="cq-color-bar" style={{ background: activeColor }} />
                </span>
            </button>

            {/* Color swatch grid dropdown */}
            {open && (
                <div className="cq-color-dropdown">
                    {/* Transparent / None */}
                    <div className="cq-color-section-label">None</div>
                    <div className="cq-color-row">
                        <button
                            className="cq-swatch cq-swatch-none"
                            title="Remove color"
                            onClick={() => applyColor('transparent')}
                        >
                            <svg viewBox="0 0 14 14" width="14" height="14">
                                <line x1="2" y1="12" x2="12" y2="2" stroke="#e53e3e" strokeWidth="1.5" />
                            </svg>
                        </button>
                    </div>

                    <div className="cq-color-section-label">Basic</div>
                    <div className="cq-color-row">
                        {BASIC_COLORS.map(c => (
                            <button
                                key={c}
                                className={`cq-swatch ${c === activeColor ? 'cq-swatch-active' : ''}`}
                                style={{ background: c, border: c === '#ffffff' ? '1px solid #e2e8f0' : undefined }}
                                onClick={() => applyColor(c)}
                                title={c}
                            />
                        ))}
                    </div>

                    <div className="cq-color-section-label">Standard</div>
                    <div className="cq-color-row">
                        {STANDARD_COLORS.map(c => (
                            <button
                                key={c}
                                className={`cq-swatch ${c === activeColor ? 'cq-swatch-active' : ''}`}
                                style={{ background: c }}
                                onClick={() => applyColor(c)}
                                title={c}
                            />
                        ))}
                    </div>


                </div>
            )}
        </div>
    );
}
