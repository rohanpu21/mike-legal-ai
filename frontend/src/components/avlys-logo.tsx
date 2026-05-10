import { useId, type CSSProperties } from "react";

interface AvlysMarkProps {
    size?: number;
    className?: string;
    style?: CSSProperties;
}

export function AvlysMark({
    size = 28,
    className = "",
    style,
}: AvlysMarkProps) {
    const id = useId().replace(/:/g, "");
    const dotGridId = `${id}-avlys-dot-grid`;
    const leftDiscId = `${id}-avlys-left-disc`;
    const rightDiscId = `${id}-avlys-right-disc`;

    return (
        <svg
            viewBox="0 0 160 120"
            width={size}
            height={Math.round(size * 0.75)}
            aria-hidden="true"
            className={className}
            style={{ display: "block", ...style }}
        >
            <defs>
                <pattern
                    id={dotGridId}
                    width="8"
                    height="8"
                    patternUnits="userSpaceOnUse"
                >
                    <circle cx="2" cy="2" r="1.7" fill="#2f42ff" />
                </pattern>
                <clipPath id={leftDiscId}>
                    <circle cx="61" cy="60" r="49" />
                </clipPath>
                <clipPath id={rightDiscId}>
                    <circle cx="99" cy="60" r="49" />
                </clipPath>
            </defs>
            <rect width="160" height="120" rx="18" fill="#000" />
            <g clipPath={`url(#${leftDiscId})`}>
                <rect
                    x="10"
                    y="8"
                    width="100"
                    height="104"
                    fill={`url(#${dotGridId})`}
                />
            </g>
            <g clipPath={`url(#${rightDiscId})`} opacity="0.82">
                <rect
                    x="50"
                    y="8"
                    width="100"
                    height="104"
                    fill={`url(#${dotGridId})`}
                />
            </g>
            <path
                d="M37 88 58 32 80 88M102 32 80 88 59 32M103 88l22-56"
                fill="none"
                stroke="#fff"
                strokeWidth="7"
                strokeLinecap="square"
                strokeLinejoin="miter"
            />
            <text
                x="78"
                y="69"
                textAnchor="middle"
                fontFamily="system-ui, -apple-system, sans-serif"
                fontSize="13"
                fontWeight="500"
                letterSpacing="11"
                fill="#fff"
            >
                LYS
            </text>
        </svg>
    );
}

export function AvlysWordmark({
    size = 28,
    className = "",
}: {
    size?: number;
    className?: string;
}) {
    return (
        <span className={`inline-flex items-center gap-2 ${className}`}>
            <AvlysMark size={size} />
            <span className="font-sans text-[1em] font-semibold tracking-[-0.02em] text-[#1d1d1f]">
                Avlys
            </span>
        </span>
    );
}
