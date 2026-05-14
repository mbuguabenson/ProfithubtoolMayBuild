import path from 'path';
import { defineConfig } from '@rsbuild/core';
import { pluginBasicSsl } from '@rsbuild/plugin-basic-ssl';
import { pluginReact } from '@rsbuild/plugin-react';
import { pluginSass } from '@rsbuild/plugin-sass';

export default defineConfig({
    plugins: [
        pluginSass({
            sassLoaderOptions: {
                sourceMap: true,
                sassOptions: {
                    // includePaths: [path.resolve(__dirname, 'src')],
                },
                // additionalData: `@use "${path.resolve(__dirname, 'src/components/shared/styles')}" as *;`,
            },
            exclude: /node_modules/,
        }),
        pluginReact(),
        pluginBasicSsl(),
    ],
    source: {
        entry: {
            index: './src/main.tsx',
        },
        define: {
            'process.env': {
                TRANSLATIONS_CDN_URL: JSON.stringify(process.env.TRANSLATIONS_CDN_URL || ''),
                R2_PROJECT_NAME: JSON.stringify(process.env.R2_PROJECT_NAME || ''),
                CROWDIN_BRANCH_NAME: JSON.stringify(process.env.CROWDIN_BRANCH_NAME || ''),
                TRACKJS_TOKEN: JSON.stringify(process.env.TRACKJS_TOKEN || ''),
                APP_ENV: JSON.stringify(process.env.APP_ENV || 'development'),
                REF_NAME: JSON.stringify(process.env.REF_NAME || ''),
                REMOTE_CONFIG_URL: JSON.stringify(process.env.REMOTE_CONFIG_URL || ''),
                GD_CLIENT_ID: JSON.stringify(process.env.GD_CLIENT_ID || ''),
                GD_APP_ID: JSON.stringify(process.env.GD_APP_ID || ''),
                GD_API_KEY: JSON.stringify(process.env.GD_API_KEY || ''),
                DATADOG_SESSION_REPLAY_SAMPLE_RATE: JSON.stringify(
                    process.env.DATADOG_SESSION_REPLAY_SAMPLE_RATE || ''
                ),
                DATADOG_SESSION_SAMPLE_RATE: JSON.stringify(process.env.DATADOG_SESSION_SAMPLE_RATE || ''),
                DATADOG_APPLICATION_ID: JSON.stringify(process.env.DATADOG_APPLICATION_ID || ''),
                DATADOG_CLIENT_TOKEN: JSON.stringify(process.env.DATADOG_CLIENT_TOKEN || ''),
                RUDDERSTACK_KEY: JSON.stringify(process.env.RUDDERSTACK_KEY || ''),
                GROWTHBOOK_CLIENT_KEY: JSON.stringify(process.env.GROWTHBOOK_CLIENT_KEY || ''),
                GROWTHBOOK_DECRYPTION_KEY: JSON.stringify(process.env.GROWTHBOOK_DECRYPTION_KEY || ''),
                VITE_APP_ID: JSON.stringify(process.env.VITE_APP_ID || ''),
            },
        },
    },
    resolve: {
        alias: {
            react: path.resolve('./node_modules/react'),
            'react-dom': path.resolve('./node_modules/react-dom'),
            '@/external': path.resolve(__dirname, './src/external'),
            '@/components': path.resolve(__dirname, './src/components'),
            '@/hooks': path.resolve(__dirname, './src/hooks'),
            '@/utils': path.resolve(__dirname, './src/utils'),
            '@/constants': path.resolve(__dirname, './src/constants'),
            '@/stores': path.resolve(__dirname, './src/stores'),
            // DTrader Aliases
            App: path.resolve(__dirname, './src/pages/dtrader/App'),
            Modules: path.resolve(__dirname, './src/pages/dtrader/Modules'),
            Sass: path.resolve(__dirname, './src/pages/dtrader/sass'),
            Stores: path.resolve(__dirname, './src/pages/dtrader/Stores'),
            Types: path.resolve(__dirname, './src/pages/dtrader/Types'),
            _common: path.resolve(__dirname, './src/pages/dtrader/_common'),
            Analytics: path.resolve(__dirname, './src/pages/dtrader/Analytics'),
            Assets: path.resolve(__dirname, './src/pages/dtrader/Assets'),
            Documents: path.resolve(__dirname, './src/pages/dtrader/Documents'),
            '@deriv/stores': path.resolve(__dirname, './src/stores'),
            '@deriv/shared': path.resolve(__dirname, './src/components/shared/index.ts'),
            '@deriv/components': path.resolve(__dirname, './src/components/shared/index.ts'),
        },
    },
    output: {
        copy: [
            {
                from: 'node_modules/@deriv/deriv-charts/dist/*',
                to: 'js/smartcharts/[name][ext]',
                globOptions: {
                    ignore: ['**/*.LICENSE.txt'],
                },
            },
            { from: 'node_modules/@deriv/deriv-charts/dist/chart/assets/*', to: 'assets/[name][ext]' },
            { from: 'node_modules/@deriv/deriv-charts/dist/chart/assets/fonts/*', to: 'assets/fonts/[name][ext]' },
            { from: 'node_modules/@deriv/deriv-charts/dist/chart/assets/shaders/*', to: 'assets/shaders/[name][ext]' },
            { from: path.join(__dirname, 'public') },
        ],
        // Ensure service worker is not cached by the browser
        filename: {
            js: ({ chunk }) => {
                // Don't add hash to service worker
                if (chunk?.name === 'sw') {
                    return '[name].js';
                }
                return '[name].[contenthash:8].js';
            },
        },
    },
    html: {
        template: './index.html',
    },
    server: {
        port: 8446,
        compress: true,
        headers: {
            'Cross-Origin-Opener-Policy': 'same-origin',
            'Cross-Origin-Embedder-Policy': 'anonymous-only',
            'Cross-Origin-Resource-Policy': 'cross-origin',
            'Access-Control-Allow-Origin': '*',
        },
        proxy: {
            '/oauth2': {
                target: 'https://oauth.deriv.com',
                changeOrigin: true,
            },
        },
    },
    dev: {
        hmr: true,
    },
    tools: {
        rspack: {
            plugins: [],
            resolve: {},
            module: {
                rules: [
                    {
                        test: /\.xml$/,
                        exclude: /node_modules/,
                        use: 'raw-loader',
                    },
                ],
            },
        },
    },
});
