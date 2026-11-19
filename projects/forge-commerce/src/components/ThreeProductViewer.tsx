'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';
import { Volume2, VolumeX } from 'lucide-react';
import { resolveWpAsset } from '@forgewp/react';

export type ProductColorways = Record<string, string>;

export interface ProductVideoVariant {
  /** Unique id for this variant, independent of any colorway key. */
  key: string;
  /** Short label shown on its selector button. */
  label: string;
  /** Path to the (6s, looping) video clip. */
  src: string;
}

interface ThreeProductViewerProps {
  /** All selectable colorways for this product. */
  colorways: ProductColorways;
  /** Key into `colorways` for the currently selected variant. */
  activeColor: string;
  /** Optional "in motion" clips, independent of colorway. */
  videoVariants?: ProductVideoVariant[];
  /** Key into `videoVariants` to preview, or null to show the still colorway image. */
  activeVideo?: string | null;
}

export default function ThreeProductViewer({
  colorways,
  activeColor,
  videoVariants = [],
  activeVideo = null,
}: ThreeProductViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const materialRef = useRef<THREE.ShaderMaterial | null>(null);
  const meshRef = useRef<THREE.Mesh | null>(null);

  // Still colorway textures, keyed by colorway key
  const texturesRef = useRef<Record<string, THREE.Texture>>({});
  const colorwaysRef = useRef(colorways);
  const activeColorRef = useRef(activeColor);

  // Video textures/elements, created lazily on first preview
  const videoVariantsRef = useRef(videoVariants);
  const videoElsRef = useRef<Record<string, HTMLVideoElement>>({});
  const videoTexturesRef = useRef<Record<string, THREE.VideoTexture>>({});
  const activeVideoKeyRef = useRef<string | null>(null);

  // Aspect ratio per texture key (colorway key or video key), for the shader's crop
  const aspectsRef = useRef<Record<string, number>>({});
  const currentKeyRef = useRef<string>(activeColor);
  const currentTextureRef = useRef<THREE.Texture | null>(null);
  const transitionToRef = useRef<((key: string, tex: THREE.Texture) => void) | null>(null);

  const [muted, setMuted] = useState(true);
  const mutedRef = useRef(muted);

  useEffect(() => {
    colorwaysRef.current = colorways;
  }, [colorways]);

  useEffect(() => {
    videoVariantsRef.current = videoVariants;
  }, [videoVariants]);

  useEffect(() => {
    if (!containerRef.current || !canvasRef.current) return;

    const container = containerRef.current;
    const canvas = canvasRef.current;

    // 1. Scene setup
    const scene = new THREE.Scene();

    // 2. Camera setup
    const width = container.clientWidth;
    const height = container.clientHeight;
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.z = 2.4;

    // 3. Renderer setup
    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);

    // 4. Load colorway textures, measuring each one's real aspect ratio so the
    // crop shader works whether the source is a square product photo or a
    // portrait/landscape video (set later).
    const textureLoader = new THREE.TextureLoader();
    const textures: Record<string, THREE.Texture> = {};

    Object.entries(colorwaysRef.current).forEach(([key, path]) => {
      const tex = textureLoader.load(resolveWpAsset(path), (loadedTex) => {
        loadedTex.generateMipmaps = true;
        loadedTex.minFilter = THREE.LinearMipmapLinearFilter;
        loadedTex.magFilter = THREE.LinearFilter;
        loadedTex.colorSpace = THREE.SRGBColorSpace;

        const img = loadedTex.image as { width: number; height: number };
        if (img?.width && img?.height) {
          aspectsRef.current[key] = img.width / img.height;
        }

        if (key === activeColorRef.current && materialRef.current) {
          materialRef.current.uniforms.texture1.value = loadedTex;
          materialRef.current.uniforms.texture2.value = loadedTex;
          materialRef.current.uniforms.aspect1.value = aspectsRef.current[key] ?? 1;
          materialRef.current.uniforms.aspect2.value = aspectsRef.current[key] ?? 1;
          currentTextureRef.current = loadedTex;
          currentKeyRef.current = key;
        }
      });
      textures[key] = tex;
    });
    texturesRef.current = textures;

    // 5. Shader Material: liquid crossfade with independent per-texture square crop,
    // so a square product photo and a portrait/landscape video can cross-fade cleanly.
    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      depthTest: false,
      uniforms: {
        texture1: { value: null },
        texture2: { value: null },
        progress: { value: 0 },
        aspect1: { value: 1 },
        aspect2: { value: 1 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D texture1;
        uniform sampler2D texture2;
        uniform float progress;
        uniform float aspect1;
        uniform float aspect2;
        varying vec2 vUv;

        // "Cover"-style centered square crop, for both landscape and portrait sources.
        vec2 squareCrop(vec2 uv, float aspect) {
          if (aspect >= 1.0) {
            float cropFactor = 1.0 / aspect;
            float offset = (1.0 - cropFactor) * 0.5;
            return vec2(uv.x * cropFactor + offset, uv.y);
          } else {
            float cropFactor = aspect;
            float offset = (1.0 - cropFactor) * 0.5;
            return vec2(uv.x, uv.y * cropFactor + offset);
          }
        }

        void main() {
          vec2 uv1 = squareCrop(vUv, aspect1);
          vec2 uv2 = squareCrop(vUv, aspect2);

          // Liquid wave distortion offset based on progress
          float strength = 0.08 * sin(progress * 3.14159265);
          float distort = sin(vUv.y * 14.0 + progress * 5.0) * strength;

          uv1 += vec2(distort, distort * 0.5);
          uv2 -= vec2(distort, distort * 0.5);

          vec4 col1 = texture2D(texture1, clamp(uv1, 0.0, 1.0));
          vec4 col2 = texture2D(texture2, clamp(uv2, 0.0, 1.0));

          gl_FragColor = mix(col1, col2, progress);
        }
      `,
    });
    materialRef.current = material;

    // 6. Mesh setup (square plane; the shader crops any source down to this aspect)
    const geometry = new THREE.PlaneGeometry(2.0, 2.0);
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);
    meshRef.current = mesh;

    // 7. Render Loop
    let animationFrameId: number;
    const animate = () => {
      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(animate);
    };
    animate();

    // 8. Hover Zoom Interaction
    const handleMouseEnter = () => {
      if (meshRef.current) {
        gsap.to(meshRef.current.scale, {
          x: 1.15,
          y: 1.15,
          duration: 0.8,
          ease: 'power2.out',
          overwrite: 'auto',
        });
      }
    };

    const handleMouseLeave = () => {
      if (meshRef.current) {
        gsap.to(meshRef.current.scale, {
          x: 1.0,
          y: 1.0,
          duration: 0.8,
          ease: 'power2.out',
          overwrite: 'auto',
        });
      }
    };

    container.addEventListener('mouseenter', handleMouseEnter);
    container.addEventListener('mouseleave', handleMouseLeave);

    // 9. Resize handler
    const handleResize = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;

      camera.aspect = w / h;
      camera.updateProjectionMatrix();

      renderer.setSize(w, h);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    };
    window.addEventListener('resize', handleResize);

    // 10. Shared crossfade transition, reused for both colorway swaps and video previews
    transitionToRef.current = (key, tex) => {
      const mat = materialRef.current;
      if (!mat) return;

      mat.uniforms.texture1.value = currentTextureRef.current ?? tex;
      mat.uniforms.aspect1.value = aspectsRef.current[currentKeyRef.current] ?? 1;
      mat.uniforms.texture2.value = tex;
      mat.uniforms.aspect2.value = aspectsRef.current[key] ?? 1;
      mat.uniforms.progress.value = 0;

      gsap.to(mat.uniforms.progress, {
        value: 1,
        duration: 1.1,
        ease: 'power3.inOut',
        overwrite: 'auto',
        onComplete: () => {
          currentTextureRef.current = tex;
          currentKeyRef.current = key;
          mat.uniforms.texture1.value = tex;
          mat.uniforms.aspect1.value = aspectsRef.current[key] ?? 1;
          mat.uniforms.progress.value = 0;
        },
      });
    };

    // Clean up
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);

      container.removeEventListener('mouseenter', handleMouseEnter);
      container.removeEventListener('mouseleave', handleMouseLeave);

      transitionToRef.current = null;

      geometry.dispose();
      material.dispose();
      Object.values(textures).forEach((tex) => tex.dispose());

      Object.values(videoTexturesRef.current).forEach((tex) => tex.dispose());
      Object.values(videoElsRef.current).forEach((video) => {
        video.pause();
        video.removeAttribute('src');
        video.load();
      });
      videoTexturesRef.current = {};
      videoElsRef.current = {};

      renderer.dispose();
    };
    // Textures/geometry are (re)built once per mount. To display a different
    // product, mount a new instance (e.g. `key={product.id}`) rather than
    // relying on this effect to react to `colorways` changing in place.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle activeColor prop changes: crossfade to the new still, unless a
  // video preview currently owns the display (it'll pick up the new base
  // color once the preview ends).
  useEffect(() => {
    activeColorRef.current = activeColor;
    if (activeVideoKeyRef.current) return;

    const tex = texturesRef.current[activeColor];
    if (tex) transitionToRef.current?.(activeColor, tex);
  }, [activeColor]);

  // Handle activeVideo prop changes: lazily create + play the video texture,
  // crossfade into it, and pause/rewind whatever was playing before.
  useEffect(() => {
    const prevVideoKey = activeVideoKeyRef.current;
    activeVideoKeyRef.current = activeVideo;

    if (prevVideoKey && prevVideoKey !== activeVideo) {
      const prevVideo = videoElsRef.current[prevVideoKey];
      if (prevVideo) {
        prevVideo.pause();
        prevVideo.currentTime = 0;
      }
    }

    if (!activeVideo) {
      const tex = texturesRef.current[activeColorRef.current];
      if (tex) transitionToRef.current?.(activeColorRef.current, tex);
      return;
    }

    const variant = videoVariantsRef.current.find((v) => v.key === activeVideo);
    if (!variant) return;

    let video = videoElsRef.current[activeVideo];
    let tex = videoTexturesRef.current[activeVideo];

    if (!video) {
      video = document.createElement('video');
      video.src = resolveWpAsset(variant.src);
      video.loop = true;
      video.muted = mutedRef.current;
      video.playsInline = true;
      video.preload = 'auto';
      video.addEventListener('loadedmetadata', () => {
        aspectsRef.current[variant.key] = video!.videoWidth / video!.videoHeight;
      });
      videoElsRef.current[activeVideo] = video;

      tex = new THREE.VideoTexture(video);
      tex.colorSpace = THREE.SRGBColorSpace;
      videoTexturesRef.current[activeVideo] = tex;
    }

    const startPlayback = () => {
      if (activeVideoKeyRef.current !== activeVideo) return; // superseded while loading
      video.currentTime = 0;
      video.play().catch(() => {});
      transitionToRef.current?.(activeVideo!, tex!);
    };

    if (video.readyState >= 1) {
      startPlayback();
    } else {
      video.addEventListener('loadedmetadata', startPlayback, { once: true });
    }
  }, [activeVideo]);

  // Keep the active clip's mute state in sync with the toggle
  useEffect(() => {
    mutedRef.current = muted;
    if (activeVideo) {
      const video = videoElsRef.current[activeVideo];
      if (video) video.muted = muted;
    }
  }, [muted, activeVideo]);

  return (
    <div ref={containerRef} className='w-full h-full relative aspect-square max-w-125 mx-auto select-none'>
      <canvas ref={canvasRef} className='w-full h-full absolute inset-0 block touch-none pointer-events-auto' />
      {activeVideo && (
        <button
          onClick={() => setMuted((m) => !m)}
          className='absolute bottom-3 right-3 z-10 w-9 h-9 rounded-full bg-slate-900/70 hover:bg-slate-900/90 text-white flex items-center justify-center backdrop-blur-sm transition-colors cursor-pointer'
          aria-label={muted ? 'Unmute preview' : 'Mute preview'}
        >
          {muted ? <VolumeX className='w-4 h-4' /> : <Volume2 className='w-4 h-4' />}
        </button>
      )}
    </div>
  );
}
