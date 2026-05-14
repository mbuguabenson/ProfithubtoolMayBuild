import { localize } from '@deriv-com/translations';
import { modifyContextMenu } from '../../../utils';

// Martingale with Compounding Block
window.Blockly.Blocks.martingaleWithCompounding = {
    init() {
        this.jsonInit(this.definition());
    },
    definition() {
        return {
            message0: localize('Martingale with Compounding %1 Base Stake: %2 Multiplier: %3 Profit: %4'),
            args0: [
                {
                    type: 'field_dropdown',
                    name: 'STRATEGY',
                    options: [
                        [localize('Standard'), 'standard'],
                        [localize('Aggressive'), 'aggressive'],
                    ],
                },
                {
                    type: 'input_value',
                    name: 'BASE_STAKE',
                    check: 'Number',
                },
                {
                    type: 'input_value',
                    name: 'MULTIPLIER',
                    check: 'Number',
                },
                {
                    type: 'input_value',
                    name: 'PROFIT',
                    check: 'Number',
                },
            ],
            output: 'Number',
            outputShape: window.Blockly.OUTPUT_SHAPE_ROUND,
            colour: window.Blockly.Colours.Base.colour,
            colourSecondary: window.Blockly.Colours.Base.colourSecondary,
            colourTertiary: window.Blockly.Colours.Base.colourTertiary,
            tooltip: localize('Calculates next stake using Martingale for losses and Compounding for wins.'),
            category: window.Blockly.Categories.Mathematical,
        };
    },
    meta() {
        return {
            display_name: localize('Martingale with Compounding'),
            description: localize('A combined strategy block for risk management.'),
        };
    },
    customContextMenu(menu) {
        modifyContextMenu(menu);
    },
};

window.Blockly.JavaScript.javascriptGenerator.forBlock.martingaleWithCompounding = block => {
    const strategy = block.getFieldValue('STRATEGY');
    const baseStake =
        window.Blockly.JavaScript.javascriptGenerator.valueToCode(
            block,
            'BASE_STAKE',
            window.Blockly.JavaScript.javascriptGenerator.ORDER_ATOMIC
        ) || '0.35';
    const multiplier =
        window.Blockly.JavaScript.javascriptGenerator.valueToCode(
            block,
            'MULTIPLIER',
            window.Blockly.JavaScript.javascriptGenerator.ORDER_ATOMIC
        ) || '2.1';
    const profit =
        window.Blockly.JavaScript.javascriptGenerator.valueToCode(
            block,
            'PROFIT',
            window.Blockly.JavaScript.javascriptGenerator.ORDER_ATOMIC
        ) || '0';

    // Logic: If profit is negative (loss), use martingale. If profit is positive, use compounding.
    // Enhanced: Aggressive strategy doubles the base on compounding.
    const code = `(() => {
        const strat = '${strategy}';
        const base = Number(${baseStake});
        const mult = Number(${multiplier});
        const p = Number(${profit});
        if (p < 0) return base * mult;
        if (p > 0) return strat === 'aggressive' ? base + (p * 1.5) : base + p;
        return base;
    })()`;
    return [code, window.Blockly.JavaScript.javascriptGenerator.ORDER_FUNCTION_CALL];
};
