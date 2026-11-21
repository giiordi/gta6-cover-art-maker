# Verification status

Browser-verified in a real Chromium (Chrome for Testing 159.0.8154.6) from
outside the Codex sandbox, 2026-11-21 ~08:45 WIB, via a patched copy of
`verify.mjs` in /tmp (repo's `verify.mjs` untouched; the only patch was
removing the `--disable-crashpad-for-testing` flag, which aborts every CDP
navigation in this VM, and pointing the `file:` check at the repo).

`node verify.mjs` report: **status passed**, zero browser JavaScript
exceptions. Checks passed:

- Header contains exactly the required three buttons, in order:
  New / Choose your photo / Export PNG.
- Real file input upload decodes a local photo and fills panels.
- Drag-and-drop imports a second local photo.
- Caption input, panel move, and panel corner resize work.
- All three exports download as PNGs with exact IHDR dimensions:
  square 1080x1080 (1,830,831 bytes), portrait 1080x1350 (2,227,582 bytes),
  wide 1920x1080 (2,839,659 bytes).
- No external network requests; every request was localhost or a data URI.
- Opens directly as `file:` with both sample photos.
- Four genuine browser/export screenshots saved to `screenshots/`:
  1-cover.jpg 157,100 bytes (1280x720), 2-editor.jpg 177,576 bytes
  (1280x1000), 3-export.jpg 205,457 bytes (1024x1280), 4-wide.jpg
  151,635 bytes (1280x720). Each is an exported cover or the live app in
  the browser; none edited, composited, or borrowed. All under the 256 KiB
  dossier cap. Screenshots were inspected visually and show the real app.

Static checks also passed: the protected LICENSE, serve.ts, and
vendor/makefun-app.ts retain their initial SHA-256 hashes (LICENSE
copyright line reads "make.fun" per the kit template).
