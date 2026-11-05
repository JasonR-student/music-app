import { defineConfig, mergeConfig } from 'vite';
import baseConfig from './vite.config.js';

// Qoder Sites 静态托管：产物落到 deploy/web，公共资源取 deploy/public
// （deploy/public 只放上线需要的资源，避免把 public/media 里的原始大视频打进部署包）
export default mergeConfig(
  baseConfig,
  defineConfig({
    publicDir: 'deploy/public',
    build: {
      outDir: 'deploy/web',
      emptyOutDir: true
    }
  })
);
