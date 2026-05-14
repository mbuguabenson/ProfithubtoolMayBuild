import { observer } from 'mobx-react-lite';
import { localize } from '@deriv-com/translations';
import Text from '@/components/shared_ui/text';
import './strategies.scss';

const Strategies = observer(() => {
    return (
        <div className='strategies-container'>
            <header className='strategies-header'>
                <div className='header-title-group'>
                    <Text as='h2'>{localize('Advance Strategies')}</Text>
                    <Text as='p'>{localize('Master the market with these proven pattern analysis strategies')}</Text>
                </div>
                <div className='header-actions'>
                    <button
                        className='btn-customer-care'
                        onClick={() =>
                            window.open(
                                'https://api.whatsapp.com/send/?phone=254796428848&text&type=phone_number&app_absent=0',
                                '_blank'
                            )
                        }
                    >
                        <span className='whatsapp-icon'>💬</span> {localize('Strategy Support')}
                    </button>
                </div>
            </header>

            <div className='strategies-grid'>
                {/* Even/Odd Strategy Card */}
                <div className='strategy-card card-even-odd'>
                    <div className='card-header'>
                        <div className='card-icon'>⚖️</div>
                        <div className='card-badge'>{localize('Even/Odd')}</div>
                    </div>
                    <div className='card-content'>
                        <h3>{localize('Even/Odd Logic')}</h3>

                        <div className='rule-section'>
                            <h4>{localize('Market Analysis')}</h4>
                            <ul>
                                <li>
                                    {localize(
                                        'Analyse for 5 mins to understand where the market has the highest power (Even or Odd).'
                                    )}
                                </li>
                                <li>{localize('Ensure Even or Odd numbers appear most frequently.')}</li>
                            </ul>
                        </div>

                        <div className='rule-section'>
                            <h4>{localize('Signals')}</h4>
                            <ul>
                                <li className='highlight'>
                                    <strong>{localize('WAIT Signal:')}</strong>{' '}
                                    {localize('When Market % is 55% and increasing.')}
                                </li>
                                <li className='highlight'>
                                    <strong>{localize('TRADE Signal:')}</strong>{' '}
                                    {localize('When Market % gets to 60% and increasing.')}
                                </li>
                            </ul>
                        </div>

                        <div className='rule-section'>
                            <h4>{localize('Entry Rule')}</h4>
                            <ul>
                                <li>{localize('Wait for 2+ consecutive opposite digits, then trade favored side.')}</li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Over/Under Strategy Card */}
                <div className='strategy-card card-over-under'>
                    <div className='card-header'>
                        <div className='card-icon'>📊</div>
                        <div className='card-badge'>{localize('Over/Under')}</div>
                    </div>
                    <div className='card-content'>
                        <h3>{localize('Over/Under Logic')}</h3>

                        <div className='rule-section'>
                            <h4>{localize('Market Analysis')}</h4>
                            <ul>
                                <li>{localize('Analyse Under 0-4 vs Over 5-9 power.')}</li>
                                <li>
                                    <strong>{localize('WAIT Signal:')}</strong>{' '}
                                    {localize('When Market is 53% and increasing.')}
                                </li>
                                <li>
                                    <strong>{localize('TRADE Signal:')}</strong>{' '}
                                    {localize('At 56% increasing (Strong at 60%).')}
                                </li>
                            </ul>
                        </div>

                        <div className='rule-section'>
                            <h4>{localize('Under Signals (If Under 0-4 is dominant)')}</h4>
                            <ul>
                                <li>{localize('Digit 0-6 appears most -> Signal Under 8, 9')}</li>
                                <li>{localize('Digit 0-5 appears most -> Signal Under 7 (or 6,7,8)')}</li>
                                <li>{localize('Digit 0-4 appears most -> Signal Under 6')}</li>
                                <li>
                                    <strong>{localize('Entry:')}</strong>{' '}
                                    {localize('Highest Power Under Digit appears.')}
                                </li>
                            </ul>
                        </div>

                        <div className='rule-section'>
                            <h4>{localize('Over Signals (If Over 5-9 is dominant)')}</h4>
                            <ul>
                                <li>{localize('Digit 3-9 appears most -> Signal Over 0, 1')}</li>
                                <li>{localize('Digit 4-9 appears most -> Signal Over 2 (or 3,2,1)')}</li>
                                <li>{localize('Digit 5-9 appears most -> Signal Over 3')}</li>
                                <li>
                                    <strong>{localize('Entry:')}</strong>{' '}
                                    {localize('Highest Power Over Digit appears.')}
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Differs Strategy Card */}
                <div className='strategy-card card-differs'>
                    <div className='card-header'>
                        <div className='card-icon'>≠</div>
                        <div className='card-badge'>{localize('Differs')}</div>
                    </div>
                    <div className='card-content'>
                        <h3>{localize('Differs Logic')}</h3>

                        <div className='rule-section'>
                            <h4>{localize('Digit Selection')}</h4>
                            <ul>
                                <li>{localize('Digit must be between 2-7.')}</li>
                                <li>{localize('Must NOT be the Least or Most appearing digit.')}</li>
                                <li>{localize('Power must be < 10.5% and DECREASING.')}</li>
                            </ul>
                        </div>

                        <div className='rule-section'>
                            <h4>{localize('Entry Point')}</h4>
                            <ul>
                                <li className='highlight'>{localize('Wait for the predicted digit to appear.')}</li>
                                <li>{localize('Wait for next 3 digits to appear.')}</li>
                                <li>{localize('If exit spot is not the predicted digit -> Give Signal.')}</li>
                            </ul>
                        </div>

                        <div className='rule-section'>
                            <h4>{localize('General Rule')}</h4>
                            <ul>
                                <li>{localize('Signal valid for at least 30 seconds.')}</li>
                                <li>{localize('If market changes, re-evaluate.')}</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
});

export default Strategies;
