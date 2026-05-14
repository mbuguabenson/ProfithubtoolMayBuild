import { observer } from 'mobx-react-lite';
import { useStore } from '@/hooks/useStore';

const DigitCircles = observer(() => {
    const { analysis } = useStore();
    const { digit_stats, last_digit } = analysis;

    return (
        <div className='digit-circles-wrapper'>
            {digit_stats.map(stat => {
                const isCurrent = stat.digit === last_digit;
                const color = isCurrent ? '#06b6d4' : '#10b981';

                return (
                    <div key={stat.digit} className={`digit-card-v2 ${isCurrent ? 'is-now' : ''}`}>
                        <div className='digit-main-circle'>
                            <svg width='70' height='70' viewBox='0 0 70 70'>
                                <circle
                                    cx='35'
                                    cy='35'
                                    r='32'
                                    fill='none'
                                    stroke='rgba(255, 255, 255, 0.03)'
                                    strokeWidth='3'
                                />
                                <circle
                                    cx='35'
                                    cy='35'
                                    r='32'
                                    fill='none'
                                    stroke={color}
                                    strokeWidth='3'
                                    strokeDasharray={`${(stat.percentage / 100) * 201} 201`}
                                    strokeLinecap='round'
                                    style={{
                                        filter: isCurrent ? `drop-shadow(0 0 10px ${color})` : 'none',
                                        transition: 'all 0.5s ease',
                                    }}
                                />
                            </svg>
                            <div className='digit-center-text'>
                                <span className='digit-num'>{stat.digit}</span>
                                <span className='digit-pct'>{stat.percentage.toFixed(1)}%</span>
                            </div>
                        </div>
                        <div className='digit-sample-size'>n={stat.count}</div>
                    </div>
                );
            })}
        </div>
    );
});

export default DigitCircles;
