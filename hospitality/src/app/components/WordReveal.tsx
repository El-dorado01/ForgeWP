import { motion } from 'framer-motion';

type WordRevealProps = {
  text: string;
  reduceMotion: boolean | null;
  className?: string;
  delay?: number;
};

export default function WordReveal({
  text,
  reduceMotion,
  className,
  delay = 0,
}: WordRevealProps) {
  const words = text.split(' ');

  return (
    <span
      className={className}
      aria-label={text}
    >
      {words.map((word, index) => (
        <motion.span
          key={`${word}-${index}`}
          className='inline-block'
          aria-hidden='true'
          initial={reduceMotion ? false : { opacity: 0, y: '0.65em' }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{
            delay: delay + index * 0.045,
            duration: 0.5,
            ease: 'easeOut',
          }}
        >
          {word}
          {index < words.length - 1 ? '\u00a0' : ''}
        </motion.span>
      ))}
    </span>
  );
}
