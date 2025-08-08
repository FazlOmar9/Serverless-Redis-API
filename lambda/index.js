const redis = require('redis');

// Redis client initialization
let redisClient;

const getRedisClient = async () => {
  if (!redisClient) {
    redisClient = redis.createClient({
      socket: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT) || 6379,
      },
      username: process.env.REDIS_USERNAME || undefined,
      password: process.env.REDIS_PASSWORD || undefined,
      database: parseInt(process.env.REDIS_DB) || 0,
    });

    redisClient.on('error', (err) => console.log('Redis Client Error', err));
    await redisClient.connect();
  }
  return redisClient;
};

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  };

  try {
    // Handle preflight OPTIONS request
    if (event.requestContext.http.method === 'OPTIONS') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: 'CORS preflight' }),
      };
    }

    const client = await getRedisClient();
    const method = event.requestContext.http.method;
    const path = event.requestContext.http.path;

    // Extract key from path (expecting /key or /{key})
    const key = path.startsWith('/') ? path.substring(1) : path;

    if (!key && method !== 'GET') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Key is required' }),
      };
    }

    switch (method) {
      case 'GET':
        // GET /key - Get value
        if (!key) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
              error: 'Key is required for GET operation',
            }),
          };
        }

        const value = await client.get(key);
        if (value === null) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Key not found' }),
          };
        }

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ key, value }),
        };

      case 'POST':
        // POST /key with value in body - Set value
        if (!event.body) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Request body is required' }),
          };
        }

        const body = JSON.parse(event.body);
        if (!body.value) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
              error: 'Value is required in request body',
            }),
          };
        }

        await client.set(key, body.value);
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            message: 'Value set successfully',
            key,
            value: body.value,
          }),
        };

      case 'DELETE':
        // DELETE /key - Delete key-value pair
        const deleted = await client.del(key);
        if (deleted === 0) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Key not found' }),
          };
        }

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ message: 'Key deleted successfully', key }),
        };

      default:
        return {
          statusCode: 405,
          headers,
          body: JSON.stringify({ error: 'Method not allowed' }),
        };
    }
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        details: error.message,
      }),
    };
  }
};
