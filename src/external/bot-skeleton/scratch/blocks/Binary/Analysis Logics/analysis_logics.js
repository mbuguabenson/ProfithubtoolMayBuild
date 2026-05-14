import { localize } from '@deriv-com/translations';

// Helper to modify context menu (copied from utils)
const modifyContextMenu = menu => {
    if (menu && menu.length > 0) {
        menu.forEach(item => {
            if (item.text === 'Help') {
                item.enabled = false;
            }
        });
    }
};

window.Blockly.Blocks.analysis_get_power = {
    init() {
        this.jsonInit({
            message0: localize('Analysis: Get Power for %1'),
            args0: [
                {
                    type: 'field_dropdown',
                    name: 'TARGET',
                    options: [
                        [localize('Over (5-9)'), 'OVER'],
                        [localize('Under (0-4)'), 'UNDER'],
                        [localize('Even'), 'EVEN'],
                        [localize('Odd'), 'ODD'],
                    ],
                },
            ],
            output: 'Number',
            outputShape: window.Blockly.OUTPUT_SHAPE_ROUND,
            colour: '#ec4899',
            tooltip: localize('Returns the current power percentage for the selected market segment'),
            category: 'analysis',
        });
    },
    customContextMenu(menu) {
        modifyContextMenu(menu);
    },
    meta() {
        return {
            display_name: localize('analysis_get_power'),
            description: localize('Analysis: Get Power for'),
        };
    },
};

window.Blockly.JavaScript.javascriptGenerator.forBlock.analysis_get_power = function (block) {
    const target = block.getFieldValue('TARGET');
    const code = `Bot.getAnalysisPower('${target}')`;
    return [code, window.Blockly.JavaScript.javascriptGenerator.ORDER_ATOMIC];
};

window.Blockly.Blocks.analysis_is_increasing = {
    init() {
        this.jsonInit({
            message0: localize('Analysis: Is %1 Power Increasing?'),
            args0: [
                {
                    type: 'field_dropdown',
                    name: 'TARGET',
                    options: [
                        [localize('Over (5-9)'), 'OVER'],
                        [localize('Under (0-4)'), 'UNDER'],
                        [localize('Even'), 'EVEN'],
                        [localize('Odd'), 'ODD'],
                    ],
                },
            ],
            output: 'Boolean',
            outputShape: window.Blockly.OUTPUT_SHAPE_ROUND,
            colour: '#ec4899',
            tooltip: localize('Returns true if the selected market segment power is increasing'),
            category: 'analysis',
        });
    },
    customContextMenu(menu) {
        modifyContextMenu(menu);
    },
    meta() {
        return {
            display_name: localize('analysis_is_increasing'),
            description: localize('Analysis: Is Power Increasing?'),
        };
    },
};

window.Blockly.JavaScript.javascriptGenerator.forBlock.analysis_is_increasing = function (block) {
    const target = block.getFieldValue('TARGET');
    const code = `Bot.isAnalysisIncreasing('${target}')`;
    return [code, window.Blockly.JavaScript.javascriptGenerator.ORDER_ATOMIC];
};

// Advanced Digit Frequency Analysis Block
window.Blockly.Blocks.digitFrequencyAnalysis = {
    init() {
        this.jsonInit({
            message0: localize('Digit %1 frequency in last %2 ticks'),
            args0: [
                {
                    type: 'input_value',
                    name: 'DIGIT',
                    check: 'Number',
                },
                {
                    type: 'input_value',
                    name: 'TICK_COUNT',
                    check: 'Number',
                },
            ],
            output: 'Number',
            outputShape: window.Blockly.OUTPUT_SHAPE_ROUND,
            colour: '#ec4899',
            tooltip: localize('Returns the percentage frequency of a specific digit in the last N ticks'),
            category: 'analysis',
        });
    },
    customContextMenu(menu) {
        modifyContextMenu(menu);
    },
    meta() {
        return {
            display_name: localize('digitFrequencyAnalysis'),
            description: localize('Digit frequency in last ticks'),
        };
    },
};

window.Blockly.JavaScript.javascriptGenerator.forBlock.digitFrequencyAnalysis = block => {
    const digit =
        window.Blockly.JavaScript.javascriptGenerator.valueToCode(
            block,
            'DIGIT',
            window.Blockly.JavaScript.javascriptGenerator.ORDER_ATOMIC
        ) || '0';
    const tickCount =
        window.Blockly.JavaScript.javascriptGenerator.valueToCode(
            block,
            'TICK_COUNT',
            window.Blockly.JavaScript.javascriptGenerator.ORDER_ATOMIC
        ) || '50';
    const code = `Bot.digitFrequency(${digit}, ${tickCount})`;
    return [code, window.Blockly.JavaScript.javascriptGenerator.ORDER_FUNCTION_CALL];
};

// Streak Detection Block
window.Blockly.Blocks.streakDetection = {
    init() {
        this.jsonInit({
            message0: localize('Detect %1 streak of %2 in last %3 ticks'),
            args0: [
                {
                    type: 'field_dropdown',
                    name: 'PATTERN_TYPE',
                    options: [
                        [localize('consecutive'), 'consecutive'],
                        [localize('alternating'), 'alternating'],
                    ],
                },
                {
                    type: 'field_dropdown',
                    name: 'VALUE_TYPE',
                    options: [
                        [localize('even'), 'even'],
                        [localize('odd'), 'odd'],
                        [localize('over 5'), 'over5'],
                        [localize('under 5'), 'under5'],
                    ],
                },
                {
                    type: 'input_value',
                    name: 'TICK_COUNT',
                    check: 'Number',
                },
            ],
            output: 'Number',
            outputShape: window.Blockly.OUTPUT_SHAPE_ROUND,
            colour: '#ec4899',
            tooltip: localize('Returns the length of the current streak (consecutive or alternating pattern)'),
            category: 'analysis',
        });
    },
    customContextMenu(menu) {
        modifyContextMenu(menu);
    },
    meta() {
        return {
            display_name: localize('streakDetection'),
            description: localize('Detect streak of in last ticks'),
        };
    },
};

window.Blockly.JavaScript.javascriptGenerator.forBlock.streakDetection = block => {
    const patternType = block.getFieldValue('PATTERN_TYPE');
    const valueType = block.getFieldValue('VALUE_TYPE');
    const tickCount =
        window.Blockly.JavaScript.javascriptGenerator.valueToCode(
            block,
            'TICK_COUNT',
            window.Blockly.JavaScript.javascriptGenerator.ORDER_ATOMIC
        ) || '10';
    const code = `Bot.detectStreak('${patternType}', '${valueType}', ${tickCount})`;
    return [code, window.Blockly.JavaScript.javascriptGenerator.ORDER_FUNCTION_CALL];
};

// Digit Range Counter Block
window.Blockly.Blocks.digitRangeCounter = {
    init() {
        this.jsonInit({
            message0: localize('Count digits from %1 to %2 in last %3 ticks'),
            args0: [
                {
                    type: 'input_value',
                    name: 'MIN_DIGIT',
                    check: 'Number',
                },
                {
                    type: 'input_value',
                    name: 'MAX_DIGIT',
                    check: 'Number',
                },
                {
                    type: 'input_value',
                    name: 'TICK_COUNT',
                    check: 'Number',
                },
            ],
            output: 'Number',
            outputShape: window.Blockly.OUTPUT_SHAPE_ROUND,
            colour: '#ec4899',
            tooltip: localize('Returns the count of digits within a specified range in the last N ticks'),
            category: 'analysis',
        });
    },
    customContextMenu(menu) {
        modifyContextMenu(menu);
    },
    meta() {
        return {
            display_name: localize('digitRangeCounter'),
            description: localize('Count digits from to in last ticks'),
        };
    },
};

window.Blockly.JavaScript.javascriptGenerator.forBlock.digitRangeCounter = block => {
    const minDigit =
        window.Blockly.JavaScript.javascriptGenerator.valueToCode(
            block,
            'MIN_DIGIT',
            window.Blockly.JavaScript.javascriptGenerator.ORDER_ATOMIC
        ) || '0';
    const maxDigit =
        window.Blockly.JavaScript.javascriptGenerator.valueToCode(
            block,
            'MAX_DIGIT',
            window.Blockly.JavaScript.javascriptGenerator.ORDER_ATOMIC
        ) || '2';
    const tickCount =
        window.Blockly.JavaScript.javascriptGenerator.valueToCode(
            block,
            'TICK_COUNT',
            window.Blockly.JavaScript.javascriptGenerator.ORDER_ATOMIC
        ) || '50';
    const code = `Bot.countDigitsInRange(${minDigit}, ${maxDigit}, ${tickCount})`;
    return [code, window.Blockly.JavaScript.javascriptGenerator.ORDER_FUNCTION_CALL];
};

// Volatility Score Block
window.Blockly.Blocks.volatilityScore = {
    init() {
        this.jsonInit({
            message0: localize('Volatility score of last %1 ticks'),
            args0: [
                {
                    type: 'input_value',
                    name: 'TICK_COUNT',
                    check: 'Number',
                },
            ],
            output: 'Number',
            outputShape: window.Blockly.OUTPUT_SHAPE_ROUND,
            colour: '#ec4899',
            tooltip: localize('Returns a volatility score (0-100) based on digit distribution patterns'),
            category: 'analysis',
        });
    },
    customContextMenu(menu) {
        modifyContextMenu(menu);
    },
    meta() {
        return {
            display_name: localize('volatilityScore'),
            description: localize('Volatility score of last ticks'),
        };
    },
};

window.Blockly.JavaScript.javascriptGenerator.forBlock.volatilityScore = block => {
    const tickCount =
        window.Blockly.JavaScript.javascriptGenerator.valueToCode(
            block,
            'TICK_COUNT',
            window.Blockly.JavaScript.javascriptGenerator.ORDER_ATOMIC
        ) || '50';
    const code = `Bot.calculateVolatility(${tickCount})`;
    return [code, window.Blockly.JavaScript.javascriptGenerator.ORDER_FUNCTION_CALL];
};

// Trend Direction Block
window.Blockly.Blocks.trendDirection = {
    init() {
        this.jsonInit({
            message0: localize('%1 trend in last %2 ticks'),
            args0: [
                {
                    type: 'field_dropdown',
                    name: 'TREND_TYPE',
                    options: [
                        [localize('digit sum'), 'sum'],
                        [localize('even/odd balance'), 'evenodd'],
                        [localize('high/low balance'), 'highlow'],
                    ],
                },
                {
                    type: 'input_value',
                    name: 'TICK_COUNT',
                    check: 'Number',
                },
            ],
            output: 'String',
            outputShape: window.Blockly.OUTPUT_SHAPE_ROUND,
            colour: '#ec4899',
            tooltip: localize('Returns trend direction: "rising", "falling", or "neutral"'),
            category: 'analysis',
        });
    },
    customContextMenu(menu) {
        modifyContextMenu(menu);
    },
    meta() {
        return {
            display_name: localize('trendDirection'),
            description: localize('trend in last ticks'),
        };
    },
};

window.Blockly.JavaScript.javascriptGenerator.forBlock.trendDirection = block => {
    const trendType = block.getFieldValue('TREND_TYPE');
    const tickCount =
        window.Blockly.JavaScript.javascriptGenerator.valueToCode(
            block,
            'TICK_COUNT',
            window.Blockly.JavaScript.javascriptGenerator.ORDER_ATOMIC
        ) || '20';
    const code = `Bot.analyzeTrend('${trendType}', ${tickCount})`;
    return [code, window.Blockly.JavaScript.javascriptGenerator.ORDER_FUNCTION_CALL];
};

// Digit By Rank Block
window.Blockly.Blocks.digitByRank = {
    init() {
        this.jsonInit({
            message0: localize('Digit by rank %1 (1=least) in last %2 ticks'),
            args0: [
                {
                    type: 'input_value',
                    name: 'RANK',
                    check: 'Number',
                },
                {
                    type: 'input_value',
                    name: 'TICK_COUNT',
                    check: 'Number',
                },
            ],
            output: 'Number',
            outputShape: window.Blockly.OUTPUT_SHAPE_ROUND,
            colour: '#ec4899',
            tooltip: localize('Returns the digit with the specified frequency rank (e.g., 3rd least appearing)'),
            category: 'analysis',
        });
    },
    customContextMenu(menu) {
        modifyContextMenu(menu);
    },
    meta() {
        return {
            display_name: localize('digitByRank'),
            description: localize('Digit by rank (1=least) in last ticks'),
        };
    },
};

window.Blockly.JavaScript.javascriptGenerator.forBlock.digitByRank = block => {
    const rank =
        window.Blockly.JavaScript.javascriptGenerator.valueToCode(
            block,
            'RANK',
            window.Blockly.JavaScript.javascriptGenerator.ORDER_ATOMIC
        ) || '1';
    const tickCount =
        window.Blockly.JavaScript.javascriptGenerator.valueToCode(
            block,
            'TICK_COUNT',
            window.Blockly.JavaScript.javascriptGenerator.ORDER_ATOMIC
        ) || '100';
    const code = `Bot.getDigitByRank(${rank}, ${tickCount})`;
    return [code, window.Blockly.JavaScript.javascriptGenerator.ORDER_FUNCTION_CALL];
};

// Candle Pattern Block
window.Blockly.Blocks.identifyCandlePattern = {
    init() {
        this.jsonInit({
            message0: localize('Identify candle pattern in last %1 candles'),
            args0: [
                {
                    type: 'input_value',
                    name: 'TICK_COUNT',
                    check: 'Number',
                },
            ],
            output: 'String',
            outputShape: window.Blockly.OUTPUT_SHAPE_ROUND,
            colour: '#ec4899',
            tooltip: localize('Identifies patterns like hammer, shooting star, or neutral'),
            category: 'analysis',
        });
    },
    customContextMenu(menu) {
        modifyContextMenu(menu);
    },
    meta() {
        return {
            display_name: localize('identifyCandlePattern'),
            description: localize('Identify candle pattern in last candles'),
        };
    },
};

window.Blockly.JavaScript.javascriptGenerator.forBlock.identifyCandlePattern = block => {
    const tickCount =
        window.Blockly.JavaScript.javascriptGenerator.valueToCode(
            block,
            'TICK_COUNT',
            window.Blockly.JavaScript.javascriptGenerator.ORDER_ATOMIC
        ) || '3';
    const code = `Bot.identifyCandlePattern(${tickCount})`;
    return [code, window.Blockly.JavaScript.javascriptGenerator.ORDER_FUNCTION_CALL];
};

// Market Momentum Block
window.Blockly.Blocks.analyzeMomentum = {
    init() {
        this.jsonInit({
            message0: localize('Market momentum in last %1 ticks'),
            args0: [
                {
                    type: 'input_value',
                    name: 'TICK_COUNT',
                    check: 'Number',
                },
            ],
            output: 'String',
            outputShape: window.Blockly.OUTPUT_SHAPE_ROUND,
            colour: '#ec4899',
            tooltip: localize('Returns momentum strength: strong_bullish, mild_bullish, etc.'),
            category: 'analysis',
        });
    },
    customContextMenu(menu) {
        modifyContextMenu(menu);
    },
    meta() {
        return {
            display_name: localize('analyzeMomentum'),
            description: localize('Market momentum in last ticks'),
        };
    },
};

window.Blockly.JavaScript.javascriptGenerator.forBlock.analyzeMomentum = block => {
    const tickCount =
        window.Blockly.JavaScript.javascriptGenerator.valueToCode(
            block,
            'TICK_COUNT',
            window.Blockly.JavaScript.javascriptGenerator.ORDER_ATOMIC
        ) || '10';
    const code = `Bot.analyzeMomentum(${tickCount})`;
    return [code, window.Blockly.JavaScript.javascriptGenerator.ORDER_FUNCTION_CALL];
};

// Volume Health Block
window.Blockly.Blocks.checkVolumeHealth = {
    init() {
        this.jsonInit({
            message0: localize('Market volume health in last %1 ticks'),
            args0: [
                {
                    type: 'input_value',
                    name: 'TICK_COUNT',
                    check: 'Number',
                },
            ],
            output: 'String',
            outputShape: window.Blockly.OUTPUT_SHAPE_ROUND,
            colour: '#ec4899',
            tooltip: localize('Returns "high" or "low" based on market activity (ticks movement)'),
            category: 'analysis',
        });
    },
    customContextMenu(menu) {
        modifyContextMenu(menu);
    },
    meta() {
        return {
            display_name: localize('checkVolumeHealth'),
            description: localize('Market volume health in last ticks'),
        };
    },
};

window.Blockly.JavaScript.javascriptGenerator.forBlock.checkVolumeHealth = block => {
    const tickCount =
        window.Blockly.JavaScript.javascriptGenerator.valueToCode(
            block,
            'TICK_COUNT',
            window.Blockly.JavaScript.javascriptGenerator.ORDER_ATOMIC
        ) || '20';
    const code = `Bot.checkVolumeHealth(${tickCount})`;
    return [code, window.Blockly.JavaScript.javascriptGenerator.ORDER_FUNCTION_CALL];
};
