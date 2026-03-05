import React from 'react';

interface LogoProps extends React.SVGProps<SVGSVGElement> {
    className?: string;
}

export function Logo({ className = "h-8 w-auto", ...props }: LogoProps) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 40" className={className} {...props}>
            <text
                x="5"
                y="28"
                fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
                fontSize="28"
                fontWeight="900"
                fill="currentColor"
                letterSpacing="-1"
            >
                Credify<tspan fill="#4f46e5">.</tspan>
            </text>
        </svg>
    );
}
