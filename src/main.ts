import { App, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { PortfolioStack } from './lib/portfolio-stack';

export class MyStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps = {}) {
    super(scope, id, props);

    // define resources here...
  }
}

// for development, use account/region from cdk cli
const devEnv = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};

const app = new App();

new PortfolioStack(app, 'cdk-sc-network-product', { env: devEnv });
new MyStack(app, 'mystack', { env: devEnv });

app.synth();