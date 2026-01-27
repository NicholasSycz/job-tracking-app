import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { copyFileSync, mkdirSync, readdirSync, existsSync } from 'fs';

// Plugin to copy static files after build
function copyManifestPlugin() {
  return {
    name: 'copy-manifest',
    closeBundle() {
      // Copy manifest.json
      copyFileSync(
        resolve(__dirname, 'manifest.json'),
        resolve(__dirname, 'dist/manifest.json')
      );

      // Copy icons
      const iconsDir = resolve(__dirname, 'public/icons');
      const distIconsDir = resolve(__dirname, 'dist/icons');

      if (!existsSync(distIconsDir)) {
        mkdirSync(distIconsDir, { recursive: true });
      }

      if (existsSync(iconsDir)) {
        const icons = readdirSync(iconsDir);
        for (const icon of icons) {
          copyFileSync(
            resolve(iconsDir, icon),
            resolve(distIconsDir, icon)
          );
        }
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), copyManifestPlugin()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    outDir: 'dist',
    emptyDirFirst: true,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'popup.html'),
        background: resolve(__dirname, 'src/background/index.ts'),
        content: resolve(__dirname, 'src/content/index.ts'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'background') {
            return 'src/background/index.js';
          }
          if (chunkInfo.name === 'content') {
            return 'src/content/index.js';
          }
          return 'assets/[name]-[hash].js';
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith('.css')) {
            // Put content script CSS in the right place
            return 'src/content/styles.css';
          }
          return 'assets/[name]-[hash][extname]';
        },
      },
    },
    sourcemap: process.env.NODE_ENV === 'development',
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
  },
});
