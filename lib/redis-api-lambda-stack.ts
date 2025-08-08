import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import * as path from 'path';
import * as dotenv from 'dotenv';

export class RedisApiLambdaStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Load environment variables from .env file
    dotenv.config({ path: path.join(__dirname, '..', '.env') });

    // Create the Lambda function
    const redisApiFunction = new lambda.Function(this, 'RedisApiFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '..', 'lambda')),
      memorySize: 256,
      timeout: cdk.Duration.seconds(30),
      environment: {
        REDIS_HOST: process.env.REDIS_HOST || '',
        REDIS_PORT: process.env.REDIS_PORT || '6379',
        REDIS_USERNAME: process.env.REDIS_USERNAME || '',
        REDIS_PASSWORD: process.env.REDIS_PASSWORD || '',
        REDIS_DB: process.env.REDIS_DB || '0',
      },
    });

    // Create Function URL with CORS
    const functionUrl = redisApiFunction.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
      cors: {
        allowedOrigins: ['*'],
        allowedMethods: [
          lambda.HttpMethod.GET,
          lambda.HttpMethod.POST,
          lambda.HttpMethod.DELETE,
          lambda.HttpMethod.OPTIONS,
        ],
        allowedHeaders: ['Content-Type', 'Authorization'],
        allowCredentials: false,
        maxAge: cdk.Duration.seconds(300),
      },
    });

    // Output the Function URL
    new cdk.CfnOutput(this, 'FunctionUrl', {
      value: functionUrl.url,
      description: 'Redis API Lambda Function URL',
    });
  }
}
