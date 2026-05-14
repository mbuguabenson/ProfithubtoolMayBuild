import { useEffect, useMemo, useState } from 'react';
import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import { useStore } from '@/hooks/useStore';
import { AnomalyDetector, BacktestingEngine, MultiStepPredictor, NeuralPatternRecognizer } from '@/lib/ai/predictors';
import './smart-analysis-tab.scss';

const AIAnalysisTab = observer(() => {
    const { smart_trading, app } = useStore();
    const { ticks, symbol, setSymbol, current_price, last_digit, markets, updateDigitStats, active_symbols_data } =
        smart_trading;
    const ticks_service = app.api_helpers_store?.ticks_service;
    const [isLearning, setIsLearning] = useState(true);

    useEffect(() => {
        if (!ticks_service || !symbol) return;

        let is_mounted = true;
        let listenerKey: string | null = null;

        const monitorTicks = async () => {
            const callback = (ticks_data: { quote: string | number }[]) => {
                if (is_mounted && ticks_data && ticks_data.length > 0) {
                    const latest = ticks_data[ticks_data.length - 1];
                    const symbol_info = active_symbols_data[symbol];

                    const last_digits = ticks_data.slice(-100).map(t => {
                        let quote_str = String(t.quote || '0');
                        if (symbol_info && typeof t.quote === 'number') {
                            const decimals = Math.abs(Math.log10(symbol_info.pip));
                            quote_str = t.quote.toFixed(decimals);
                        }
                        const digit = parseInt(quote_str[quote_str.length - 1]);
                        return isNaN(digit) ? 0 : digit;
                    });
                    updateDigitStats(last_digits, latest.quote);
                }
            };

            listenerKey = await ticks_service.monitor({ symbol, callback });
        };

        monitorTicks();

        return () => {
            is_mounted = false;
            if (listenerKey) ticks_service.stopMonitor({ symbol, key: listenerKey });
        };
    }, [symbol, ticks_service, updateDigitStats, active_symbols_data]);

    // Simulate learning
    useEffect(() => {
        const timer = setTimeout(() => setIsLearning(false), 2000);
        return () => clearTimeout(timer);
    }, [ticks]);

    // Initialize AI models
    const aiAnalysis = useMemo(() => {
        if (ticks.length < 50) {
            return null; // Need minimum data
        }

        // Train models
        const predictor = new MultiStepPredictor(ticks);
        const patternRecognizer = new NeuralPatternRecognizer();
        patternRecognizer.train(ticks);

        const anomalyDetector = new AnomalyDetector();
        anomalyDetector.calibrate(ticks.slice(0, -20)); // Use earlier data as baseline

        // Get predictions
        const nextNPredictions = predictor.predictNextN(ticks, 5);
        const patterns = patternRecognizer.detectPatterns(ticks.slice(-20));
        const anomalies = anomalyDetector.detect(ticks.slice(-20));

        // Backtest
        const backtester = new BacktestingEngine();
        const backtestResults = backtester.backtest(predictor, ticks, 'match');

        // Calculate model confidence
        const avgConfidence = nextNPredictions.reduce((sum, p) => sum + p.probability, 0) / nextNPredictions.length;

        return {
            predictions: nextNPredictions,
            patterns,
            anomalies,
            backtestResults,
            modelConfidence: avgConfidence,
            patternsFound: patterns.length,
            isLearning,
        };
    }, [ticks, isLearning]);

    if (!aiAnalysis) {
        return (
            <div className='smart-analysis-tab'>
                <div className='flex items-center justify-center' style={{ minHeight: '400px' }}>
                    <div style={{ textAlign: 'center' }}>
                        <div className='animate-pulse' style={{ fontSize: '64px', marginBottom: '16px', opacity: 0.6 }}>
                            🧠
                        </div>
                        <p style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px', color: '#fff' }}>
                            AI Model Initializing...
                        </p>
                        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)' }}>
                            Collecting data (minimum 50 ticks required)
                        </p>
                        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', marginTop: '8px' }}>
                            Current: {ticks.length} / 50 ticks
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className='smart-analysis-tab'>
            {/* Header */}
            <div className='premium-market-header'>
                <div className='market-select-glass'>
                    <label>MARKET</label>
                    <select value={symbol} onChange={e => setSymbol(e.target.value)}>
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

                <div className='price-display-glass'>
                    <span className='lbl'>LIVE PRICE</span>
                    <span className='val'>{current_price}</span>
                </div>

                <div className='digit-display-glass'>
                    <span className='lbl'>LAST DIGIT</span>
                    <div className={classNames('digit-box', `d-${last_digit}`)}>{last_digit}</div>
                </div>

                <div
                    className='digit-display-glass'
                    style={{
                        background: isLearning
                            ? 'linear-gradient(135deg, rgba(234, 179, 8, 0.1), rgba(234, 179, 8, 0.05))'
                            : 'linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(34, 197, 94, 0.05))',
                    }}
                >
                    <span className='lbl'>AI STATUS</span>
                    <div
                        className='digit-box'
                        style={{
                            background: isLearning ? 'rgba(234, 179, 8, 0.2)' : 'rgba(34, 197, 94, 0.2)',
                            color: isLearning ? '#eab308' : '#22c55e',
                            border: isLearning ? '2px solid #eab308' : '2px solid #22c55e',
                        }}
                    >
                        {isLearning ? '⏳' : '✓'}
                    </div>
                </div>
            </div>

            <h2 className='section-title'>🧠 AI Analysis Dashboard</h2>

            {/* AI Confidence Dashboard */}
            <div className='bottom-summary-grid'>
                <div className='stat-box-colorful'>
                    <div className='info-col'>
                        <div className='lbl'>Model Confidence</div>
                        <div className='val'>{aiAnalysis.modelConfidence.toFixed(0)}%</div>
                    </div>
                    <div className='meta-col'>
                        <div className='pct-tag' style={{ color: '#a855f7' }}>
                            AI
                        </div>
                    </div>
                </div>

                <div className='stat-box-colorful'>
                    <div className='info-col'>
                        <div className='lbl'>Accuracy Rate</div>
                        <div className='val'>{aiAnalysis.backtestResults.accuracy.toFixed(1)}%</div>
                    </div>
                    <div className='meta-col'>
                        <div className='pct-tag' style={{ color: '#22c55e' }}>
                            TEST
                        </div>
                    </div>
                </div>

                <div className='stat-box-colorful'>
                    <div className='info-col'>
                        <div className='lbl'>Learning Status</div>
                        <div className='val' style={{ fontSize: '20px' }}>
                            {isLearning ? 'Active' : 'Idle'}
                        </div>
                    </div>
                    <div className='meta-col'>
                        <div className='pct-tag' style={{ color: '#3b82f6' }}>
                            MODE
                        </div>
                    </div>
                </div>

                <div className='stat-box-colorful'>
                    <div className='info-col'>
                        <div className='lbl'>Patterns Found</div>
                        <div className='val'>{aiAnalysis.patternsFound}</div>
                    </div>
                    <div className='meta-col'>
                        <div className='pct-tag' style={{ color: '#f97316' }}>
                            DATA
                        </div>
                    </div>
                </div>
            </div>

            {/* Next 5 Predictions */}
            <div className='glass-card'>
                <h3>🎯 Next 5 Digit Predictions</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
                    {aiAnalysis.predictions.map((pred, index) => (
                        <div
                            key={index}
                            className='glass-card'
                            style={{
                                padding: '16px',
                                borderLeft:
                                    pred.confidence === 'very_high'
                                        ? '4px solid #22c55e'
                                        : pred.confidence === 'high'
                                          ? '4px solid #3b82f6'
                                          : pred.confidence === 'medium'
                                            ? '4px solid #eab308'
                                            : '4px solid #ef4444',
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <span
                                        style={{
                                            background: 'rgba(168, 85, 247, 0.2)',
                                            color: '#a855f7',
                                            padding: '4px 12px',
                                            borderRadius: '4px',
                                            fontSize: '12px',
                                            fontWeight: 'bold',
                                        }}
                                    >
                                        #{pred.step}
                                    </span>
                                    <span
                                        className={classNames('digit-box', `d-${pred.digit}`)}
                                        style={{ fontSize: '24px', width: '40px', height: '40px' }}
                                    >
                                        {pred.digit}
                                    </span>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#fff' }}>
                                        {pred.probability.toFixed(0)}%
                                    </span>
                                    <span
                                        style={{
                                            padding: '4px 12px',
                                            borderRadius: '4px',
                                            fontSize: '12px',
                                            fontWeight: 'bold',
                                            background:
                                                pred.confidence === 'very_high'
                                                    ? 'rgba(34, 197, 94, 0.2)'
                                                    : pred.confidence === 'high'
                                                      ? 'rgba(59, 130, 246, 0.2)'
                                                      : pred.confidence === 'medium'
                                                        ? 'rgba(234, 179, 8, 0.2)'
                                                        : 'rgba(239, 68, 68, 0.2)',
                                            color:
                                                pred.confidence === 'very_high'
                                                    ? '#22c55e'
                                                    : pred.confidence === 'high'
                                                      ? '#3b82f6'
                                                      : pred.confidence === 'medium'
                                                        ? '#eab308'
                                                        : '#ef4444',
                                        }}
                                    >
                                        {pred.confidence.replace('_', ' ').toUpperCase()}
                                    </span>
                                </div>
                            </div>

                            <div
                                style={{
                                    height: '8px',
                                    background: 'rgba(255,255,255,0.1)',
                                    borderRadius: '4px',
                                    overflow: 'hidden',
                                    marginBottom: '8px',
                                }}
                            >
                                <div
                                    style={{
                                        height: '100%',
                                        width: `${pred.probability}%`,
                                        background:
                                            pred.confidence === 'very_high'
                                                ? '#22c55e'
                                                : pred.confidence === 'high'
                                                  ? '#3b82f6'
                                                  : pred.confidence === 'medium'
                                                    ? '#eab308'
                                                    : '#ef4444',
                                        transition: 'width 0.3s ease',
                                    }}
                                />
                            </div>

                            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>Method: {pred.method}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Anomaly Alerts */}
            {aiAnalysis.anomalies.length > 0 && (
                <div className='glass-card'>
                    <h3>⚠️ Anomaly Alerts</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
                        {aiAnalysis.anomalies.map((anomaly, index) => (
                            <div
                                key={index}
                                className='glass-card'
                                style={{
                                    padding: '16px',
                                    borderLeft:
                                        anomaly.severity === 'critical'
                                            ? '4px solid #ef4444'
                                            : anomaly.severity === 'high'
                                              ? '4px solid #f97316'
                                              : anomaly.severity === 'medium'
                                                ? '4px solid #eab308'
                                                : '4px solid #3b82f6',
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                    <strong style={{ color: '#fff' }}>{anomaly.description}</strong>
                                    <span
                                        style={{
                                            padding: '4px 12px',
                                            borderRadius: '4px',
                                            fontSize: '12px',
                                            fontWeight: 'bold',
                                            background:
                                                anomaly.severity === 'critical'
                                                    ? 'rgba(239, 68, 68, 0.2)'
                                                    : anomaly.severity === 'high'
                                                      ? 'rgba(249, 115, 22, 0.2)'
                                                      : anomaly.severity === 'medium'
                                                        ? 'rgba(234, 179, 8, 0.2)'
                                                        : 'rgba(59, 130, 246, 0.2)',
                                            color:
                                                anomaly.severity === 'critical'
                                                    ? '#ef4444'
                                                    : anomaly.severity === 'high'
                                                      ? '#f97316'
                                                      : anomaly.severity === 'medium'
                                                        ? '#eab308'
                                                        : '#3b82f6',
                                        }}
                                    >
                                        {anomaly.severity.toUpperCase()}
                                    </span>
                                </div>
                                <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.8)' }}>
                                    💡 {anomaly.recommendation}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Pattern Detection */}
            {aiAnalysis.patterns.length > 0 && (
                <div className='glass-card'>
                    <h3>🔍 Detected Patterns</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
                        {aiAnalysis.patterns.slice(0, 5).map((pattern, index) => (
                            <div key={index} className='glass-card' style={{ padding: '16px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                    <span style={{ fontFamily: 'monospace', fontWeight: 'bold', color: '#f97316' }}>
                                        [{pattern.sequence.join(', ')}]
                                    </span>
                                    <span
                                        style={{
                                            padding: '4px 12px',
                                            borderRadius: '4px',
                                            fontSize: '12px',
                                            fontWeight: 'bold',
                                            background: 'rgba(249, 115, 22, 0.2)',
                                            color: '#f97316',
                                        }}
                                    >
                                        {pattern.confidence.toFixed(0)}% confidence
                                    </span>
                                </div>
                                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>
                                    Frequency: {pattern.frequency}x | Last seen: {pattern.lastSeen} ticks ago
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Backtesting Results */}
            <div className='glass-card'>
                <h3>📊 Backtest Performance</h3>
                <div className='bottom-summary-grid' style={{ marginTop: '16px' }}>
                    <div className='stat-box-colorful'>
                        <div className='info-col'>
                            <div className='lbl'>Accuracy</div>
                            <div className='val'>{aiAnalysis.backtestResults.accuracy.toFixed(1)}%</div>
                        </div>
                    </div>

                    <div className='stat-box-colorful'>
                        <div className='info-col'>
                            <div className='lbl'>Precision</div>
                            <div className='val'>{aiAnalysis.backtestResults.precision.toFixed(1)}%</div>
                        </div>
                    </div>

                    <div className='stat-box-colorful'>
                        <div className='info-col'>
                            <div className='lbl'>Recall</div>
                            <div className='val'>{aiAnalysis.backtestResults.recall.toFixed(1)}%</div>
                        </div>
                    </div>

                    <div className='stat-box-colorful'>
                        <div className='info-col'>
                            <div className='lbl'>P/L (units)</div>
                            <div
                                className='val'
                                style={{ color: aiAnalysis.backtestResults.profitLoss > 0 ? '#22c55e' : '#ef4444' }}
                            >
                                {aiAnalysis.backtestResults.profitLoss > 0 ? '+' : ''}
                                {aiAnalysis.backtestResults.profitLoss.toFixed(2)}
                            </div>
                        </div>
                    </div>
                </div>

                <div className='glass-card' style={{ marginTop: '16px', padding: '16px' }}>
                    <p style={{ fontSize: '14px', marginBottom: '8px', color: 'rgba(255,255,255,0.8)' }}>
                        <strong>True Positives:</strong> {aiAnalysis.backtestResults.truePositives} |{' '}
                        <strong>False Positives:</strong> {aiAnalysis.backtestResults.falsePositives}
                    </p>
                    <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>
                        Model tested on last {ticks.length} ticks
                    </p>
                </div>
            </div>
        </div>
    );
});

export default AIAnalysisTab;
