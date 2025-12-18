import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Decoration, DecorationType } from '../types';


interface ChristmasTreeProps {
    decorations: Decoration[];
    onPlaceDecoration: (x: number, y: number) => void;
    onDropDecoration?: (type: string, x: number, y: number) => void;
    onMoveDecoration?: (id: string, x: number, y: number) => void;
    onSelectDecoration?: (decoration: Decoration) => void;
    pendingDecorationType?: DecorationType | null;
    currentUser?: string;
}


export const ChristmasTree: React.FC<ChristmasTreeProps> = ({
    decorations,
    onPlaceDecoration,
    onDropDecoration,
    onMoveDecoration,
    onSelectDecoration,
    pendingDecorationType,
    currentUser
}) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Custom Drag State via simple React state (performant enough for single item)
    const [dragState, setDragState] = useState<{ id: string, x: number, y: number } | null>(null);
    // Tooltip State
    const [hoveredDecoration, setHoveredDecoration] = useState<Decoration | null>(null);

    const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
        if (!pendingDecorationType || !svgRef.current) return;
        // Don't place if we are interacting with an ornament which stops propagation anyway

        const rect = svgRef.current.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;

        onPlaceDecoration(x, y);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        if (!containerRef.current || !onDropDecoration) return;

        const type = e.dataTransfer.getData("decorationType");
        if (!type) return;

        const rect = containerRef.current.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;

        if (x >= 0 && x <= 1 && y >= 0 && y <= 1) {
            onDropDecoration(type, x, y);
        }
    };


    return (
        <div
            ref={containerRef}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className="relative w-full h-full flex items-center justify-center overflow-hidden p-4"
        >
            <div className="relative w-auto h-auto max-w-[800px] flex flex-col items-center justify-center group">
                {/* Ground Shadow - Adjust for auto size? Actually relative to this container okay. */}
                <div className="absolute bottom-[5%] w-2/3 h-8 bg-black/60 blur-xl rounded-[100%] pointer-events-none" />

                {/* Lighting Overlay */}
                <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-blue-500/10 mix-blend-overlay pointer-events-none z-20" />

                {/* Tree Image - Shrink wrapped */}
                <img
                    src="/tree-real.png"
                    alt="Christmas Tree"
                    className="max-h-[85vh] w-auto max-w-full object-contain pointer-events-none drop-shadow-2xl brightness-90 contrast-110"
                />

                <svg
                    ref={svgRef}
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                    className="absolute inset-0 w-full h-full cursor-pointer z-10"
                    onClick={handleClick}
                >
                    {/* Clickable Area (Transparent) */}
                    <polygon points="50,5 10,95 90,95" fill="transparent" />

                    {/* Ornaments */}
                    {decorations.map((d) => {
                        const isMine = currentUser && d.author === currentUser;
                        const isDragging = dragState?.id === d.id;

                        // Use local state if dragging, else prop state
                        const displayX = isDragging ? dragState.x : d.position.x;
                        const displayY = isDragging ? dragState.y : d.position.y;

                        return (
                            <motion.g
                                key={d.id}
                                // We manually animate x/y.
                                // Use 'transition' to kill lag during drag?
                                // Actually Framer works best if we just pass the values to animate.
                                animate={{ x: displayX * 100, y: displayY * 100 }}
                                transition={isDragging ? { type: 'tween', duration: 0 } : { type: 'spring', stiffness: 300, damping: 30 }}

                                onPanStart={() => {
                                    if (isMine) {
                                        setDragState({ id: d.id, x: d.position.x, y: d.position.y });
                                    }
                                }}

                                onPan={(_, info) => {
                                    if (!isDragging || !svgRef.current) return;
                                    const rect = svgRef.current.getBoundingClientRect();

                                    // Calculate delta in PERCENTAGE of the SVG
                                    // info.delta is in pixels
                                    const dx = info.delta.x / rect.width;
                                    const dy = info.delta.y / rect.height;

                                    setDragState(prev => {
                                        if (!prev) return null;
                                        return {
                                            ...prev,
                                            x: Math.max(0, Math.min(1, prev.x + dx)),
                                            y: Math.max(0, Math.min(1, prev.y + dy))
                                        };
                                    });
                                }}

                                onPanEnd={() => {
                                    if (isDragging && dragState && onMoveDecoration) {
                                        onMoveDecoration(d.id, dragState.x, dragState.y);
                                    }
                                    setDragState(null);
                                }}

                                onDoubleClick={(e) => {
                                    e.stopPropagation();
                                    onSelectDecoration?.(d);
                                }}
                                onClick={(e) => e.stopPropagation()}
                                onHoverStart={() => !isDragging && setHoveredDecoration(d)}
                                onHoverEnd={() => setHoveredDecoration(null)}

                                className={`group cursor-pointer ${isMine ? 'hover:scale-110' : 'opacity-90'}`}
                                style={{ zIndex: isDragging ? 50 : 1 }} // SVG Z-index hack might not work on 'style', order matters.
                                // But we can try scaling.
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                {d.type === 'bright' && (
                                    <image
                                        href="/ornament-gold.png"
                                        x="-5" y="-5" width="10" height="10"
                                        className="drop-shadow-lg select-none"
                                    />
                                )}
                                {d.type === 'black' && (
                                    <image
                                        href="/ornament-black.png"
                                        x="-5" y="-5" width="10" height="10"
                                        // Specific white glow for black ball visibility
                                        className="drop-shadow-[0_0_5px_rgba(255,255,255,0.5)] select-none"
                                    />
                                )}
                                {d.type === 'gift' && (
                                    <image
                                        href="/gift-box.png"
                                        x="-6" y="-6" width="12" height="12"
                                        className="drop-shadow-lg select-none"
                                    />
                                )}
                                {d.type === 'star' && (
                                    <image
                                        href="/star-topper.png"
                                        x="-6" y="-6" width="12" height="12"
                                        className="drop-shadow-[0_0_15px_rgba(255,215,0,0.8)] select-none"
                                    />
                                )}
                            </motion.g>
                        );
                    })}
                </svg>

                {/* HTML Tooltip Overlay */}
                <AnimatePresence>
                    {hoveredDecoration && !dragState && (
                        <motion.div
                            initial={{ opacity: 0, y: 10, x: "-50%", scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, x: "-50%", scale: 1 }}
                            exit={{ opacity: 0, y: 5, x: "-50%", scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                            style={{
                                left: `${hoveredDecoration.position.x * 100}%`,
                                top: `calc(${hoveredDecoration.position.y * 100}% + 5%)`, // Exactly at bottom of 10% height ornament
                            }}
                            className="absolute z-50 pointer-events-none flex flex-col items-center justify-center w-48"
                        >
                            <div className="bg-black/80 backdrop-blur-xl text-white p-3 rounded-xl shadow-2xl border border-white/20 text-center relative">
                                {/* Triangle Arrow */}
                                <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-black/80 rotate-45 border-t border-l border-white/20" />

                                <p className="font-bold text-sm text-yellow-400 mb-1">{hoveredDecoration.author}</p>
                                <p className="text-xs text-gray-200 leading-relaxed max-w-[180px] break-words">
                                    {hoveredDecoration.message}
                                </p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
            {/* Messages Overlay could be here */}
        </div>
    );
};
