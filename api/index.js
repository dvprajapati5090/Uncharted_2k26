import { handleRequest } from '../src/server-v2.js';

export default async function handler(req, res) {
  return handleRequest(req, res);
}
