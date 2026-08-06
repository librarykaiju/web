# Missing Blog Images

These are the remaining local image files that fail `npm run validate:site-images` after the site-wide path fixes.

Notes:
- Expected output path: `/blog/images/...`
- I also searched the Obsidian vault for these filenames and found no matches.
- Until these files exist in source and are copied into the build, the live static site will still have broken images for these posts.

## 2026-02-24-dumb-futurists-make-dumb-futures

- `91IHbrVsM4L._SL1500_.jpg`

## Fear

- `IMG_1764-1.jpg`
- `Drac-scaled-1.jpg`

## Grit and Determination

- `Up-in-the-Sky-5-1024x880.png`
- `Up-in-the-sky-1.png`
- `up-in-the-sky-2.png`
- `Superman-Up-in-the-Sky-1.jpg`

## Making Stuff

- `img_0627-768x1024.jpg`
- `img_0628-768x1024.jpg`
- `img_0615-768x1024.jpg`
- `img_0617-768x1024.jpg`
- `img_0618-768x1024.jpg`
- `img_0619-768x1024.jpg`
- `img_0586-768x1024.jpg`
- `img_0588-768x1024.jpg`
- `image-768x1024.jpg`
- `img_0616-768x1024.jpg`
- `img_0623-768x1024.jpg`
- `img_0620-1-768x1024.jpg`
- `img_0621-768x1024.jpg`
- `img_0626-1024x768.jpg`

## Next Check

After restoring any of these files to the source side, rerun:

```bash
npx @11ty/eleventy
npm run validate:site-images
```