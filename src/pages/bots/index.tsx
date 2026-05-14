import React, { useMemo, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { DBOT_TABS } from '@/constants/bot-contents';
import { load, save_types } from '@/external/bot-skeleton';
import { useStore } from '@/hooks/useStore';
import { LabelPairedPuzzlePieceTwoCaptionBoldIcon } from '@deriv/quill-icons/LabelPaired';
import { localize } from '@deriv-com/translations';
import './bots.scss';

type TBotCategory = 'Normal' | 'Automated' | 'Hybrid';

interface TBotItem {
    id: string;
    name: string;
    description: string;
    category: TBotCategory;
    xmlFile: string;
}

const BOT_CATALOG: TBotItem[] = [
    // Normal Bots (Green/Teal) - Basic strategies
    {
        id: 'martingale',
        name: 'Martingale',
        description: 'Double stake after each loss, reset on win',
        category: 'Normal',
        xmlFile: 'martingale.xml',
    },
    {
        id: 'martingale-max',
        name: 'Martingale (Max Stake)',
        description: 'Martingale with maximum stake protection',
        category: 'Normal',
        xmlFile: 'martingale_max-stake.xml',
    },
    {
        id: 'dalembert',
        name: "D'Alembert",
        description: 'Increase stake by 1 unit after loss, decrease after win',
        category: 'Normal',
        xmlFile: 'dalembert.xml',
    },
    {
        id: 'dalembert-max',
        name: "D'Alembert (Max Stake)",
        description: "D'Alembert with maximum stake limit",
        category: 'Normal',
        xmlFile: 'dalembert_max-stake.xml',
    },
    {
        id: 'reverse-martingale',
        name: 'Reverse Martingale',
        description: 'Double stake after each win, reset on loss',
        category: 'Normal',
        xmlFile: 'reverse_martingale.xml',
    },
    {
        id: 'reverse-dalembert',
        name: "Reverse D'Alembert",
        description: 'Increase stake after win, decrease after loss',
        category: 'Normal',
        xmlFile: 'reverse_dalembert.xml',
    },

    // Automated Bots (Blue/Purple) - Accumulator strategies
    {
        id: 'acc-martingale',
        name: 'Accumulators Martingale',
        description: 'Martingale strategy optimized for accumulator contracts',
        category: 'Automated',
        xmlFile: 'accumulators_martingale.xml',
    },
    {
        id: 'acc-martingale-reset',
        name: 'Accumulators Martingale (Auto Reset)',
        description: 'Martingale with automatic stat reset recovery',
        category: 'Automated',
        xmlFile: 'accumulators_martingale_on_stat_reset.xml',
    },
    {
        id: 'acc-dalembert',
        name: "Accumulators D'Alembert",
        description: "D'Alembert strategy for accumulator contracts",
        category: 'Automated',
        xmlFile: 'accumulators_dalembert.xml',
    },
    {
        id: 'acc-dalembert-reset',
        name: "Accumulators D'Alembert (Auto Reset)",
        description: "D'Alembert with automatic recovery on stat reset",
        category: 'Automated',
        xmlFile: 'accumulators_dalembert_on_stat_reset.xml',
    },
    {
        id: 'acc-reverse-martingale',
        name: 'Accumulators Reverse Martingale',
        description: 'Reverse martingale for accumulator contracts',
        category: 'Automated',
        xmlFile: 'accumulators_reverse_martingale.xml',
    },
    {
        id: 'acc-reverse-dalembert',
        name: "Accumulators Reverse D'Alembert",
        description: "Reverse D'Alembert for accumulator contracts",
        category: 'Automated',
        xmlFile: 'accumulators_reverse_dalembert.xml',
    },

    // Hybrid Bots (Orange/Yellow) - Mixed strategies
    {
        id: '1326',
        name: '1-3-2-6 System',
        description: 'Progressive betting: 1, 3, 2, 6 units sequence',
        category: 'Hybrid',
        xmlFile: '1_3_2_6.xml',
    },
    {
        id: 'oscars-grind',
        name: "Oscar's Grind",
        description: 'Conservative progression aiming for 1 unit profit per cycle',
        category: 'Hybrid',
        xmlFile: 'oscars_grind.xml',
    },
    {
        id: 'oscars-grind-max',
        name: "Oscar's Grind (Max Stake)",
        description: "Oscar's Grind with maximum stake protection",
        category: 'Hybrid',
        xmlFile: 'oscars_grind_max-stake.xml',
    },
];

const CATEGORY_COLORS: Record<TBotCategory, string> = {
    Normal: '#00d2d3',
    Automated: '#a55eea',
    Hybrid: '#ff9f43',
};

const Bots = observer(() => {
    const { dashboard } = useStore();
    const { setActiveTab } = dashboard;
    const [active_category, setActiveCategory] = useState<TBotCategory | 'All'>('All');
    const [loading_bot, setLoadingBot] = useState<string | null>(null);
    const [search_query, setSearchQuery] = useState('');

    const filtered_bots = useMemo(() => {
        return BOT_CATALOG.filter(bot => {
            const matches_category = active_category === 'All' || bot.category === active_category;
            const matches_search =
                search_query === '' ||
                bot.name.toLowerCase().includes(search_query.toLowerCase()) ||
                bot.description.toLowerCase().includes(search_query.toLowerCase());
            return matches_category && matches_search;
        });
    }, [active_category, search_query]);

    const loadBot = async (bot: TBotItem) => {
        setLoadingBot(bot.id);
        try {
            // Fetch the XML file
            const response = await fetch(`/xml/${bot.xmlFile}`);
            if (!response.ok) {
                throw new Error(`Failed to load ${bot.xmlFile}`);
            }
            const xml_content = await response.text();

            // Load into the workspace
            await load({
                block_string: xml_content,
                file_name: bot.name,
                workspace: (window.Blockly as any)?.derivWorkspace,
                from: save_types.LOCAL,
                drop_event: null,
                strategy_id: null,
                showIncompatibleStrategyDialog: null,
            });

            // Navigate to Bot Builder tab
            setActiveTab(DBOT_TABS.BOT_BUILDER);
        } catch (error) {
            console.error('Error loading bot:', error);
        } finally {
            setLoadingBot(null);
        }
    };

    const categories: (TBotCategory | 'All')[] = ['All', 'Normal', 'Automated', 'Hybrid'];

    return (
        <div className='bots-page'>
            <div className='bots-page__header'>
                <div className='header-title'>
                    <LabelPairedPuzzlePieceTwoCaptionBoldIcon height='32px' width='32px' fill='var(--text-general)' />
                    <h1>{localize('Bot Strategies')}</h1>
                </div>
                <p className='header-subtitle'>
                    {localize('Choose a pre-built strategy and load it into the Bot Builder')}
                </p>
            </div>

            <div className='bots-page__controls'>
                <div className='category-tabs'>
                    {categories.map(cat => (
                        <button
                            key={cat}
                            className={`category-tab ${active_category === cat ? 'active' : ''}`}
                            style={
                                cat !== 'All' && active_category === cat
                                    ? { borderColor: CATEGORY_COLORS[cat as TBotCategory] }
                                    : {}
                            }
                            onClick={() => setActiveCategory(cat)}
                        >
                            {cat === 'All' ? 'All Bots' : cat}
                            {cat !== 'All' && (
                                <span
                                    className='category-dot'
                                    style={{ backgroundColor: CATEGORY_COLORS[cat as TBotCategory] }}
                                />
                            )}
                        </button>
                    ))}
                </div>
                <div className='search-box'>
                    <input
                        type='text'
                        placeholder={localize('Search bots...')}
                        value={search_query}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            <div className='bots-page__grid'>
                {filtered_bots.map(bot => (
                    <div
                        key={bot.id}
                        className={`bot-card category-${bot.category.toLowerCase()}`}
                        style={{ '--category-color': CATEGORY_COLORS[bot.category] } as React.CSSProperties}
                    >
                        <div className='bot-card__header'>
                            <span className='category-badge' style={{ backgroundColor: CATEGORY_COLORS[bot.category] }}>
                                {bot.category}
                            </span>
                        </div>
                        <div className='bot-card__content'>
                            <h3 className='bot-name'>{bot.name}</h3>
                            <p className='bot-description'>{bot.description}</p>
                        </div>
                        <div className='bot-card__footer'>
                            <button className='btn-load' onClick={() => loadBot(bot)} disabled={loading_bot !== null}>
                                {loading_bot === bot.id ? <span className='loading-spinner' /> : localize('Load Bot')}
                            </button>
                        </div>
                    </div>
                ))}

                {filtered_bots.length === 0 && (
                    <div className='empty-state'>
                        <p>{localize('No bots found matching your criteria')}</p>
                    </div>
                )}
            </div>
        </div>
    );
});

export default Bots;
