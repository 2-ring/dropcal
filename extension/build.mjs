import * as esbuild from 'esbuild';

const isWatch = process.argv.includes('--watch');

const commonOptions = {
  bundle: true,
  target: 'chrome120',
  format: 'esm',
  sourcemap: true,
  minify: !isWatch,
};

async function run() {
  const bgCtx = await esbuild.context({
    ...commonOptions,
    entryPoints: ['background.ts'],
    outfile: 'dist/background.js',
  });

  const popupCtx = await esbuild.context({
    ...commonOptions,
    entryPoints: ['popup/popup.ts'],
    outfile: 'dist/popup/popup.js',
  });

  if (isWatch) {
    await Promise.all([bgCtx.watch(), popupCtx.watch()]);
    console.log('Watching for changes...');
  } else {
    await Promise.all([bgCtx.rebuild(), popupCtx.rebuild()]);
    await Promise.all([bgCtx.dispose(), popupCtx.dispose()]);
    console.log('Build complete.');
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
