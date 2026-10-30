import https from 'node:https';
import crypto from 'node:crypto';
import { config } from '../config.js';

export const EMBEDDING_DIMENSIONS = config.embedding.dimensions || 1024;
export const EMBEDDING_MODEL = config.embedding.model || 'voyage-4';

// Semantic cluster dictionary mapping concepts to vector dimensions
const CONCEPT_CLUSTERS = [
  { cluster: 'database', keywords: ['database', 'db', 'postgres', 'postgresql', 'mongo', 'mongodb', 'atlas', 'persistence', 'sql', 'nosql', 'storage', 'data', 'document'] },
  { cluster: 'infrastructure', keywords: ['infrastructure', 'redis', 'cache', 'caching', 'queue', 'queues', 'job', 'jobs', 'background', 'notifications', 'celery', 'bullmq', 'worker', 'broker'] },
  { cluster: 'constraint', keywords: ['constraint', 'approval', 'prohibited', 'forbidden', 'rule', 'restriction', 'paid', 'cost', 'freeze', 'limit'] },
  { cluster: 'deployment', keywords: ['deployment', 'deploy', 'release', 'production', 'staging', 'docker', 'kubernetes', 'freeze', 'launch'] },
  { cluster: 'frontend', keywords: ['frontend', 'ui', 'react', 'tailwind', 'css', 'components', 'client', 'web', 'theme', 'ide'] },
  { cluster: 'backend', keywords: ['backend', 'server', 'node', 'express', 'api', 'service', 'microservice', 'endpoint'] }
];

/**
 * Generates deterministic, normalized 1024-dimensional dense vectors
 * for local development/testing without requiring an active Voyage API key.
 */
export function generateDeterministicVector(text, dimensions = EMBEDDING_DIMENSIONS) {
  if (!text || typeof text !== 'string') text = '';
  const vector = new Float32Array(dimensions);
  
  const tokens = text.toLowerCase().replace(/[^\w\s-]/g, ' ').split(/\s+/).filter(Boolean);
  
  // 1. Semantic Concept Clustering (Dims 0 - 255)
  CONCEPT_CLUSTERS.forEach((clusterItem, cIdx) => {
    let hits = 0;
    for (const t of tokens) {
      if (clusterItem.keywords.includes(t)) hits += 1.5;
    }
    if (hits > 0) {
      const baseIdx = (cIdx * 32) % 256;
      for (let i = 0; i < 24; i++) {
        vector[baseIdx + i] += hits * (1.0 / (i + 1));
      }
    }
  });

  // 2. Distributed Hashing (Dims 256 - 1023)
  tokens.forEach((token, tIdx) => {
    let tHash = 0;
    for (let c = 0; c < token.length; c++) {
      tHash = (tHash << 5) - tHash + token.charCodeAt(c);
      tHash |= 0;
    }
    const bucket = 256 + (Math.abs(tHash) % (dimensions - 256));
    const weight = 1.0 / Math.log2(tIdx + 2);
    vector[bucket] += weight;

    // Bigrams
    if (tIdx > 0) {
      const bigram = `${tokens[tIdx - 1]}_${token}`;
      let bHash = 0;
      for (let c = 0; c < bigram.length; c++) {
        bHash = (bHash << 5) - bHash + bigram.charCodeAt(c);
        bHash |= 0;
      }
      const bBucket = 256 + (Math.abs(bHash) % (dimensions - 256));
      vector[bBucket] += 0.8;
    }
  });

  // 3. L2 Normalize
  let sumSq = 0;
  for (let i = 0; i < dimensions; i++) {
    sumSq += vector[i] * vector[i];
  }
  const norm = Math.sqrt(sumSq) || 1e-9;
  const normalized = [];
  for (let i = 0; i < dimensions; i++) {
    normalized.push(parseFloat((vector[i] / norm).toFixed(6)));
  }

  return normalized;
}

/**
 * Calls Voyage AI Embeddings API (model: voyage-4, 1024D)
 */
async function callVoyageApi(inputs, inputType = 'document') {
  const apiKey = config.embedding.apiKey;
  if (!apiKey) {
    throw new Error('Voyage API key missing.');
  }

  const payload = JSON.stringify({
    model: EMBEDDING_MODEL,
    input: inputs,
    input_type: inputType
  });

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.voyageai.com',
      port: 443,
      path: '/v1/embeddings',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Content-Length': Buffer.byteLength(payload)
      },
      timeout: 10000
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const parsed = JSON.parse(body);
            resolve(parsed.data.map(d => d.embedding));
          } catch (e) {
            reject(new Error(`Failed to parse Voyage response: ${e.message}`));
          }
        } else {
          reject(new Error(`Voyage API returned error (${res.statusCode}): ${body}`));
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Voyage API request timed out after 10000ms'));
    });

    req.write(payload);
    req.end();
  });
}

export async function embedDocuments(texts) {
  if (!Array.isArray(texts)) texts = [texts];
  if (config.embedding.provider === 'voyage' && config.embedding.apiKey) {
    try {
      const embeddings = await callVoyageApi(texts, 'document');
      embeddings.forEach(validateVector);
      return embeddings;
    } catch (err) {
      console.warn(`[VoyageProvider] Live API call notice: ${err.message}. Using deterministic 1024D embedding.`);
    }
  }

  return texts.map(t => {
    const vec = generateDeterministicVector(t, EMBEDDING_DIMENSIONS);
    validateVector(vec);
    return vec;
  });
}

export async function embedQuery(text) {
  if (config.embedding.provider === 'voyage' && config.embedding.apiKey) {
    try {
      const embeddings = await callVoyageApi([text], 'query');
      validateVector(embeddings[0]);
      return embeddings[0];
    } catch (err) {
      console.warn(`[VoyageProvider] Live query notice: ${err.message}. Using deterministic 1024D embedding.`);
    }
  }

  const vec = generateDeterministicVector(text, EMBEDDING_DIMENSIONS);
  validateVector(vec);
  return vec;
}

export function validateVector(vector) {
  if (!Array.isArray(vector)) {
    throw new Error('Vector must be an array of numbers');
  }
  if (vector.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(`Vector dimension mismatch: expected ${EMBEDDING_DIMENSIONS}, received ${vector.length}`);
  }
  for (let i = 0; i < vector.length; i++) {
    if (!Number.isFinite(vector[i])) {
      throw new Error(`Vector contains non-finite element at index ${i}: ${vector[i]}`);
    }
  }
  return true;
}

export function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0;
  let nA = 0;
  let nB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    nA += a[i] * a[i];
    nB += b[i] * b[i];
  }
  const denom = Math.sqrt(nA) * Math.sqrt(nB);
  if (denom < 1e-9) return 0;
  return Math.max(0, Math.min(1, dot / denom));
}
