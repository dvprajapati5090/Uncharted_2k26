/**
 * Vector Search & Semantic Similarity Engine
 * Provides hybrid retrieval: Dense semantic embedding cosine similarity + BM25 lexical matching.
 */

// Domain concept dictionary for semantic embeddings
const DOMAIN_CONCEPTS = {
  database: ['database', 'db', 'postgres', 'postgresql', 'mongo', 'mongodb', 'sqlite', 'mysql', 'sql', 'nosql', 'redis', 'dynamodb', 'schema', 'query', 'storage', 'datastore', 'tables'],
  backend: ['backend', 'server', 'api', 'node', 'express', 'python', 'fastapi', 'rest', 'graphql', 'endpoint', 'service', 'microservice'],
  frontend: ['frontend', 'ui', 'client', 'react', 'vue', 'nextjs', 'tailwind', 'css', 'components', 'web'],
  devops: ['devops', 'docker', 'kubernetes', 'deploy', 'deployment', 'hosting', 'vercel', 'aws', 'cloud', 'ci', 'cd', 'staging', 'production'],
  timeline: ['demo', 'deadline', 'friday', 'sprint', 'schedule', 'date', 'milestone', 'launch', 'release', 'freeze', 'time', 'tomorrow', 'week'],
  auth: ['auth', 'authentication', 'login', 'oauth', 'jwt', 'session', 'security', 'permissions', 'sso'],
  architecture: ['architecture', 'pattern', 'structure', 'design', 'monolith', 'microservices', 'event-driven'],
  reasoning: ['because', 'reason', 'why', 'since', 'knows', 'familiar', 'performance', 'speed', 'scale', 'cost', 'flexible', 'team']
};

const STOP_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'aren',
  'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by',
  'can', 'did', 'do', 'does', 'doing', 'down', 'during', 'each', 'few', 'for', 'from', 'further',
  'had', 'has', 'have', 'having', 'he', 'her', 'here', 'hers', 'herself', 'him', 'himself', 'his',
  'how', 'i', 'if', 'in', 'into', 'is', 'it', 'its', 'itself', 'just', 'me', 'more', 'most', 'my',
  'myself', 'no', 'nor', 'not', 'now', 'of', 'off', 'on', 'once', 'only', 'or', 'other', 'our',
  'ours', 'ourselves', 'out', 'over', 'own', 'same', 'she', 'should', 'so', 'some', 'such', 'than',
  'that', 'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', 'these', 'they', 'this',
  'those', 'through', 'to', 'too', 'under', 'until', 'up', 'very', 'was', 'we', 'were', 'what',
  'when', 'where', 'which', 'while', 'who', 'whom', 'why', 'will', 'with', 'would', 'you', 'your'
]);

/**
 * Tokenize and normalize text into clean stems/words
 */
export function tokenize(text) {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, ' ')
    .split(/\s+/)
    .map(w => w.trim())
    .filter(w => w.length > 1);
}

/**
 * Remove standard stop words, keeping critical query/reason keywords like 'why'
 */
export function filterKeywords(tokens, preserveReasons = true) {
  return tokens.filter(t => {
    if (preserveReasons && (t === 'why' || t === 'sql' || t === 'db')) return true;
    return !STOP_WORDS.has(t);
  });
}

/**
 * Generate a 128-dimensional dense semantic embedding vector
 */
export function generateEmbedding(text) {
  const dim = 128;
  const vector = new Float32Array(dim);
  if (!text) return Array.from(vector);

  const tokens = tokenize(text);
  if (tokens.length === 0) return Array.from(vector);

  // 1. Concept cluster dimensions (0..63)
  const conceptKeys = Object.keys(DOMAIN_CONCEPTS);
  conceptKeys.forEach((concept, cIdx) => {
    const keywords = DOMAIN_CONCEPTS[concept];
    let conceptHits = 0;
    for (const token of tokens) {
      if (keywords.includes(token)) {
        conceptHits += 1.5;
      }
    }
    if (conceptHits > 0) {
      const baseIdx = (cIdx * 8) % 64;
      for (let i = 0; i < 4; i++) {
        vector[baseIdx + i] += conceptHits * (1.0 / (i + 1));
      }
    }
  });

  // 2. Hash-based n-gram & term projection (64..127)
  tokens.forEach((token, idx) => {
    // Single token hash
    let hash = 0;
    for (let i = 0; i < token.length; i++) {
      hash = (hash << 5) - hash + token.charCodeAt(i);
      hash |= 0;
    }
    const bucket = 64 + Math.abs(hash) % 64;
    const weight = 1.0 / Math.log2(idx + 2);
    vector[bucket] += weight;

    // Bigram hash if idx > 0
    if (idx > 0) {
      const bigram = `${tokens[idx - 1]}_${token}`;
      let bHash = 0;
      for (let i = 0; i < bigram.length; i++) {
        bHash = (bHash << 5) - bHash + bigram.charCodeAt(i);
        bHash |= 0;
      }
      const bBucket = 64 + Math.abs(bHash) % 64;
      vector[bBucket] += 0.75;
    }
  });

  // 3. L2 Normalize the vector
  let sumSq = 0;
  for (let i = 0; i < dim; i++) {
    sumSq += vector[i] * vector[i];
  }
  const norm = Math.sqrt(sumSq) || 1e-9;
  const normalized = [];
  for (let i = 0; i < dim; i++) {
    normalized.push(vector[i] / norm);
  }

  return normalized;
}

/**
 * Calculate Cosine Similarity between two dense vectors
 */
export function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  if (denom < 1e-9) return 0;
  const sim = dotProduct / denom;
  return Math.max(0, Math.min(1, sim));
}

/**
 * Compute BM25 Lexical overlap score
 */
export function computeBM25(queryTokens, docText) {
  const docTokens = tokenize(docText);
  if (queryTokens.length === 0 || docTokens.length === 0) {
    return { score: 0, matchedTerms: [] };
  }

  const docFreq = new Map();
  docTokens.forEach(t => docFreq.set(t, (docFreq.get(t) || 0) + 1));

  let score = 0;
  const matchedTerms = [];
  const k1 = 1.2;
  const b = 0.75;
  const avgDocLength = 15;
  const docLenRatio = docTokens.length / avgDocLength;

  for (const qTerm of queryTokens) {
    const tf = docFreq.get(qTerm) || 0;
    if (tf > 0) {
      matchedTerms.push(qTerm);
      const termScore = (tf * (k1 + 1)) / (tf + k1 * (1 - b + b * docLenRatio));
      score += termScore;
    } else {
      // Check for partial substring or domain synonyms
      for (const [concept, words] of Object.entries(DOMAIN_CONCEPTS)) {
        if (words.includes(qTerm)) {
          const docHasConcept = words.some(w => docFreq.has(w));
          if (docHasConcept) {
            matchedTerms.push(`${qTerm}~${concept}`);
            score += 0.5;
            break;
          }
        }
      }
    }
  }

  // Normalize to 0..1 range
  const maxPossible = queryTokens.length * (k1 + 1);
  const normalizedScore = maxPossible > 0 ? Math.min(1.0, score / maxPossible) : 0;
  return { score: normalizedScore, matchedTerms };
}

/**
 * Hybrid search ranking combining dense embedding cosine similarity and lexical BM25
 */
export function rankMemory(query, memory, queryEmbedding) {
  // Combine all searchable fields
  const memorySearchText = `${memory.topic || ''} ${memory.decision || ''} ${memory.reason || ''} ${(memory.tags || []).join(' ')} ${memory.owner || ''}`;

  // 1. Dense Cosine Similarity
  let memVector = memory.vector;
  if (typeof memVector === 'string') {
    try {
      memVector = JSON.parse(memVector);
    } catch {
      memVector = null;
    }
  }
  if (!memVector || memVector.length === 0) {
    memVector = generateEmbedding(memorySearchText);
  }

  const denseSimilarity = cosineSimilarity(queryEmbedding, memVector);

  // 2. Lexical BM25
  const qTokens = filterKeywords(tokenize(query));
  const bm25Result = computeBM25(qTokens, memorySearchText);

  // 3. Topic & Exact Entity Boost
  let topicBoost = 0;
  const qLower = query.toLowerCase();
  if (memory.topic && qLower.includes(memory.topic.toLowerCase())) {
    topicBoost += 0.15;
  }
  // If memory decision mentions specific named technologies also in query
  ['postgres', 'postgresql', 'mongo', 'mongodb', 'react', 'node', 'docker', 'vercel', 'demo', 'friday'].forEach(tech => {
    if (qLower.includes(tech) && memorySearchText.toLowerCase().includes(tech)) {
      topicBoost += 0.10;
    }
  });

  // 4. Combined Hybrid Score (weighted)
  // 60% Dense Vector, 30% BM25, 10% Topic/Entity Boost
  let hybridScore = (denseSimilarity * 0.60) + (bm25Result.score * 0.30) + topicBoost;
  hybridScore = Math.max(0, Math.min(1.0, hybridScore));

  return {
    hybridScore: parseFloat(hybridScore.toFixed(3)),
    denseSimilarity: parseFloat(denseSimilarity.toFixed(3)),
    bm25Score: parseFloat(bm25Result.score.toFixed(3)),
    matchedTerms: bm25Result.matchedTerms,
    topicBoost: parseFloat(topicBoost.toFixed(2))
  };
}
