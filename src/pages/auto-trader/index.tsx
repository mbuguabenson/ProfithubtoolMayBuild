import { observer } from 'mobx-react-lite';
import SmartTrading from '../smart-trading';
import './auto-trader.scss';

const AutoTrader = observer(() => {
    return (
        <div className='auto-trader-wrapper'>
            <SmartTrading />
        </div>
    );
});

export default AutoTrader;
