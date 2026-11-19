import { motion } from 'framer-motion';

const Watermark = () => {
  return (
    <div className='w-full select-none pt-3 pb-6 relative overflow-hidden'>
      {/* Auto-shimmer sweep across the watermark */}
      <span className='pointer-events-none absolute top-0 h-full w-[40%] bg-linear-to-r from-transparent via-white/50 to-transparent animate-[shimmer-sweep_3s_infinite_ease-in-out] z-10' />
      <h2 className='w-full flex justify-between text-[8.5vw] md:text-[11.6vw] font-sans font-normal lowercase leading-[1.1] text-[#e3ded8] select-none pointer-events-auto cursor-default'>
        <motion.span
          whileHover={{ y: -20, color: '#7C6A58' }}
          transition={{ type: 'spring', stiffness: 300, damping: 10 }}
          className='inline-block'
        >
          f
        </motion.span>
        <motion.span
          whileHover={{ y: -20, color: '#7C6A58' }}
          transition={{ type: 'spring', stiffness: 300, damping: 10 }}
          className='inline-block'
        >
          o
        </motion.span>
        <motion.span
          whileHover={{ y: -20, color: '#7C6A58' }}
          transition={{ type: 'spring', stiffness: 300, damping: 10 }}
          className='inline-block'
        >
          r
        </motion.span>
        <motion.span
          whileHover={{ y: -20, color: '#7C6A58' }}
          transition={{ type: 'spring', stiffness: 300, damping: 10 }}
          className='inline-block'
        >
          g
        </motion.span>
        <motion.span
          whileHover={{ y: -20, color: '#7C6A58' }}
          transition={{ type: 'spring', stiffness: 300, damping: 10 }}
          className='inline-block'
        >
          e
        </motion.span>
        <motion.span
          whileHover={{ y: -20 }}
          transition={{ type: 'spring', stiffness: 300, damping: 10 }}
          className='inline-block text-primary font-bold'
        >
          .
        </motion.span>
        <motion.span
          whileHover={{ y: -20, color: '#7C6A58' }}
          transition={{ type: 'spring', stiffness: 300, damping: 10 }}
          className='inline-block'
        >
          c
        </motion.span>
        <motion.span
          whileHover={{ y: -20, color: '#7C6A58' }}
          transition={{ type: 'spring', stiffness: 300, damping: 10 }}
          className='inline-block'
        >
          o
        </motion.span>
        <motion.span
          whileHover={{ y: -20, color: '#7C6A58' }}
          transition={{ type: 'spring', stiffness: 300, damping: 10 }}
          className='inline-block'
        >
          m
        </motion.span>
        <motion.span
          whileHover={{ y: -20, color: '#7C6A58' }}
          transition={{ type: 'spring', stiffness: 300, damping: 10 }}
          className='inline-block'
        >
          m
        </motion.span>
        <motion.span
          whileHover={{ y: -20, color: '#7C6A58' }}
          transition={{ type: 'spring', stiffness: 300, damping: 10 }}
          className='inline-block'
        >
          e
        </motion.span>
        <motion.span
          whileHover={{ y: -20, color: '#7C6A58' }}
          transition={{ type: 'spring', stiffness: 300, damping: 10 }}
          className='inline-block'
        >
          r
        </motion.span>
        <motion.span
          whileHover={{ y: -20, color: '#7C6A58' }}
          transition={{ type: 'spring', stiffness: 300, damping: 10 }}
          className='inline-block'
        >
          c
        </motion.span>
        <motion.span
          whileHover={{ y: -20, color: '#7C6A58' }}
          transition={{ type: 'spring', stiffness: 300, damping: 10 }}
          className='inline-block'
        >
          e
        </motion.span>
      </h2>
    </div>
  );
};

export default Watermark;
