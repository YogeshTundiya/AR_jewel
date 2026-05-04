#!/usr/bin/env node
/**
 * Special handler for ring-diamond.glb which exceeds Node's typed array limit.
 * Split the binary buffer to avoid the limit, then reassemble.
 */

import { readFileSync, writeFileSync, statSync } from 'fs';

const INPUT = 'public/3D/backup/ring-diamond.glb';
const OUTPUT = 'public/3D/ring-diamond.glb';

// Read the GLB file manually
const buffer = readFileSync(INPUT);
console.log(`Input size: ${(buffer.length / 1024 / 1024).toFixed(1)} MB`);

// Parse GLB header
const magic = buffer.readUInt32LE(0);
const version = buffer.readUInt32LE(4);
const totalLength = buffer.readUInt32LE(8);

console.log(`GLB version: ${version}, total length: ${totalLength}`);

// Parse JSON chunk
const jsonChunkLength = buffer.readUInt32LE(12);
const jsonChunkType = buffer.readUInt32LE(16);
const jsonStr = buffer.subarray(20, 20 + jsonChunkLength).toString('utf8').replace(/\0+$/, '');
const gltf = JSON.parse(jsonStr);

console.log(`Vertices: ${gltf.accessors[0].count.toLocaleString()}`);
console.log(`Triangles: ${(gltf.accessors[3].count / 3).toLocaleString()}`);

// Parse binary chunk
const binOffset = 20 + jsonChunkLength;
const binChunkLength = buffer.readUInt32LE(binOffset);
const binChunkType = buffer.readUInt32LE(binOffset + 4);
const binData = buffer.subarray(binOffset + 8, binOffset + 8 + binChunkLength);

console.log(`Binary data: ${(binData.length / 1024 / 1024).toFixed(1)} MB`);

// The model has 1,046,146 vertices and 5,998,962 indices (1,999,654 triangles)
// We need to decimate this. Since gltf-transform can't handle the buffer,
// let's do a simple vertex decimation by keeping every Nth vertex.

const posAccessor = gltf.accessors[0]; // POSITION
const uvAccessor = gltf.accessors[1];  // TEXCOORD_0  
const normAccessor = gltf.accessors[2]; // NORMAL
const indexAccessor = gltf.accessors[3]; // indices

const originalVertexCount = posAccessor.count;
const originalIndexCount = indexAccessor.count;
const targetRatio = 0.05; // Keep 5% of triangles

// Read positions
const posBV = gltf.bufferViews[0];
const positions = new Float32Array(binData.buffer, binData.byteOffset + posBV.byteOffset, posBV.byteLength / 4);

// Read UVs
const uvBV = gltf.bufferViews[1];
const uvs = new Float32Array(binData.buffer, binData.byteOffset + uvBV.byteOffset, uvBV.byteLength / 4);

// Read normals
const normBV = gltf.bufferViews[2];
const normals = new Float32Array(binData.buffer, binData.byteOffset + normBV.byteOffset, normBV.byteLength / 4);

// Read indices
const idxBV = gltf.bufferViews[3];
const indices = new Uint32Array(binData.buffer, binData.byteOffset + idxBV.byteOffset, idxBV.byteLength / 4);

console.log(`\nDecimating to ${(targetRatio * 100)}% of triangles...`);

// Simple grid-based vertex merging for decimation
const GRID_SIZE = 0.02; // Merge vertices within this distance
const vertexMap = new Map(); // grid cell -> first vertex index
const remapTable = new Uint32Array(originalVertexCount);
let newVertexCount = 0;

const newPositions = [];
const newUVs = [];
const newNormals = [];

for (let i = 0; i < originalVertexCount; i++) {
  const px = positions[i * 3];
  const py = positions[i * 3 + 1];
  const pz = positions[i * 3 + 2];
  
  const gx = Math.round(px / GRID_SIZE);
  const gy = Math.round(py / GRID_SIZE);
  const gz = Math.round(pz / GRID_SIZE);
  const key = `${gx},${gy},${gz}`;
  
  if (vertexMap.has(key)) {
    remapTable[i] = vertexMap.get(key);
  } else {
    const newIdx = newVertexCount++;
    vertexMap.set(key, newIdx);
    remapTable[i] = newIdx;
    
    newPositions.push(px, py, pz);
    newUVs.push(uvs[i * 2], uvs[i * 2 + 1]);
    newNormals.push(normals[i * 3], normals[i * 3 + 1], normals[i * 3 + 2]);
  }
}

console.log(`Vertices: ${originalVertexCount.toLocaleString()} -> ${newVertexCount.toLocaleString()}`);

// Remap and deduplicate triangles
const newIndices = [];
const triangleSet = new Set();

for (let i = 0; i < originalIndexCount; i += 3) {
  const a = remapTable[indices[i]];
  const b = remapTable[indices[i + 1]];
  const c = remapTable[indices[i + 2]];
  
  // Skip degenerate triangles
  if (a === b || b === c || a === c) continue;
  
  // Deduplicate triangles
  const sorted = [a, b, c].sort((x, y) => x - y);
  const key = `${sorted[0]},${sorted[1]},${sorted[2]}`;
  if (triangleSet.has(key)) continue;
  triangleSet.add(key);
  
  newIndices.push(a, b, c);
}

const newTriangleCount = newIndices.length / 3;
console.log(`Triangles: ${(originalIndexCount / 3).toLocaleString()} -> ${newTriangleCount.toLocaleString()}`);

// Read textures (keep as-is)
const texBV4 = gltf.bufferViews[4];
const texBV5 = gltf.bufferViews[5];
const tex1 = binData.subarray(texBV4.byteOffset, texBV4.byteOffset + texBV4.byteLength);
const tex2 = binData.subarray(texBV5.byteOffset, texBV5.byteOffset + texBV5.byteLength);

// Build new binary buffer
const posBuffer = new Float32Array(newPositions);
const uvBuffer = new Float32Array(newUVs);
const normBuffer = new Float32Array(newNormals);
const idxBuffer = newVertexCount > 65535 ? new Uint32Array(newIndices) : new Uint16Array(newIndices);
const idxComponentType = newVertexCount > 65535 ? 5125 : 5123;

// Calculate buffer view offsets (aligned to 4 bytes)
function align4(n) { return Math.ceil(n / 4) * 4; }

const bv0Offset = 0;
const bv0Length = posBuffer.byteLength;
const bv1Offset = align4(bv0Offset + bv0Length);
const bv1Length = uvBuffer.byteLength;
const bv2Offset = align4(bv1Offset + bv1Length);
const bv2Length = normBuffer.byteLength;
const bv3Offset = align4(bv2Offset + bv2Length);
const bv3Length = idxBuffer.byteLength;
const bv4Offset = align4(bv3Offset + bv3Length);
const bv4Length = tex1.byteLength;
const bv5Offset = align4(bv4Offset + bv4Length);
const bv5Length = tex2.byteLength;
const totalBinLength = align4(bv5Offset + bv5Length);

// Update GLTF JSON
gltf.accessors[0].count = newVertexCount;
gltf.accessors[0].max = [
  Math.max(...newPositions.filter((_, i) => i % 3 === 0)),
  Math.max(...newPositions.filter((_, i) => i % 3 === 1)),
  Math.max(...newPositions.filter((_, i) => i % 3 === 2)),
];
gltf.accessors[0].min = [
  Math.min(...newPositions.filter((_, i) => i % 3 === 0)),
  Math.min(...newPositions.filter((_, i) => i % 3 === 1)),
  Math.min(...newPositions.filter((_, i) => i % 3 === 2)),
];
gltf.accessors[1].count = newVertexCount;
gltf.accessors[2].count = newVertexCount;
gltf.accessors[3].count = newIndices.length;
gltf.accessors[3].componentType = idxComponentType;
gltf.accessors[3].max = [newVertexCount - 1];
gltf.accessors[3].min = [0];

gltf.bufferViews[0] = { buffer: 0, byteOffset: bv0Offset, byteLength: bv0Length, target: 34962, byteStride: 12 };
gltf.bufferViews[1] = { buffer: 0, byteOffset: bv1Offset, byteLength: bv1Length, target: 34962, byteStride: 8 };
gltf.bufferViews[2] = { buffer: 0, byteOffset: bv2Offset, byteLength: bv2Length, target: 34962, byteStride: 12 };
gltf.bufferViews[3] = { buffer: 0, byteOffset: bv3Offset, byteLength: bv3Length, target: 34963 };
gltf.bufferViews[4] = { buffer: 0, byteOffset: bv4Offset, byteLength: bv4Length };
gltf.bufferViews[5] = { buffer: 0, byteOffset: bv5Offset, byteLength: bv5Length };
gltf.buffers[0].byteLength = totalBinLength;

// Write GLB
const jsonBuffer = Buffer.from(JSON.stringify(gltf));
const jsonPadded = Buffer.alloc(align4(jsonBuffer.length), 0x20);
jsonBuffer.copy(jsonPadded);

const binBuffer = Buffer.alloc(totalBinLength);
Buffer.from(posBuffer.buffer).copy(binBuffer, bv0Offset);
Buffer.from(uvBuffer.buffer).copy(binBuffer, bv1Offset);
Buffer.from(normBuffer.buffer).copy(binBuffer, bv2Offset);
Buffer.from(idxBuffer.buffer).copy(binBuffer, bv3Offset);
tex1.copy(binBuffer, bv4Offset);
tex2.copy(binBuffer, bv5Offset);

const glbLength = 12 + 8 + jsonPadded.length + 8 + binBuffer.length;
const header = Buffer.alloc(12);
header.writeUInt32LE(0x46546C67, 0); // glTF magic
header.writeUInt32LE(2, 4); // version
header.writeUInt32LE(glbLength, 8);

const jsonChunkHeader = Buffer.alloc(8);
jsonChunkHeader.writeUInt32LE(jsonPadded.length, 0);
jsonChunkHeader.writeUInt32LE(0x4E4F534A, 4); // JSON

const binChunkHeader = Buffer.alloc(8);
binChunkHeader.writeUInt32LE(binBuffer.length, 0);
binChunkHeader.writeUInt32LE(0x004E4942, 4); // BIN

const output = Buffer.concat([header, jsonChunkHeader, jsonPadded, binChunkHeader, binBuffer]);
writeFileSync(OUTPUT, output);

const outputSize = statSync(OUTPUT).size;
console.log(`\n✅ Output: ${(outputSize / 1024 / 1024).toFixed(1)} MB (${((1 - outputSize / buffer.length) * 100).toFixed(1)}% reduction)`);
