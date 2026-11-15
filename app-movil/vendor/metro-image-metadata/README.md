# Metro image metadata adapter

Local, dependency-free replacement for Metro's transitive `image-size` reader.

It accepts only the image formats Metro recognizes: PNG, JPEG, BMP, GIF, WebP,
PSD, SVG, TIFF and KTX. It intentionally rejects ICNS, JXL, HEIF and HEIC, as
those formats are outside Metro's allowlist and were associated with unpatched
denial-of-service advisories in the upstream dependency.

The parser validates signatures, offsets, file size, dimensions and loop bounds.
Keep this package local and run `pnpm run test:image-metadata` after modifications.
