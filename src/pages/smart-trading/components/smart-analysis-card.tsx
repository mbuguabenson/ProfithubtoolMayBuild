import React from 'react';
import classNames from 'classnames';
import './smart-analysis-tab.scss';

interface SmartAnalysisCardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    icon?: React.ReactNode;
    trend?: 'up' | 'down' | 'neutral';
    accentColor?: 'green' | 'red' | 'blue' | 'purple' | 'orange' | 'yellow';
    className?: string;
}

export function SmartAnalysisCard({
    title,
    value,
    subtitle,
    icon,
    trend,
    accentColor = 'purple',
    className,
}: SmartAnalysisCardProps) {
    const trendIcons = {
        up: '↗',
        down: '↘',
        neutral: '→',
    };

    return (
        <div className={classNames('smart-analysis-card', `accent-${accentColor}`, className)}>
            <div className='card-content'>
                {icon && (
                    <div className='card-header'>
                        <div className='icon-wrapper'>{icon}</div>
                        {trend && <span className={classNames('trend-indicator', trend)}>{trendIcons[trend]}</span>}
                    </div>
                )}

                <div className='card-body'>
                    <p className='card-title'>{title}</p>
                    <p className='card-value'>{value}</p>
                    {subtitle && <p className='card-subtitle'>{subtitle}</p>}
                </div>
            </div>
        </div>
    );
}
