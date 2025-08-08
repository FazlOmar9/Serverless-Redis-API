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

    // Get query parameters from the event object
    const query = event.queryStringParameters || {};
    const type = (query.type || 'string').toLowerCase();

    switch (method) {
      case 'GET':
        if (!key) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
              error: 'Key is required for GET operation',
            }),
          };
        }

        if (type === 'hash') {
          const field = query.field;
          if (field) {
            // Get specific field from hash
            const value = await client.hGet(key, field);
            if (value === null) {
              return {
                statusCode: 404,
                headers,
                body: JSON.stringify({
                  error: 'Field not found in hash',
                  key,
                  field,
                }),
              };
            }
            return {
              statusCode: 200,
              headers,
              body: JSON.stringify({ key, field, value }),
            };
          } else {
            // Get all fields from hash
            const hash = await client.hGetAll(key);
            if (Object.keys(hash).length === 0) {
              return {
                statusCode: 404,
                headers,
                body: JSON.stringify({ error: 'Hash not found or empty', key }),
              };
            }
            return {
              statusCode: 200,
              headers,
              body: JSON.stringify({ key, hash }),
            };
          }
        } else {
          const value = await client.get(key);
          if (value === null) {
            return {
              statusCode: 404,
              headers,
              body: JSON.stringify({ error: 'Key not found', key }),
            };
          }
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ key, value }),
          };
        }

      case 'POST':
        if (!event.body) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Request body is required' }),
          };
        }

        const body = JSON.parse(event.body);

        if (type === 'hash') {
          const { field, value, fields } = body;

          if (fields && typeof fields === 'object') {
            // Set multiple fields at once
            const fieldArray = [];
            for (const [f, v] of Object.entries(fields)) {
              fieldArray.push(f, v);
            }
            await client.hSet(key, fieldArray);
            return {
              statusCode: 200,
              headers,
              body: JSON.stringify({
                message: 'Hash fields set successfully',
                key,
                fields,
              }),
            };
          } else if (field && value !== undefined) {
            // Set single field
            await client.hSet(key, field, value);
            return {
              statusCode: 200,
              headers,
              body: JSON.stringify({
                message: 'Hash field set successfully',
                key,
                field,
                value,
              }),
            };
          } else {
            return {
              statusCode: 400,
              headers,
              body: JSON.stringify({
                error:
                  'Either "field" and "value" or "fields" object is required for hash type',
              }),
            };
          }
        } else {
          if (!body.value) {
            return {
              statusCode: 400,
              headers,
              body: JSON.stringify({
                error: 'Value is required in request body for string type',
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
        }

      case 'DELETE':
        if (!key) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
              error: 'Key is required for DELETE operation',
            }),
          };
        }

        if (type === 'hash') {
          const field = query.field;
          if (!field) {
            return {
              statusCode: 400,
              headers,
              body: JSON.stringify({
                error: 'Field is required for hash DELETE operation',
              }),
            };
          }
          const deleted = await client.hDel(key, field);
          if (deleted === 0) {
            return {
              statusCode: 404,
              headers,
              body: JSON.stringify({
                error: 'Field not found in hash',
                key,
                field,
              }),
            };
          }
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              message: 'Hash field deleted successfully',
              key,
              field,
            }),
          };
        } else {
          const deleted = await client.del(key);
          if (deleted === 0) {
            return {
              statusCode: 404,
              headers,
              body: JSON.stringify({ error: 'Key not found', key }),
            };
          }
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ message: 'Key deleted successfully', key }),
          };
        }

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
