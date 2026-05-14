import React, { useState } from 'react';
import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import { localize } from '@deriv-com/translations';
import CompoundingCalculator from './compounding-calculator';
import RiskCalculator from './risk-calculator';
import './risk-management.scss';

const RiskManagementTab = observer(() => {
    const [activeSubTab, setActiveSubTab] = useState<'compounding' | 'risk_calculator'>('compounding');

    return (
        <div className="risk-management-tab">
            <div className="risk-management-header">
                <h2>{localize('Risk Management')}</h2>
                <p>{localize('Control your risk and grow your account safely.')}</p>
            </div>
            
            <div className="risk-management-nav">
                <button
                    className={classNames('risk-management-nav__btn', {
                        'risk-management-nav__btn--active': activeSubTab === 'compounding',
                    })}
                    onClick={() => setActiveSubTab('compounding')}
                >
                    <span className="risk-management-nav__icon">📈</span>
                    <span className="risk-management-nav__label">{localize('Compounding Calculator')}</span>
                </button>
                <button
                    className={classNames('risk-management-nav__btn', {
                        'risk-management-nav__btn--active': activeSubTab === 'risk_calculator',
                    })}
                    onClick={() => setActiveSubTab('risk_calculator')}
                >
                    <span className="risk-management-nav__icon">🛡️</span>
                    <span className="risk-management-nav__label">{localize('Risk Calculator')}</span>
                </button>
            </div>

            <div className="risk-management-content">
                {activeSubTab === 'compounding' ? <CompoundingCalculator /> : <RiskCalculator />}
            </div>
        </div>
    );
});

export default RiskManagementTab;
