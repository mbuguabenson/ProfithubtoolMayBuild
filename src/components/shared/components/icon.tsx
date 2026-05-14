import React from 'react';

type IconProps = {
    icon: string;
    className?: string;
    size?: number;
    onClick?: () => void;
    [key: string]: any;
};

export const Icon = ({ icon, className, size, onClick, ...props }: IconProps) => {
    return (
        <span
            className={`dc-icon ${className || ''}`}
            onClick={onClick}
            style={size ? { width: size, height: size } : {}}
            {...props}
        >
            {/* Placeholder for icon: {icon} */}
            <i className={`icon-${icon}`} />
        </span>
    );
};
