// Simple Service Worker for caching core assets + images.
// Works on HTTPS (or localhost). Update CACHE_VERSION to bust caches.

const CACHE_VERSION = 'v8';
const CORE_CACHE = `lissikk-core-${CACHE_VERSION}`;
const IMG_CACHE = `lissikk-img-${CACHE_VERSION}`;
const TILE_CACHE = `lissikk-tile-${CACHE_VERSION}`;

const CORE_ASSETS = [
  './',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CORE_CACHE);
      await cache.addAll(CORE_ASSETS);
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k.startsWith('lissikk-') && !k.endsWith(CACHE_VERSION))
          .map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

function isImageRequest(request) {
  const url = new URL(request.url);
  return url.pathname.includes('/static/') && (url.pathname.endsWith('.jpg') || url.pathname.endsWith('.png'));
}

function isTileRequest(request) {
  const url = new URL(request.url);
  return url.pathname.endsWith('/__tile');
}

async function buildTileResponse(requestUrl) {
  const axis = requestUrl.searchParams.get('axis');
  const src = requestUrl.searchParams.get('src');
  const v = requestUrl.searchParams.get('v') || '1';
  const vw = Math.max(1, parseInt(requestUrl.searchParams.get('vw') || '0', 10) || 0);
  const vh = Math.max(1, parseInt(requestUrl.searchParams.get('vh') || '0', 10) || 0);
  const dprRaw = parseFloat(requestUrl.searchParams.get('dpr') || '1') || 1;
  const dpr = Math.max(1, Math.min(3, dprRaw));
  if (axis !== 'x' && axis !== 'y') return new Response('Bad axis', { status: 400 });
  if (!src) return new Response('Missing src', { status: 400 });

  // Resolve src to same-origin and restrict to /static/ for safety.
  const srcUrl = new URL(src, requestUrl.origin);
  if (srcUrl.origin !== requestUrl.origin) return new Response('Bad src origin', { status: 400 });
  if (!srcUrl.pathname.startsWith('/static/')) return new Response('Bad src path', { status: 400 });

  // If we can't generate (older browsers), degrade to the original image (no 404).
  if (typeof OffscreenCanvas === 'undefined' || typeof createImageBitmap === 'undefined') {
    return fetch(srcUrl.toString());
  }

  const srcResp = await fetch(srcUrl.toString());
  if (!srcResp.ok) return srcResp;

  const blob = await srcResp.blob();
  const bitmap = await createImageBitmap(blob);
  const w = bitmap.width;
  const h = bitmap.height;

  const MAX_DIM = 16384;

  // v8: build a viewport-sized strip with smooth "wave" falloff (blur+dark) starting from the edges
  // of the centered (dist=0) segment. No hard seams between segments.
  if (v === '8' && vw > 0 && vh > 0) {
    const pxW = Math.max(1, Math.round(vw * dpr));
    const pxH = Math.max(1, Math.round(vh * dpr));

    const segW = axis === 'x' ? Math.max(1, Math.round((w / h) * pxH)) : pxW;
    const segH = axis === 'y' ? Math.max(1, Math.round((h / w) * pxW)) : pxH;

    const neededSegments = axis === 'x' ? Math.ceil(pxW / segW) + 4 : Math.ceil(pxH / segH) + 4;
    const n = Math.ceil(neededSegments / 2);

    const outW = axis === 'x' ? (2 * n + 1) * segW : segW;
    const outH = axis === 'y' ? (2 * n + 1) * segH : segH;

    if (outW > MAX_DIM || outH > MAX_DIM) {
      // Fallback to v2 if too big.
      // (generated below)
    } else {
      const canvas = new OffscreenCanvas(outW, outH);
      const ctx = canvas.getContext('2d');
      if (!ctx) return new Response('No 2D context', { status: 500 });

      // Some browsers may not support ctx.filter in OffscreenCanvas; degrade gracefully.
      const supportsFilter = 'filter' in ctx;

      const clamp01 = (val) => Math.min(1, Math.max(0, val));
      const easeCos = (t) => 0.5 - 0.5 * Math.cos(Math.PI * clamp01(t));

      // Tunables (match client as close as possible).
      const blurMax = 100 * dpr;
      const darkMax = 0.4;
      const blurGamma = 0.1;
      const darkGamma = 0.5;
      const STOP_COUNT = 7;

      // Scratch buffers for the blurred pass (edge-clamped) so blur never "pulls in" transparency/black.
      let scratch = null;
      let scratchBlur = null;
      let scratchW = 0;
      let scratchH = 0;
      let sctx = null;
      let sbctx = null;

      const ensureScratch = (w2, h2) => {
        if (scratchW === w2 && scratchH === h2 && sctx && sbctx) return;
        scratchW = w2;
        scratchH = h2;
        scratch = new OffscreenCanvas(w2, h2);
        scratchBlur = new OffscreenCanvas(w2, h2);
        sctx = scratch.getContext('2d');
        sbctx = scratchBlur.getContext('2d');
      };

      const drawSegmentSharp = (opts) => {
        const { x, y, mirror } = opts;
        ctx.save();
        if (supportsFilter) ctx.filter = 'none';
        // Clip to segment so nothing bleeds into the constrained axis.
        ctx.beginPath();
        ctx.rect(x, y, segW, segH);
        ctx.clip();

        if (mirror) {
          if (axis === 'x') {
            ctx.translate(x + segW, y);
            ctx.scale(-1, 1);
            ctx.drawImage(bitmap, 0, 0, w, h, 0, 0, segW, segH);
          } else {
            ctx.translate(x, y + segH);
            ctx.scale(1, -1);
            ctx.drawImage(bitmap, 0, 0, w, h, 0, 0, segW, segH);
          }
        } else {
          ctx.drawImage(bitmap, 0, 0, w, h, x, y, segW, segH);
        }

        ctx.restore();
      };

      const drawBlurOverlay = (opts) => {
        const { x, y, mirror, innerTowardCenter, s0, s1 } = opts;
        if (!supportsFilter) return;

        const pad = Math.max(2, Math.ceil(blurMax * 2));
        ensureScratch(segW + pad * 2, segH + pad * 2);
        sctx.clearRect(0, 0, scratchW, scratchH);
        sbctx.clearRect(0, 0, scratchW, scratchH);

        // Draw into scratch at (pad,pad).
        sctx.save();
        if (mirror) {
          if (axis === 'x') {
            sctx.translate(pad + segW, pad);
            sctx.scale(-1, 1);
            sctx.drawImage(bitmap, 0, 0, w, h, 0, 0, segW, segH);
          } else {
            sctx.translate(pad, pad + segH);
            sctx.scale(1, -1);
            sctx.drawImage(bitmap, 0, 0, w, h, 0, 0, segW, segH);
          }
        } else {
          sctx.drawImage(bitmap, 0, 0, w, h, pad, pad, segW, segH);
        }
        sctx.restore();

        // Edge-clamp 1px edges outward.
        sctx.drawImage(scratch, pad, pad, 1, segH, 0, pad, pad, segH);
        sctx.drawImage(scratch, pad + segW - 1, pad, 1, segH, pad + segW, pad, pad, segH);
        sctx.drawImage(scratch, 0, pad, scratchW, 1, 0, 0, scratchW, pad);
        sctx.drawImage(scratch, 0, pad + segH - 1, scratchW, 1, 0, pad + segH, scratchW, pad);

        sbctx.filter = `blur(${blurMax.toFixed(2)}px)`;
        sbctx.drawImage(scratch, 0, 0);
        sbctx.filter = 'none';

        // Apply a smooth "wave" alpha mask (cosine-eased).
        sbctx.globalCompositeOperation = 'destination-in';
        const innerLocal = innerTowardCenter ? (axis === 'x' ? segW : segH) : 0;
        const outerLocal = innerTowardCenter ? 0 : (axis === 'x' ? segW : segH);
        const innerCoord = pad + innerLocal;
        const outerCoord = pad + outerLocal;

        const g = axis === 'x'
          ? sbctx.createLinearGradient(innerCoord, 0, outerCoord, 0)
          : sbctx.createLinearGradient(0, innerCoord, 0, outerCoord);

        for (let si = 0; si < STOP_COUNT; si++) {
          const t = si / (STOP_COUNT - 1);
          const s = s0 + (s1 - s0) * t;
          const u = easeCos(s);
          const a = clamp01(Math.pow(u, blurGamma));
          g.addColorStop(t, `rgba(0,0,0,${a.toFixed(4)})`);
        }

        sbctx.fillStyle = g;
        sbctx.fillRect(0, 0, scratchW, scratchH);
        sbctx.globalCompositeOperation = 'source-over';

        ctx.save();
        ctx.beginPath();
        ctx.rect(x, y, segW, segH);
        ctx.clip();
        ctx.drawImage(scratchBlur, pad, pad, segW, segH, x, y, segW, segH);
        ctx.restore();
      };

      const drawDarkOverlay = (opts) => {
        const { x, y, innerTowardCenter, s0, s1 } = opts;
        const inner = innerTowardCenter ? (axis === 'x' ? x + segW : y + segH) : (axis === 'x' ? x : y);
        const outer = innerTowardCenter ? (axis === 'x' ? x : y) : (axis === 'x' ? x + segW : y + segH);
        const g = axis === 'x'
          ? ctx.createLinearGradient(inner, 0, outer, 0)
          : ctx.createLinearGradient(0, inner, 0, outer);

        for (let si = 0; si < STOP_COUNT; si++) {
          const t = si / (STOP_COUNT - 1);
          const s = s0 + (s1 - s0) * t;
          const u = easeCos(s);
          const a = clamp01(darkMax * Math.pow(u, darkGamma));
          g.addColorStop(t, `rgba(0,0,0,${a.toFixed(4)})`);
        }

        ctx.save();
        ctx.beginPath();
        ctx.rect(x, y, segW, segH);
        ctx.clip();
        ctx.fillStyle = g;
        ctx.fillRect(x, y, segW, segH);
        ctx.restore();
      };

      const segments = 2 * n + 1;
      for (let i = 0; i < segments; i++) {
        const dist = Math.abs(i - n);
        const mirror = dist % 2 === 1;
        const x = axis === 'x' ? i * segW : 0;
        const y = axis === 'y' ? i * segH : 0;

        drawSegmentSharp({ x, y, mirror });
        if (dist === 0) continue;

        const denom = Math.max(1, n);
        const s0 = clamp01((dist - 1) / denom);
        const s1 = clamp01(dist / denom);
        const innerTowardCenter = i < n;

        drawBlurOverlay({ x, y, mirror, innerTowardCenter, s0, s1 });
        drawDarkOverlay({ x, y, innerTowardCenter, s0, s1 });
      }

      const outBlob = await canvas.convertToBlob({ type: 'image/png' });
      return new Response(outBlob, {
        status: 200,
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    }
  }

  // Base tile: [original][mirrored]
  const base = new OffscreenCanvas(axis === 'x' ? w * 2 : w, axis === 'y' ? h * 2 : h);
  const baseCtx = base.getContext('2d');
  if (!baseCtx) return new Response('No 2D context', { status: 500 });

  baseCtx.drawImage(bitmap, 0, 0, w, h);

  baseCtx.save();
  if (axis === 'x') {
    baseCtx.translate(w * 2, 0);
    baseCtx.scale(-1, 1);
    baseCtx.drawImage(bitmap, 0, 0, w, h);
  } else {
    baseCtx.translate(0, h * 2);
    baseCtx.scale(1, -1);
    baseCtx.drawImage(bitmap, 0, 0, w, h);
  }
  baseCtx.restore();

  // v2: shift the seam by half a segment so `background-position: center` puts the original in the center.
  // v1: keep the original behavior (backward compatibility).
  const canvas = new OffscreenCanvas(base.width, base.height);
  const ctx = canvas.getContext('2d');
  if (!ctx) return new Response('No 2D context', { status: 500 });

  if (v === '2') {
    if (axis === 'x') {
      const half = Math.floor(w / 2);
      ctx.drawImage(base, w * 2 - half, 0, half, h, 0, 0, half, h);
      ctx.drawImage(base, 0, 0, w * 2 - half, h, half, 0, w * 2 - half, h);
    } else {
      const half = Math.floor(h / 2);
      ctx.drawImage(base, 0, h * 2 - half, w, half, 0, 0, w, half);
      ctx.drawImage(base, 0, 0, w, h * 2 - half, 0, half, w, h * 2 - half);
    }
  } else {
    ctx.drawImage(base, 0, 0);
  }

  const outBlob = await canvas.convertToBlob({ type: 'image/png' });
  return new Response(outBlob, {
    status: 200,
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const resp = await fetch(request);
  if (resp && resp.ok) cache.put(request, resp.clone());
  return resp;
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const networkPromise = fetch(request)
    .then((resp) => {
      if (resp && resp.ok) cache.put(request, resp.clone());
      return resp;
    })
    .catch(() => null);
  return cached || (await networkPromise) || fetch(request);
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (isTileRequest(request)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(TILE_CACHE);
        const cached = await cache.match(request);
        if (cached) return cached;
        const resp = await buildTileResponse(url);
        if (resp && resp.ok) cache.put(request, resp.clone());
        return resp;
      })()
    );
    return;
  }

  if (isImageRequest(request)) {
    event.respondWith(cacheFirst(request, IMG_CACHE));
    return;
  }

  // HTML/CSS/JS: stale-while-revalidate to keep it snappy but update in background
  event.respondWith(staleWhileRevalidate(request, CORE_CACHE));
});


