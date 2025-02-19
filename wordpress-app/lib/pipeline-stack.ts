import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as pipelines from 'aws-cdk-lib/pipelines';
import { WordpressVpcStack } from '../lib/wordpress-vpc-stack';
import { WordpressAppStack } from '../lib/wordpress-app-stack';

export class PipelineStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create a CDK Pipeline with a ShellStep that installs dependencies,
    // builds your project, and synthesizes the CloudFormation template.
    const pipeline = new pipelines.CodePipeline(this, 'Pipeline', {
      pipelineName: 'WordpressPipeline',
      synth: new pipelines.ShellStep('Synth', {
        // Update with your source repository details.
        input: pipelines.CodePipelineSource.gitHub('your-github-username/your-repo', 'main'),
        commands: [
          'npm install',
          'npm run build',
          'npx cdk synth'
        ]
      }),
    });

    // Add a stage for deployment.
    // This stage will deploy stacks based on the "stack" context value:
    // - "V" for only the VPC stack.
    // - "A" for only the App stack.
    // - "B" (or unset) for both.
    pipeline.addStage(new WordpressApplicationStage(this, 'DeployWordpress', {
      env: { account: '600627332251', region: 'ca-central-1' } // Replace with your AWS account details.
    }));
  }
}

export class WordpressApplicationStage extends cdk.Stage {
  constructor(scope: Construct, id: string, props?: cdk.StageProps) {
    super(scope, id, props);

    // Read the context value. Default to 'B' (both) if not provided.
    const deploymentStack = this.node.tryGetContext('stack') || 'B';

    if (deploymentStack === 'V' || deploymentStack === 'B') {
      new WordpressVpcStack(this, 'WordpressVpcStack');
    }

    if (deploymentStack === 'A' || deploymentStack === 'B') {
      new WordpressAppStack(this, 'WordpressAppStack');
    }
  }
}
