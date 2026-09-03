# Rendering performance — September 3, 2026

## Root cause

The supplied artwork is 9712 × 10360 (100,616,320 pixels). A single RGBA buffer
is about 384 MiB. The old renderer ran synchronously on the UI thread, even
through its async entry point. It allocated duplicate full-size pixel/canvas
buffers and a per-pixel JavaScript edge-normal array. A settings-dependent
image-loading effect also restarted decoding and rendering unnecessarily.
Mockup preparation blindly requested 2× source dimensions (402 MP).

## Changes

- Embroidery, local MobileSAM inference, settled mockup displacement, and image
  encoding run in a module worker. Obsolete requests terminate their worker;
  finished workers cache the source and object map until disposed.
- The editor shows a density-appropriate preview first, then refines the original
  native render in the background. Native results are reused during zoom/pan.
  Display downsampling uses high-quality filtering to reduce moire.
- Original uploaded files are preserved with Blob URLs and shared decoded images.
  Exports never use the editing preview.
- The distance transform is retained; Sobel normals are computed on demand with
  the original math. Shading reuses the source pixel buffer after neighbourhood
  analysis, and the shadow pass reuses its working canvas.
- Mockup source preparation follows the placed footprint, bounded to 4096 pixels
  on the longest edge for editing. The settled composite remains supersampled.
  Displacement buffers crop to the visible rotated footprint plus a filter halo.
- UI-only changes no longer rerun stitch synthesis. Rulers have readable spacing.
  Wheel listeners are non-passive where preventDefault is required.
- Export cancellation, errors and progress stages are visible. No redundant
  base64 export is generated. Unsafe outputs above 128 MP / 32767 pixels per
  side are rejected explicitly, never silently resized. Native 101 MP is allowed.

## Verification

- `npm test` and `npm run build`.
- Browser harness: `/test/render-performance.html` on the development server.
  This checks Classic/Natural reference hashes, worker fidelity, shadow/border/
  quantization handling, mockup composition, PNG/WebP/JPEG, cancellation and
  responsiveness. Canvas/ImageBitmap boundary resampling has small platform
  rounding differences; worker comparisons bound mean channel error below
  0.1/255. CPU shader fixture hashes match the pre-change baseline exactly.
- 16 MP native worker test: about 2 seconds; 10 ms UI timer continued, with an
  observed maximum gap of 11 ms. These are local measurements, not FPS guarantees.
- 101 MP synthetic preview: 2428 × 2590 in about 1.4 seconds, timer max gap 11 ms.
- 101 MP native PNG export: encoded dimensions verified at 9712 × 10360,
  about 20.5 seconds including encoding; the 10 ms timer continued with a
  maximum observed gap of 15 ms. The 200 MB test Blob was not downloaded.
- User's actual 101 MP crest: first preview about 984 ms; original native detail
  subsequently completed in the background (about 16 seconds in that run).
- Production browser smoke checks include local AI (32 objects), both styles,
  mockup handoff, rapid placement changes and WebP export.

Full-resolution work still takes time. The improvement is that rendering no
longer monopolizes the UI thread; no hardware can promise zero frame drops for
every input and memory condition. SVG object geometry retains a bounded DOM
parsing/planning pass; raster inference and pixel synthesis are worker-backed.

Pre-edit copies of the four already-modified renderer/view files are at:
`E:\Embroidery Studio Backups\before-performance-20260903-182237`.
