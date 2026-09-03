import { WpHead } from '@forgewp/react';
import PhotoBoard from '../components/PhotoBoard';

export default function HomePage() {
  return (
    <div className='min-h-screen w-full bg-[#eaeaea] selection:bg-[#7b4f37] selection:text-white flex flex-col items-center justify-start py-8 px-4 md:py-12 md:px-8 relative overflow-x-hidden font-sans'>
      <WpHead
        title='Photo Memories — Drag & Arrange Collage'
        description='Arrange your favorite memories on a beautiful digital bulletin board. Drag, tilt, like, and share.'
        ogType='website'
      />

      <PhotoBoard />
    </div>
  );
}
