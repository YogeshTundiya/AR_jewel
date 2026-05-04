#!/usr/bin/env node
/**
 * Compress GLB files using gltf-transform with Draco compression + mesh simplification.
 * Runs with increased memory to handle large files.
 */

import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { simplify, draco, dedup, weld, textureCompress } from '@gltf-transform/functions';
import { MeshoptSimplifier } from 'meshoptimizer';
import draco3d from 'draco3dgltf';
import { readdirSync, statSync } from 'fs';
import { join, basename } from 'path';

const INPUT_DIR = 'public/3D/backup';
const OUTPUT_DIR = 'public/3D';

async function compressFile(inputPath, outputPath) {
  const name = basename(inputPath);
  console.log(`\n🔧 Processing: ${name}`);
  const startSize = statSync(inputPath).size;
  console.log(`   Input size: ${(startSize / 1024 / 1024).toFixed(1)} MB`);

  const io = new NodeIO()
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({
      'draco3d.decoder': await draco3d.createDecoderModule(),
      'draco3d.encoder': await draco3d.createEncoderModule(),
    });

  console.log(`   Reading file...`);
  const document = await io.read(inputPath);

  // Step 1: Remove duplicate accessors & materials
  console.log(`   Deduplicating...`);
  await document.transform(dedup());

  // Step 2: Weld vertices (merge nearby vertices)
  console.log(`   Welding vertices...`);
  await document.transform(weld({ tolerance: 0.001 }));

  // Step 3: Simplify mesh (reduce to 10% of original triangles)
  console.log(`   Simplifying mesh (target: 10%)...`);
  await MeshoptSimplifier.ready;
  await document.transform(
    simplify({ simplifier: MeshoptSimplifier, ratio: 0.1, error: 0.01 })
  );

  // Step 4: Draco compression
  console.log(`   Applying Draco compression...`);
  await document.transform(draco());

  // Write output
  console.log(`   Writing compressed file...`);
  await io.write(outputPath, document);

  const endSize = statSync(outputPath).size;
  const ratio = ((1 - endSize / startSize) * 100).toFixed(1);
  console.log(`   Output size: ${(endSize / 1024 / 1024).toFixed(1)} MB (${ratio}% reduction)`);
}

async function main() {
  const files = readdirSync(INPUT_DIR).filter(f => f.endsWith('.glb'));
  console.log(`Found ${files.length} GLB files to compress\n`);

  for (const file of files) {
    try {
      await compressFile(join(INPUT_DIR, file), join(OUTPUT_DIR, file));
    } catch (err) {
      console.error(`   ❌ Error processing ${file}:`, err.message);
    }
  }

  console.log('\n✅ Done! All files processed.');
}

main().catch(console.error);
