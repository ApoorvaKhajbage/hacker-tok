import Redis from "ioredis";

// Use Docker Redis for local, and Upstash Redis for production
const redis = new Redis(process.env.REDIS_URL || "redis://127.0.0.1:6379");

export default redis;
