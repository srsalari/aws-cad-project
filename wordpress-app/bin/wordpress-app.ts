#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { WordpressAppStack } from '../lib/wordpress-app-stack';
import { WordpressVpcStack } from '../lib/wordpress-vpc-stack';

const app = new cdk.App();

// Read context value, default to deploying both if not specified.
const deploymentStack = app.node.tryGetContext('stack') || 'B'; // 'B' could mean both

if (deploymentStack === 'V' || deploymentStack === 'B') {
  new WordpressVpcStack(app, 'WordpressVpcStack', {});
}

if (deploymentStack === 'A' || deploymentStack === 'B') {
  new WordpressAppStack(app, 'WordpressAppStack', {});
}


















// #!/usr/bin/env node
// import * as cdk from 'aws-cdk-lib';
// import { WordpressAppStack } from '../lib/wordpress-app-stack';
// import { WordpressVpcStack } from '../lib/wordpress-vpc-stack';
// // import controller from "../controller";

// const app = new cdk.App();

// const deployment = { "stack" : "V" } 

// if (['V'].includes(deployment.stack)) {
//     new WordpressVpcStack(app, 'WordpressVpcStack', {
//     });
// }

// if (['A'].includes(deployment.stack)) {
//     new WordpressAppStack(app, 'WordpressAppStack', {
//     });
// }
