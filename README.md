# :shipit: Redis API Lambda

[![CDK](https://img.shields.io/badge/AWS%20CDK-2.196.0-orange?style=for-the-badge&logo=amazonaws)](https://aws.amazon.com/cdk/)
[![Lambda](https://img.shields.io/badge/AWS%20Lambda-Node.js%2020.x-FF9900?style=for-the-badge&logo=awslambda)](https://aws.amazon.com/lambda/)
[![Redis](https://img.shields.io/badge/Redis-5.8.0-DC382D?style=for-the-badge&logo=redis)](https://redis.io/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6.3-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

A CDK TypeScript project that creates a Lambda-based Redis API with three simple operations: GET, SET, and DELETE.

## Architecture

```mermaid
graph TD
    A[Client Request] --> B[Function URL]
    B --> C[AWS Lambda<br/>Node.js 20.x<br/>256MB RAM]
    C --> D[Redis Client]
    D --> E[Redis Server]
    
    C --> F[Response]
    F --> A
    
    subgraph "API Operations"
        J[GET /{key}]
        K[POST /{key}]
        L[DELETE /{key}]
    end
    
    A --> J
    A --> K
    A --> L
```

## Features

* **GET** `/{key}` - Retrieve a value by key
* **POST** `/{key}` - Set a value for a key (value in request body)
* **DELETE** `/{key}` - Delete a key-value pair
* Lambda Function URL with CORS enabled
* Node.js 20.x runtime with 256MB memory
* Environment variables loaded from `.env` file
* Redis connection with username/password authentication support

## Setup

1. Configure your Redis connection in `.env`:

```env
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_USERNAME=your-username
REDIS_PASSWORD=your-password
REDIS_DB=0
```

2. Install dependencies:

```bash
npm install
cd lambda && npm install
```

3. Deploy the stack:

```bash
npx cdk deploy
```

## Usage

After deployment, you'll get a Function URL. Use it to make API calls:

### GET a value

```bash
curl https://your-function-url.lambda-url.region.on.aws/mykey
```

### SET a value

```bash
curl -X POST https://your-function-url.lambda-url.region.on.aws/mykey \
  -H "Content-Type: application/json" \
  -d '{"value": "my-value"}'
```

### DELETE a key

```bash
curl -X DELETE https://your-function-url.lambda-url.region.on.aws/mykey
```

## API Response Examples

### Successful GET

```json
{
  "key": "mykey",
  "value": "my-value"
}
```

### Successful SET

```json
{
  "message": "Value set successfully",
  "key": "mykey",
  "value": "my-value"
}
```

### Successful DELETE

```json
{
  "message": "Key deleted successfully",
  "key": "mykey"
}
```

### Error Response

```json
{
  "error": "Key not found"
}
```

## Development Commands

* `npm run build` - Compile TypeScript to JS
* `npm run watch` - Watch for changes and compile
* `npm run test` - Perform the Jest unit tests
* `npx cdk deploy` - Deploy this stack to your default AWS account/region
* `npx cdk diff` - Compare deployed stack with current state
* `npx cdk synth` - Emits the synthesized CloudFormation template
