import {
  ChevronRight,
  Instagram,
  Twitter,
  Facebook,
} from 'lucide-react';
import { motion } from 'framer-motion';
import Watermark from './Watermark';

const Footer = () => {
  return (
    <footer className='w-full border-slate-200/50 bg-[#fafafa]'>
      <div className='max-w-7xl mx-auto px-6 md:px-12 py-16 w-full'>
        <div className='grid grid-cols-2 md:grid-cols-4 gap-8 mb-16'>
          {/* Column 1: Logo, Description & Socials */}
          <div className='main-footer-col flex flex-col items-start text-left col-span-2 md:col-span-1'>
            <span className='font-sans text-4xl font-normal tracking-wide text-slate-900 lowercase select-none'>
              forge<span className='text-primary font-bold'>.</span>
            </span>
            <p className='text-slate-500 text-sm leading-relaxed font-heading mt-4 max-w-65'>
              A headless e-commerce store built for high-performance React
              frameworks and WooCommerce.
            </p>
            <div className='flex items-center gap-4 mt-6'>
              <a
                href='#'
                className='text-slate-400 hover:text-primary transition-colors hover:scale-110 duration-200'
                aria-label='Instagram'
              >
                <Instagram className='w-4.5 h-4.5' />
              </a>
              <a
                href='#'
                className='text-slate-400 hover:text-primary transition-colors hover:scale-110 duration-200'
                aria-label='Twitter'
              >
                <Twitter className='w-4.5 h-4.5' />
              </a>
              <a
                href='#'
                className='text-slate-400 hover:text-primary transition-colors hover:scale-110 duration-200'
                aria-label='Facebook'
              >
                <Facebook className='w-[18px] h-[18px]' />
              </a>
            </div>
          </div>

          {/* Column 2: Shop Links */}
          <div className='main-footer-col flex flex-col gap-4 text-left'>
            <span className='font-heading text-xs tracking-widest font-bold uppercase text-slate-400'>
              shop
            </span>
            <div className='flex flex-col gap-3 items-start'>
              <a
                href='#'
                className='font-heading text-sm text-slate-500 hover:text-primary transition-colors'
              >
                Outerwear
              </a>
              <a
                href='#'
                className='font-heading text-sm text-slate-500 hover:text-primary transition-colors'
              >
                Knitwear
              </a>
              <a
                href='#'
                className='font-heading text-sm text-slate-500 hover:text-primary transition-colors'
              >
                Accessories
              </a>
              <a
                href='#'
                className='font-heading text-sm text-slate-500 hover:text-primary transition-colors'
              >
                New Arrivals
              </a>
            </div>
          </div>

          {/* Column 3: Info & Support Links */}
          <div className='main-footer-col flex flex-col gap-4 text-left'>
            <span className='font-heading text-xs tracking-widest font-bold uppercase text-slate-400'>
              info
            </span>
            <div className='flex flex-col gap-3 items-start'>
              <a
                href='#'
                className='font-heading text-sm text-slate-500 hover:text-primary transition-colors'
              >
                About Us
              </a>
              <a
                href='#'
                className='font-heading text-sm text-slate-500 hover:text-primary transition-colors'
              >
                Sustainability
              </a>
              <a
                href='#'
                className='font-heading text-sm text-slate-500 hover:text-primary transition-colors'
              >
                Journal
              </a>
              <a
                href='#'
                className='font-heading text-sm text-slate-500 hover:text-primary transition-colors'
              >
                Contact Support
              </a>
            </div>
          </div>

          {/* Column 4: Newsletter */}
          <div className='main-footer-col flex flex-col gap-4 text-left col-span-2 md:col-span-1'>
            <span className='font-heading text-xs tracking-widest font-bold uppercase text-slate-400'>
              newsletter
            </span>
            <p className='text-slate-500 text-sm leading-relaxed font-heading'>
              Subscribe to receive campaign collections, private lookbooks, and
              custom editorials.
            </p>
            <form className='flex items-center border-b border-slate-300 hover:border-primary/50 focus-within:border-primary transition-colors py-2 mt-2 w-full group/form'>
              <input
                type='email'
                placeholder='Your Email Address'
                className='appearance-none bg-transparent border-none w-full text-slate-800 mr-3 py-1 leading-tight focus:outline-none text-sm font-heading placeholder-slate-400'
                required
              />
              <motion.button
                type='submit'
                whileHover={{ scale: 1.2, x: 3, color: '#7C6A58' }}
                whileTap={{ scale: 0.9 }}
                className='text-slate-400 hover:text-primary transition-colors cursor-pointer flex items-center justify-center p-1 duration-200'
                aria-label='Subscribe'
              >
                <ChevronRight className='w-[18px] h-[18px] group-hover/form:translate-x-1.5 transition-transform duration-300' />
              </motion.button>
            </form>
          </div>
        </div>

        {/* Massive Watermark */}
        <Watermark />

        {/* Copyright & Policy Links */}
        <div className='footer-bottom flex flex-col md:flex-row items-center justify-between gap-4 border-t border-slate-200/30 pt-8 text-xs text-slate-400 font-heading uppercase tracking-widest w-full'>
          <span>© 2026 Forge Commerce. All rights reserved.</span>
          <div className='flex gap-6'>
            <a
              href='#'
              className='hover:text-primary transition-colors'
            >
              Privacy Policy
            </a>
            <a
              href='#'
              className='hover:text-primary transition-colors'
            >
              Terms of Service
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer


