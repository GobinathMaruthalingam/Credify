import React from 'react';

interface LogoProps extends React.SVGProps<SVGSVGElement> {
    className?: string;
}

export function Logo({ className = "h-8 w-auto", ...props }: LogoProps) {
    return (
        <img
            src="https://rrjogdkgrszahxgucbfn.supabase.co/storage/v1/object/public/credify-assets/brand/official-logo.png"
            alt="Credify Logo"
            className={className}
            {...(props as any)}
        />
    );
}
