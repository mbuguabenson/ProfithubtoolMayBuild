import { observer } from 'mobx-react-lite';
import { useStore } from '@/hooks/useStore';
import MarketSelector from './market-selector';
import './market-overview.scss';

const MarketOverview = observer(() => {
    const { smart_trading, app } = useStore();
    const { symbol, current_price, last_digit, updateDigitStats, active_symbols_data } = smart_trading;
    const ticks_service = app.api_helpers_store?.ticks_service;

    // ... (useEffect remains the same)

    return (
        <div className='smart-market-overview'>
            <div className='market-overview__header'>
                <div className='market-overview__selector'>
                    <label>Select Market</label>
                    <MarketSelector />
                </div>
                <div className='market-overview__price-card'>
                    <span className='label'>Current Price</span>
                    <span className='price'>{current_price}</span>
                </div>
                <div className='market-overview__digit-card'>
                    <span className='label'>Last Digit</span>
                    <span className={`digit digit--${last_digit}`}>{last_digit}</span>
                </div>
            </div>
        </div>
    );
});

export default MarketOverview;
