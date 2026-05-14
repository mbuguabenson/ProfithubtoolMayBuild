import React, { useEffect, useRef, useState } from 'react';
import './floating-window.scss';

interface FloatingWindowProps {
    id: string;
    title: string;
    children: React.ReactNode;
    onClose: () => void;
    initialWidth?: number;
    initialHeight?: number;
    initialX?: number;
    initialY?: number;
    isTop: boolean;
    onFocus: () => void;
}

export const FloatingWindow: React.FC<FloatingWindowProps> = ({
    id,
    title,
    children,
    onClose,
    initialWidth = 800,
    initialHeight = 600,
    initialX = 100,
    initialY = 100,
    isTop,
    onFocus,
}) => {
    const [isMinimized, setIsMinimized] = useState(false);
    const [isMaximized, setIsMaximized] = useState(false);

    const [position, setPosition] = useState({ x: initialX, y: initialY });
    const [size, setSize] = useState({ width: initialWidth, height: initialHeight });

    // Previous size/pos to restore after maximizing
    const [preMaxSize, setPreMaxSize] = useState({ width: initialWidth, height: initialHeight });
    const [preMaxPos, setPreMaxPos] = useState({ x: initialX, y: initialY });

    const isDragging = useRef(false);
    const dragOffset = useRef({ x: 0, y: 0 });

    const windowRef = useRef<HTMLDivElement>(null);

    const checkBounds = (x: number, y: number) => {
        const newX = Math.max(0, Math.min(x, window.innerWidth - 100)); // Header must stay visible
        const newY = Math.max(0, Math.min(y, window.innerHeight - 50));
        return { x: newX, y: newY };
    };

    const handlePointerDownHeader = (e: React.PointerEvent) => {
        if (isMaximized) return;
        isDragging.current = true;
        dragOffset.current = {
            x: e.clientX - position.x,
            y: e.clientY - position.y,
        };
        onFocus();
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
    };

    const handlePointerMoveHeader = (e: React.PointerEvent) => {
        if (!isDragging.current) return;
        const bounded = checkBounds(e.clientX - dragOffset.current.x, e.clientY - dragOffset.current.y);
        setPosition(bounded);
    };

    const handlePointerUpHeader = (e: React.PointerEvent) => {
        isDragging.current = false;
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    };

    const isResizing = useRef<string | null>(null);
    const resizeStart = useRef({ x: 0, y: 0, w: 0, h: 0, posX: 0, posY: 0 });

    const handleResizeDown = (e: React.PointerEvent, direction: string) => {
        if (isMaximized || isMinimized) return;
        e.stopPropagation();
        isResizing.current = direction;
        resizeStart.current = {
            x: e.clientX,
            y: e.clientY,
            w: size.width,
            h: size.height,
            posX: position.x,
            posY: position.y,
        };
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
    };

    const handleResizeMove = (e: React.PointerEvent) => {
        if (!isResizing.current) return;
        e.stopPropagation();
        const { x, y, w, h, posX, posY } = resizeStart.current;
        let newW = w;
        let newH = h;
        let newPosX = posX;
        let newPosY = posY;
        const deltaX = e.clientX - x;
        const deltaY = e.clientY - y;

        if (isResizing.current.includes('e')) newW = Math.max(300, w + deltaX);
        if (isResizing.current.includes('w')) {
            newW = Math.max(300, w - deltaX);
            if (newW > 300) newPosX = posX + deltaX;
        }
        if (isResizing.current.includes('s')) newH = Math.max(200, h + deltaY);
        if (isResizing.current.includes('n')) {
            newH = Math.max(200, h - deltaY);
            if (newH > 200) newPosY = posY + deltaY;
        }

        setSize({ width: newW, height: newH });
        setPosition({ x: newPosX, y: newPosY });
    };

    const handleResizeUp = (e: React.PointerEvent) => {
        isResizing.current = null;
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    };

    const toggleMaximize = () => {
        if (!isMaximized) {
            setPreMaxSize(size);
            setPreMaxPos(position);
            setIsMaximized(true);
            setIsMinimized(false);
            setPosition({ x: 0, y: 0 });
            setSize({ width: window.innerWidth, height: window.innerHeight });
        } else {
            setIsMaximized(false);
            setSize(preMaxSize);
            setPosition(preMaxPos);
        }
    };

    const toggleMinimize = () => {
        setIsMinimized(!isMinimized);
        if (isMaximized && !isMinimized) {
            setIsMaximized(false);
            setSize(preMaxSize);
            setPosition(preMaxPos);
        }
    };

    const zIndex = isTop ? 100 : 50;
    const directions = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];

    return (
        <div
            id={id}
            className={`floating-window ${isMinimized ? 'minimized' : ''} ${isMaximized ? 'maximized' : ''} ${isTop ? 'top-window' : ''}`}
            style={{
                transform: `translate3d(${position.x}px, ${position.y}px, ${isTop ? 10 : 0}px)`,
                width: isMinimized ? '300px' : `${size.width}px`,
                height: isMinimized ? '40px' : `${size.height}px`,
                zIndex,
                overflow: 'visible',
            }}
            ref={windowRef}
            onPointerDownCapture={onFocus}
        >
            <div
                className='fw-header'
                onPointerDown={handlePointerDownHeader}
                onPointerMove={handlePointerMoveHeader}
                onPointerUp={handlePointerUpHeader}
                onPointerCancel={handlePointerUpHeader}
                onDoubleClick={toggleMaximize}
            >
                <div className='fw-title'>{title}</div>
                <div className='fw-controls'>
                    <button onClick={toggleMinimize} className='fw-btn minimize' title='Minimize'>
                        _
                    </button>
                    <button onClick={toggleMaximize} className='fw-btn maximize' title='Maximize'>
                        □
                    </button>
                    <button onClick={onClose} className='fw-btn close' title='Close'>
                        ×
                    </button>
                </div>
            </div>
            {!isMinimized && <div className='fw-content'>{children}</div>}

            {!isMinimized &&
                !isMaximized &&
                directions.map(dir => (
                    <div
                        key={dir}
                        className={`fw-resize-handle ${dir}`}
                        onPointerDown={e => handleResizeDown(e, dir)}
                        onPointerMove={handleResizeMove}
                        onPointerUp={handleResizeUp}
                        onPointerCancel={handleResizeUp}
                    />
                ))}
        </div>
    );
};

export default FloatingWindow;
