import dotenv from 'dotenv';
dotenv.config();

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  
  // MongoDB Atlas
  mongodb: {
    uri: process.env.MONGODB_URI || '',
    dbName: process.env.MONGODB_DB_NAME || 'synapsemem',
    memoriesCollection: process.env.MONGODB_MEMORIES_COLLECTION || 'memories',
    eventsCollection: process.env.MONGODB_MEMORY_EVENTS_COLLECTION || 'memory_events',
    vectorIndexName: process.env.MONGODB_VECTOR_INDEX_NAME || 'memory_vector_index'
  },

  // Embeddings
  embedding: {
    provider: process.env.EMBEDDING_PROVIDER || (process.env.VOYAGE_API_KEY ? 'voyage' : 'mock-deterministic'),
    apiKey: process.env.VOYAGE_API_KEY || '',
    model: process.env.VOYAGE_EMBEDDING_MODEL || 'voyage-4',
    dimensions: parseInt(process.env.VOYAGE_EMBEDDING_DIMENSIONS || '1024', 10)
  },

  // LLM Orchestration
  llm: {
    provider: process.env.LLM_PROVIDER || 'local-heuristic',
    apiKey: process.env.LLM_API_KEY || '',
    model: process.env.LLM_MODEL || ''
  },

  // Session & Demo
  sessionSecret: process.env.SESSION_SECRET || 'synapsemem-secret',
  appTimeOverride: process.env.APP_TIME_OVERRIDE || null,
  demoMode: process.env.DEMO_MODE !== 'false'
};

export function validateConfig() {
  if (config.embedding.dimensions !== 1024) {
    console.warn(`[Config] Warning: Embedding dimension is configured to ${config.embedding.dimensions}. Voyage voyage-4 requires 1024 dimensions.`);
  }
  return config;
}
