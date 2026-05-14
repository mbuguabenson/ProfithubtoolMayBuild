import Chart from '../../chart/chart';
import './smart-charts-tab.scss';

const SmartChartsTab = () => {
    return (
        <div className='smart-charts-tab'>
            <div className='chart-container-premium'>
                <Chart show_digits_stats={true} />
            </div>
        </div>
    );
};

export default SmartChartsTab;
