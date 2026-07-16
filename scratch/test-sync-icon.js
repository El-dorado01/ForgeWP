import { createRequire } from 'module';
import path from 'path';

try {
  const themeRoot = 'c:\\Users\\hp\\Desktop\\ForgeWP\\hotelchecker24';
  const projectRequire = createRequire(path.join(themeRoot, 'package.json'));
  
  console.time('Require & Render Icon');
  const React = projectRequire('react');
  const { renderToStaticMarkup } = projectRequire('react-dom/server');
  const pkg = projectRequire('lucide-react');
  const Icon = pkg['Search'];
  
  const html = renderToStaticMarkup(React.createElement(Icon, { className: 'w-4 h-4' }));
  console.timeEnd('Require & Render Icon');
  console.log('Result HTML:', html);
} catch (e) {
  console.error('Failed sync render:', e);
}
