#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { WordpressAppStack } from '../lib/wordpress-app-stack';
import { WordpressVpcStack } from '../lib/wordpress-vpc-stack';
// import controller from "../controller";
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as lb from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as autoscaling from 'aws-cdk-lib/aws-autoscaling';

const app = new cdk.App();

const deployment = { "stack" : "A" } 

if (['V'].includes(deployment.stack)) {
    new WordpressVpcStack(app, 'WordpressVpcStack', {
    });
}

if (['A'].includes(deployment.stack)) {
    new WordpressAppStack(app, 'WordpressAppStack', {
    });
}
