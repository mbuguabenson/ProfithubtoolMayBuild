import { observer } from 'mobx-react-lite';
import { useStore } from '@/hooks/useStore';

const TradingViewComponent = observer(() => {
    const { ui } = useStore();
    const { is_dark_mode_on } = ui;
    const theme = is_dark_mode_on ? 'dark' : 'light';

    // Using Deriv's TradingView implementation via iframe
    return (
        <div style={{ width: '100%', height: '100%', backgroundColor: 'var(--general-section-1)', overflow: 'hidden' }}>
            <iframe
                key={theme}
                src={`https://tradingview.deriv.com/?theme=${theme}`}
                style={{ width: '100%', height: '100%', border: 'none' }}
                title='TradingView Chart'
            />
        </div>
    );
});

export default TradingViewComponent;
