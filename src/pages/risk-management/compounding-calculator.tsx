import React, { useState, useEffect, useMemo } from 'react';
import { localize } from '@deriv-com/translations';

type SessionStatus = 'pending' | 'won' | 'lost';

interface SessionData {
    sessionNumber: number;
    startBalance: number;
    stake: number;
    profit: number;
    endBalance: number;
    status: SessionStatus;
}

const CompoundingCalculator = () => {
    // Try to load from localStorage first
    const loadState = (key: string, defaultValue: any) => {
        const saved = localStorage.getItem(`rm_compounding_${key}`);
        if (saved !== null) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                return saved;
            }
        }
        return defaultValue;
    };

    const [startBalance, setStartBalance] = useState<number>(loadState('startBalance', 100));
    const [targetBalance, setTargetBalance] = useState<number>(loadState('targetBalance', 500));
    const [numSessions, setNumSessions] = useState<number>(loadState('numSessions', 30));
    const [riskPercentage, setRiskPercentage] = useState<number>(loadState('riskPercentage', 5));
    const [martingale, setMartingale] = useState<boolean>(loadState('martingale', false));
    
    const [sessions, setSessions] = useState<SessionData[]>(loadState('sessions', []));

    // Save to localStorage whenever states change
    useEffect(() => {
        localStorage.setItem('rm_compounding_startBalance', JSON.stringify(startBalance));
        localStorage.setItem('rm_compounding_targetBalance', JSON.stringify(targetBalance));
        localStorage.setItem('rm_compounding_numSessions', JSON.stringify(numSessions));
        localStorage.setItem('rm_compounding_riskPercentage', JSON.stringify(riskPercentage));
        localStorage.setItem('rm_compounding_martingale', JSON.stringify(martingale));
        localStorage.setItem('rm_compounding_sessions', JSON.stringify(sessions));
    }, [startBalance, targetBalance, numSessions, riskPercentage, martingale, sessions]);

    const calculateSessions = () => {
        if (startBalance <= 0 || numSessions <= 0 || riskPercentage <= 0) return;

        let currentBalance = startBalance;
        const newSessions: SessionData[] = [];
        let martingaleMultiplier = 1;

        for (let i = 1; i <= numSessions; i++) {
            // Recalculate stake based on current balance and risk, or apply martingale if previous was lost
            let stake = (currentBalance * riskPercentage) / 100;
            if (martingale && i > 1 && newSessions[i - 2].status === 'lost') {
                martingaleMultiplier *= 2;
                stake = ((newSessions[i-2].startBalance * riskPercentage) / 100) * martingaleMultiplier;
            } else {
                martingaleMultiplier = 1;
            }

            // Default simulation assumes 1:1 profit ratio (e.g. 100% payout for simplicity, though deriv is ~95%)
            // Let's assume 95% payout for realism
            const profitIfWon = stake * 0.95;

            newSessions.push({
                sessionNumber: i,
                startBalance: currentBalance,
                stake: stake,
                profit: profitIfWon,
                endBalance: currentBalance + profitIfWon,
                status: 'pending',
            });
            
            // For initial generation, we don't update currentBalance because it's pending.
            // But we simulate a perfect run for the 'endBalance' preview if all won.
            currentBalance += profitIfWon;
        }

        setSessions(newSessions);
    };

    useEffect(() => {
        if (sessions.length === 0) {
            calculateSessions();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleStatusChange = (index: number, newStatus: SessionStatus) => {
        const updatedSessions = [...sessions];
        updatedSessions[index].status = newStatus;

        // Recalculate subsequent balances
        let currentBalance = updatedSessions[0].startBalance;
        let martingaleMultiplier = 1;

        for (let i = 0; i < updatedSessions.length; i++) {
            const session = updatedSessions[i];
            session.startBalance = currentBalance;

            let stake = (currentBalance * riskPercentage) / 100;
            if (martingale && i > 0 && updatedSessions[i - 1].status === 'lost') {
                martingaleMultiplier *= 2;
                stake = ((updatedSessions[i-1].startBalance * riskPercentage) / 100) * martingaleMultiplier;
            } else {
                martingaleMultiplier = 1;
            }

            session.stake = stake;
            const profitIfWon = stake * 0.95;
            session.profit = profitIfWon;

            if (session.status === 'won') {
                currentBalance += profitIfWon;
                session.endBalance = currentBalance;
            } else if (session.status === 'lost') {
                currentBalance -= stake;
                session.endBalance = currentBalance;
            } else {
                // If pending, just show what the end balance WOULD be if won
                session.endBalance = currentBalance + profitIfWon;
            }
        }

        setSessions(updatedSessions);
    };

    const exportCSV = () => {
        const headers = ['Session', 'Start Balance', 'Stake', 'Profit/Loss', 'End Balance', 'Status'];
        const csvRows = [headers.join(',')];

        sessions.forEach(s => {
            const row = [
                s.sessionNumber,
                s.startBalance.toFixed(2),
                s.stake.toFixed(2),
                (s.status === 'won' ? s.profit : s.status === 'lost' ? -s.stake : 0).toFixed(2),
                s.endBalance.toFixed(2),
                s.status
            ];
            csvRows.push(row.join(','));
        });

        const csvString = csvRows.join('\n');
        const blob = new Blob([csvString], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.setAttribute('href', url);
        a.setAttribute('download', 'compounding_sessions.csv');
        a.click();
    };

    const formatMoney = (val: number) => `$${val.toFixed(2)}`;

    return (
        <div className="compounding-calculator">
            <div className="rm-card">
                <div className="rm-card__title">⚙️ {localize('Settings')}</div>
                <div className="rm-grid">
                    <div className="rm-input-group">
                        <label>{localize('Starting Balance (USD)')}</label>
                        <input type="number" value={startBalance} onChange={(e) => setStartBalance(Number(e.target.value))} />
                    </div>
                    <div className="rm-input-group">
                        <label>{localize('Target Balance (USD)')}</label>
                        <input type="number" value={targetBalance} onChange={(e) => setTargetBalance(Number(e.target.value))} />
                    </div>
                    <div className="rm-input-group">
                        <label>{localize('Number of Sessions')}</label>
                        <input type="number" value={numSessions} onChange={(e) => setNumSessions(Number(e.target.value))} />
                    </div>
                    <div className="rm-input-group">
                        <label>{localize('Risk per Trade (%)')}</label>
                        <select value={riskPercentage} onChange={(e) => setRiskPercentage(Number(e.target.value))}>
                            <option value={2}>2%</option>
                            <option value={5}>5%</option>
                            <option value={10}>10%</option>
                            <option value={20}>20%</option>
                        </select>
                    </div>
                    <div className="rm-input-group" style={{ justifyContent: 'center' }}>
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
                </div>
                <div style={{ marginTop: '16px', display: 'flex', gap: '12px' }}>
                    <button className="rm-btn rm-btn--primary" onClick={calculateSessions}>{localize('Generate Plan')}</button>
                    <button className="rm-btn rm-btn--secondary" onClick={exportCSV}>{localize('Export CSV')}</button>
                </div>
            </div>

            <div className="rm-card">
                <div className="rm-card__title">📊 {localize('Session Tracker')}</div>
                <div className="rm-table-wrapper">
                    <table>
                        <thead>
                            <tr>
                                <th>{localize('Session #')}</th>
                                <th>{localize('Start Balance')}</th>
                                <th>{localize('Stake')}</th>
                                <th>{localize('Target Profit')}</th>
                                <th>{localize('End Balance')}</th>
                                <th>{localize('Status')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sessions.map((session, index) => (
                                <tr key={session.sessionNumber}>
                                    <td>{session.sessionNumber}</td>
                                    <td>{formatMoney(session.startBalance)}</td>
                                    <td>{formatMoney(session.stake)}</td>
                                    <td className={session.status === 'won' ? 'profit' : session.status === 'lost' ? 'loss' : ''}>
                                        {session.status === 'lost' ? `-${formatMoney(session.stake)}` : `+${formatMoney(session.profit)}`}
                                    </td>
                                    <td>{formatMoney(session.endBalance)}</td>
                                    <td>
                                        <select 
                                            className={`status-select ${session.status}`}
                                            value={session.status} 
                                            onChange={(e) => handleStatusChange(index, e.target.value as SessionStatus)}
                                        >
                                            <option value="pending">{localize('Pending')}</option>
                                            <option value="won">{localize('✅ Won')}</option>
                                            <option value="lost">{localize('❌ Lost')}</option>
                                        </select>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default CompoundingCalculator;
