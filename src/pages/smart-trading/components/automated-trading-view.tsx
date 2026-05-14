import { observer } from 'mobx-react-lite';
import SCPTab from './scp-tab';
import './automated-trading.scss';

const AutomatedTradingView = observer(() => {
    // The redesigned SCPTab is now the primary "SmartAuto" interface for the Command Center
    return <SCPTab />;
});

export default AutomatedTradingView;
