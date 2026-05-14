import { localize } from '@deriv-com/translations';

const modifyContextMenu = menu => {
    if (menu && menu.length > 0) {
        menu.forEach(item => {
            if (item.text === 'Help') {
                item.enabled = false;
            }
        });
    }
};

window.Blockly.Blocks.markov_probability = {
    init() {
        this.jsonInit({
            message0: localize('Markov prob. of digit %1 after digit %2 (last %3 ticks)'),
            args0: [
                { type: 'input_value', name: 'TARGET_DIGIT', check: 'Number' },
                { type: 'input_value', name: 'PREV_DIGIT', check: 'Number' },
                { type: 'input_value', name: 'TICK_COUNT', check: 'Number' },
            ],
            output: 'Number',
            outputShape: window.Blockly.OUTPUT_SHAPE_ROUND,
            colour: '#8b0000',
            tooltip: localize('Returns probability (0-100) of sequence using Markov Transition Matrix'),
            category: 'premium_analysis',
        });
    },
    customContextMenu(menu) {
        modifyContextMenu(menu);
    },
    meta() {
        return {
            display_name: localize('Markov Probability'),
            description: localize('Returns probability (0-100) of sequence using Markov Transition Matrix'),
        };
    },
};

window.Blockly.JavaScript.javascriptGenerator.forBlock.markov_probability = block => {
    const targetDigit =
        window.Blockly.JavaScript.javascriptGenerator.valueToCode(
            block,
            'TARGET_DIGIT',
            window.Blockly.JavaScript.javascriptGenerator.ORDER_ATOMIC
        ) || '0';
    const prevDigit =
        window.Blockly.JavaScript.javascriptGenerator.valueToCode(
            block,
            'PREV_DIGIT',
            window.Blockly.JavaScript.javascriptGenerator.ORDER_ATOMIC
        ) || '0';
    const tickCount =
        window.Blockly.JavaScript.javascriptGenerator.valueToCode(
            block,
            'TICK_COUNT',
            window.Blockly.JavaScript.javascriptGenerator.ORDER_ATOMIC
        ) || '100';
    const code = `Bot.getMarkovProbability(${targetDigit}, ${prevDigit}, ${tickCount})`;
    return [code, window.Blockly.JavaScript.javascriptGenerator.ORDER_FUNCTION_CALL];
};

window.Blockly.Blocks.market_entropy = {
    init() {
        this.jsonInit({
            message0: localize('Market Entropy Score (last %1 ticks)'),
            args0: [{ type: 'input_value', name: 'TICK_COUNT', check: 'Number' }],
            output: 'Number',
            outputShape: window.Blockly.OUTPUT_SHAPE_ROUND,
            colour: '#8b0000',
            tooltip: localize('Returns Entropy (0-100). Low = predictable sequence, High = extreme randomness'),
            category: 'premium_analysis',
        });
    },
    customContextMenu(menu) {
        modifyContextMenu(menu);
    },
    meta() {
        return {
            display_name: localize('Market Entropy'),
            description: localize('Returns Entropy (0-100). Low = predictable sequence, High = extreme randomness'),
        };
    },
};

window.Blockly.JavaScript.javascriptGenerator.forBlock.market_entropy = block => {
    const tickCount =
        window.Blockly.JavaScript.javascriptGenerator.valueToCode(
            block,
            'TICK_COUNT',
            window.Blockly.JavaScript.javascriptGenerator.ORDER_ATOMIC
        ) || '100';
    const code = `Bot.getMarketEntropy(${tickCount})`;
    return [code, window.Blockly.JavaScript.javascriptGenerator.ORDER_FUNCTION_CALL];
};

window.Blockly.Blocks.signal_confidence = {
    init() {
        this.jsonInit({
            message0: localize('Signal Confidence for digit %1 (last %2 ticks)'),
            args0: [
                { type: 'input_value', name: 'TARGET_DIGIT', check: 'Number' },
                { type: 'input_value', name: 'TICK_COUNT', check: 'Number' },
            ],
            output: 'Number',
            outputShape: window.Blockly.OUTPUT_SHAPE_ROUND,
            colour: '#8b0000',
            tooltip: localize('Weighted confidence score (0-100) combining Markov, Entropy, and Frequency'),
            category: 'premium_analysis',
        });
    },
    customContextMenu(menu) {
        modifyContextMenu(menu);
    },
    meta() {
        return {
            display_name: localize('Signal Confidence'),
            description: localize('Weighted confidence score (0-100) combining Markov, Entropy, and Frequency'),
        };
    },
};

window.Blockly.JavaScript.javascriptGenerator.forBlock.signal_confidence = block => {
    const targetDigit =
        window.Blockly.JavaScript.javascriptGenerator.valueToCode(
            block,
            'TARGET_DIGIT',
            window.Blockly.JavaScript.javascriptGenerator.ORDER_ATOMIC
        ) || '0';
    const tickCount =
        window.Blockly.JavaScript.javascriptGenerator.valueToCode(
            block,
            'TICK_COUNT',
            window.Blockly.JavaScript.javascriptGenerator.ORDER_ATOMIC
        ) || '100';
    const code = `Bot.getSignalConfidence(${targetDigit}, ${tickCount})`;
    return [code, window.Blockly.JavaScript.javascriptGenerator.ORDER_FUNCTION_CALL];
};
