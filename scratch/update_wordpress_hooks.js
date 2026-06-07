import fs from 'node:fs';
import path from 'node:path';

const files = [
  'comfortable-decor/src/.forgewp/wordpress.tsx',
  'hotelchecker24/src/.forgewp/wordpress.tsx',
  'packages/create-forgewp/template/src/.forgewp/wordpress.tsx',
  'packages/create-forgewp/template-html/src/.forgewp/wordpress.tsx',
  'packages/html-starter/src/.forgewp/wordpress.tsx',
  'packages/starter/src/.forgewp/wordpress.tsx'
];

for (const relPath of files) {
  const filePath = path.resolve(process.cwd(), relPath);
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${relPath}`);
    continue;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  if (content.includes('export function useWpField(')) {
    console.log(`File already has useWpField: ${relPath}`);
    continue;
  }

  // 1. Add import alias
  const targetImport = 'useWpCustomField as _useWpCustomField,';
  const replacementImport = 'useWpCustomField as _useWpCustomField,\n  useWpField as _useWpField,';
  content = content.replace(targetImport, replacementImport);

  // 2. Add implementation
  const targetImpl = `  return '__FORGEWP_CUSTOM_FIELD__' + fieldName + '__';\n}`;
  const replacementImpl = `  return '__FORGEWP_CUSTOM_FIELD__' + fieldName + '__';\n}

export function useWpField(fieldName: string, defaultValue = ''): any {
  if (IS_DEV) return _useWpField(fieldName, defaultValue);

  if (typeof window !== 'undefined') {
    const win = window as any;
    if (!win._forgeWpCompileTime) {
      const post = React.useContext(WpPostContext);
      const currentPost = post || win.forgeWpHydration?.post;
      if (currentPost?.customFields && typeof currentPost.customFields[fieldName] !== 'undefined') {
        return currentPost.customFields[fieldName];
      }
    }
  }

  return '__FORGEWP_CUSTOM_FIELD__' + fieldName + '__';
}`;
  content = content.replace(targetImpl, replacementImpl);

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Successfully updated ${relPath}`);
}
