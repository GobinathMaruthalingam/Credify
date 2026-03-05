import { useState, useEffect } from 'react';
import ReactQuill from 'react-quill-new';

interface Props {
    quillRef: React.RefObject<ReactQuill | null>;
    defaultSize?: number;
}

export default function FontSizeController({ quillRef, defaultSize = 15 }: Props) {
    const [size, setSize] = useState<number>(defaultSize);

    // Sync input with actual editor selection
    useEffect(() => {
        const editor = (quillRef.current as any)?.getEditor?.();
        if (!editor) return;

        const handleSelectionChange = () => {
            const range = editor.getSelection();
            if (range) {
                const format = editor.getFormat(range);
                if (format.size) {
                    const parsed = parseInt(format.size, 10);
                    if (!isNaN(parsed)) setSize(parsed);
                } else {
                    setSize(15); // Default size representation if no inline style
                }
            }
        };

        editor.on('selection-change', handleSelectionChange);
        editor.on('text-change', handleSelectionChange);
        return () => {
            editor.off('selection-change', handleSelectionChange);
            editor.off('text-change', handleSelectionChange);
        };
    }, [quillRef]);

    const applySize = (newSize: number) => {
        setSize(newSize);
        const editor = (quillRef.current as any)?.getEditor?.();
        if (editor) {
            editor.format('size', `${newSize}px`);
        }
    };

    const handleMinus = () => {
        if (size > 8) applySize(size - 1);
    };

    const handlePlus = () => {
        if (size < 72) applySize(size + 1);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseInt(e.target.value, 10);
        if (!isNaN(val)) {
            setSize(val);
        }
    };

    const handleBlur = () => {
        applySize(size);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            applySize(size);
        }
    };

    return (
        <div className="cq-fontsize-controller" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', margin: '0 4px', height: '28px' }}>
            <button
                className="cq-fs-btn"
                onClick={handleMinus}
                data-tooltip="Decrease Font Size"
            >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
            </button>
            <input
                type="number"
                className="cq-fs-input"
                value={size}
                onChange={handleChange}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                data-tooltip="Font Size"
            />
            <button
                className="cq-fs-btn"
                onClick={handlePlus}
                data-tooltip="Increase Font Size"
            >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
            </button>
        </div>
    );
}
