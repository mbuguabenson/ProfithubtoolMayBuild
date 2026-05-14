import { standalone_routes } from './routes';

export * from './routes';

export const routes = {
    ...standalone_routes,
    trader_positions: standalone_routes.positions,
};
