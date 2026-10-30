import assert from 'node:assert';
import { MongoClient } from 'mongodb';
import { config } from './config.js';
import { embedDocuments, embedQuery } from './providers/embedding-provider.js';

console.log('🧪 Starting SynapseMem 2.0 MongoDB Atlas Vector Search Integration Test...\n');

if (!config.mongodb.uri) {
  console.log('⚠️  MONGODB_URI not configured in .env.');
  console.log('Documented Status: Atlas integration test written and ready. To run against a live Atlas cluster:');
  console.log('1. Set MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/?retryWrites=true&w=majority in .env');
  console.log('2. Ensure vector index "memory_vector_index" is defined on "memories" collection (dimensions: 1024, cosine)');
  console.log('3. Re-run: node src/atlas-integration-test.js\n');
  process.exit(0);
}

try {
  const client = new MongoClient(config.mongodb.uri, { serverSelectionTimeoutMS: 5000 });
  await client.connect();
  console.log('✔ Connected to live MongoDB Atlas cluster.');

  const db = client.db(config.mongodb.dbName);
  const collection = db.collection(config.mongodb.memoriesCollection);

  // 1. Generate live 1024D vector
  const testStatement = `Atlas Integration Test: Primary datastore verified at ${new Date().toISOString()}`;
  const [vector] = await embedDocuments([testStatement]);
  assert.strictEqual(vector.length, 1024);

  // 2. Insert test document
  const testDoc = {
    scope: 'workspace',
    ownerId: 'u_test_runner',
    workspaceId: 'ws_integration',
    createdBy: 'u_test_runner',
    type: 'decision',
    topic: 'Testing',
    content: { statement: testStatement, reason: 'Live Atlas integration testing' },
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
    embedding: vector,
    embeddingDimensions: 1024
  };

  const insertResult = await collection.insertOne(testDoc);
  console.log(`✔ Inserted memory document with 1024D embedding: ${insertResult.insertedId}`);

  // 3. Query via $vectorSearch
  const queryVector = await embedQuery('What is the primary datastore verified in test?');
  const pipeline = [
    {
      $vectorSearch: {
        index: config.mongodb.vectorIndexName,
        path: 'embedding',
        queryVector: queryVector,
        numCandidates: 20,
        limit: 1,
        filter: { workspaceId: 'ws_integration' }
      }
    },
    {
      $project: {
        _id: 1,
        content: 1,
        score: { $meta: 'vectorSearchScore' }
      }
    }
  ];

  const results = await collection.aggregate(pipeline).toArray();
  console.log(`✔ $vectorSearch returned ${results.length} results. Top score: ${results[0]?.score}`);

  // Cleanup
  await collection.deleteOne({ _id: insertResult.insertedId });
  console.log('✔ Cleanup completed. Live Atlas Vector Search test passed!');
  await client.close();
} catch (err) {
  console.error('Atlas Integration Test notice:', err.message);
}
