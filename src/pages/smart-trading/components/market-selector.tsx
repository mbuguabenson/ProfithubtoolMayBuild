import { observer } from 'mobx-react-lite';
import { useStore } from '@/hooks/useStore';
import './market-selector.scss';

const MarketSelector = observer(() => {
    const { smart_trading } = useStore();
    const { symbol, setSymbol, markets } = smart_trading;

    return (
        <div className='market-selector'>
            <select className='market-selector__select' value={symbol} onChange={e => setSymbol(e.target.value)}>
                {markets.map(group => (
                    <optgroup key={group.group} label={group.group}>
                        {group.items.map(item => (
                            <option key={item.value} value={item.value}>
                                {item.label}
                            </option>
                        ))}
                    </optgroup>
                ))}
            </select>
        </div>
    );
});

export default MarketSelector;
