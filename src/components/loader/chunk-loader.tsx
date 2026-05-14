import { motion } from 'framer-motion';
import './chunk-loader.scss';

export default function ChunkLoader({ message }: { message: string }) {
    return (
        <div className='chunk-loader-overlay'>
            <div className='loader-content'>
                <div className='spinner-wrapper'>
                    <motion.div
                        className='spinner-ring'
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    />
                    <div className='spinner-core' />
                </div>
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className='load-message'>
                    {message}
                </motion.div>
            </div>
        </div>
    );
}
