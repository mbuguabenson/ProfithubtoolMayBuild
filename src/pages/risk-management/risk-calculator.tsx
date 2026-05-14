import React, { useState, useMemo } from 'react';
import { localize } from '@deriv-com/translations';

const RiskCalculator = () => {
    // Try to load from localStorage first
    const loadState = (key: string, defaultValue: any) => {
        const saved = localStorage.getItem(`rm_riskcalc_${key}`);
        if (saved !== null) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                return saved;
            }
        }
        return defaultValue;
    };

    const [balance, setBalance] = useState<number>(loadState('balance', 1000));
    const [riskPercentage, setRiskPercentage] = useState<number>(loadState('riskPercentage', 5));
    const [martingale, setMartingale] = useState<boolean>(loadState('martingale', false));
    const [martingaleMultiplier, setMartingaleMultiplier] = useState<number>(loadState('martingaleMultiplier', 2));

    // Save to localStorage whenever states change
    React.useEffect(() => {
        localStorage.setItem('rm_riskcalc_balance', JSON.stringify(balance));
        localStorage.setItem('rm_riskcalc_riskPercentage', JSON.stringify(riskPercentage));
        localStorage.setItem('rm_riskcalc_martingale', JSON.stringify(martingale));
        localStorage.setItem('rm_riskcalc_martingaleMultiplier', JSON.stringify(martingaleMultiplier));
    }, [balance, riskPercentage, martingale, martingaleMultiplier]);

    const stake = (balance * riskPercentage) / 100;

    const riskAnalysis = useMemo(() => {
        let losses25 = 0;
        let losses50 = 0;
        let currentBalance = balance;
        let currentStake = stake;
        let cumulativeLoss = 0;

        for (let i = 1; i <= 100; i++) { // Limit to 100 to avoid infinite loops
            currentBalance -= currentStake;
            cumulativeLoss += currentStake;

            if (losses25 === 0 && cumulativeLoss >= balance * 0.25) {
                losses25 = i;
            }
            if (losses50 === 0 && cumulativeLoss >= balance * 0.50) {
                losses50 = i;
                break; // We found the 50% mark
            }

            if (martingale) {
                currentStake *= martingaleMultiplier;
            }
        }

        return {
            losses25: losses25 > 0 ? losses25 : '>100',
            losses50: losses50 > 0 ? losses50 : '>100'
        };
    }, [balance, riskPercentage, martingale, martingaleMultiplier, stake]);

    const martingaleSteps = useMemo(() => {
        if (!martingale) return [];
        const steps = [];
        let currentStake = stake;
        let cumulativeLoss = 0;
        for (let i = 1; i <= 4; i++) {
            cumulativeLoss += currentStake;
            steps.push({
                trade: i,
                stake: currentStake,
                cumulativeLoss: cumulativeLoss,
                drawdownPercent: (cumulativeLoss / balance) * 100
            });
            currentStake *= martingaleMultiplier;
        }
        return steps;
    }, [martingale, stake, martingaleMultiplier, balance]);

    const riskLevel = riskPercentage <= 5 ? 'Low' : riskPercentage <= 10 ? 'Medium' : riskPercentage <= 20 ? 'High' : 'Extreme';
    const riskClass = riskLevel === 'Low' ? 'risk-low' : riskLevel === 'Medium' ? 'risk-medium' : riskLevel === 'High' ? 'risk-high' : 'risk-extreme';

    return (
        <div className="risk-calculator">
            <div className="rm-grid">
                <div className="rm-card">
                    <div className="rm-card__title">🛡️ {localize('Risk Parameters')}</div>
                    
                    <div className="rm-input-group">
                        <label>{localize('Account Balance (USD)')}</label>
                        <input type="number" value={balance} onChange={(e) => setBalance(Number(e.target.value))} />
                    </div>
                    
                    <div className="rm-input-group">
                        <label>{localize('Risk per Trade (%)')}</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <input 
                                type="range" 
                                min="1" 
                                max="100" 
                                value={riskPercentage} 
                                onChange={(e) => setRiskPercentage(Number(e.target.value))} 
                                style={{ flex: 1 }}
                            />
                            <span style={{ fontWeight: 600, minWidth: '40px' }}>{riskPercentage}%</span>
                        </div>
                    </div>

                    <div className="rm-input-group">
                        <label>
                            <input 
                                type="checkbox" 
                                checked={martingale} 
                                onChange={(e) => setMartingale(e.target.checked)} 
                                style={{ marginRight: '8px' }} 
                            />
                            {localize('Enable Martingale')}
                        </label>
                    </div>

                    {martingale && (
                        <div className="rm-input-group">
                            <label>{localize('Martingale Multiplier')}</label>
                            <input type="number" step="0.1" value={martingaleMultiplier} onChange={(e) => setMartingaleMultiplier(Number(e.target.value))} />
                        </div>
                    )}
                </div>

                <div className="rm-card">
                    <div className="rm-card__title">📈 {localize('Risk Analysis')}</div>
                    
                    <div className="rm-value-display" style={{ marginBottom: '16px' }}>
                        <div className="rm-value-display__label">{localize('Base Stake Size')}</div>
                        <div className="rm-value-display__value">${stake.toFixed(2)}</div>
                    </div>

                    <div className="rm-value-display" style={{ marginBottom: '16px' }}>
                        <div className="rm-value-display__label">{localize('Risk Level')}</div>
                        <div className={`rm-value-display__value ${riskClass}`}>{riskLevel} Risk</div>
                        {riskPercentage > 10 && <div style={{ fontSize: '13px', color: '#f97316', marginTop: '8px', fontWeight: 600 }}>⚠️ {localize('Warning: Risk is higher than recommended (2-5%)')}</div>}
                        {riskPercentage > 20 && <div style={{ fontSize: '13px', color: '#ef4444', marginTop: '8px', fontWeight: 800 }}>🚨 {localize('Extreme Risk: High chance of blowing account quickly')}</div>}
                    </div>

                    <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                        <div className="rm-value-display" style={{ flex: 1, padding: '16px' }}>
                            <div className="rm-value-display__label">{localize('Losses to -25%')}</div>
                            <div className="rm-value-display__value" style={{ color: '#f59e0b' }}>{riskAnalysis.losses25}</div>
                        </div>
                        <div className="rm-value-display" style={{ flex: 1, padding: '16px' }}>
                            <div className="rm-value-display__label">{localize('Losses to -50%')}</div>
                            <div className="rm-value-display__value" style={{ color: '#ef4444' }}>{riskAnalysis.losses50}</div>
                        </div>
                    </div>
                </div>
            </div>

            {martingale && (
                <div className="rm-card">
                    <div className="rm-card__title">🔁 {localize('Martingale Simulation (First 4 Steps)')}</div>
                    <div className="rm-table-wrapper">
                        <table>
                            <thead>
                                <tr>
                                    <th>{localize('Trade #')}</th>
                                    <th>{localize('Stake')}</th>
                                    <th>{localize('Cumulative Loss')}</th>
                                    <th>{localize('Drawdown %')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {martingaleSteps.map(step => (
                                    <tr key={step.trade} style={{ backgroundColor: step.drawdownPercent >= 50 ? 'rgba(244, 67, 54, 0.1)' : 'transparent' }}>
                                        <td>{step.trade}</td>
                                        <td>${step.stake.toFixed(2)}</td>
                                        <td className="loss">-${step.cumulativeLoss.toFixed(2)}</td>
                                        <td style={{ color: step.drawdownPercent >= 50 ? '#f44336' : 'inherit', fontWeight: step.drawdownPercent >= 50 ? 600 : 'normal' }}>
                                            {step.drawdownPercent.toFixed(2)}%
                                            {step.drawdownPercent >= 50 && ' 🚨'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RiskCalculator;
