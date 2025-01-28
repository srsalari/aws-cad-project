import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { AutoScalingGroup } from 'aws-cdk-lib/aws-autoscaling';
import { aws_elasticloadbalancingv2 as elbv2 } from 'aws-cdk-lib';

export class WordpressAppStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // The code that defines your stack goes here

    // example resource
    // const queue = new sqs.Queue(this, 'WordpressAppQueue', {
    //   visibilityTimeout: cdk.Duration.seconds(300)
    // });

    //  CDK Code for EC2 Launch Template with userdata to install wordpress
    //  ami-0f214d1b3d031dc53
    // 	
    // sg-012843af03647bf7d

    const EC2UserData = `
      #!/bin/bash
      echo "Running custom user data script"
      yum install httpd php php-mysql -y
      yum update -y
      cd /var/www/html
      echo "healthy" > healthy.html
      wget https://wordpress.org/wordpress-6.7.1.tar.gz
      tar -xzf wordpress-6.7.1.tar.gz
      cp -r wordpress/* /var/www/html/
      rm -rf wordpress
      rm -rf wordpress-6.7.1.tar.gz
      chmod -R 755 wp-content
      chown -R apache:apache wp-content
      service httpd start
      chkconfig httpd on
    `;
    const ec2LaunchTemplate = new ec2.CfnLaunchTemplate(this, 'EC2LaunchTemplate', {
      launchTemplateName: "Wordpress-Launch-Template",
      versionDescription: "v1",
      launchTemplateData: {
        instanceType: 't2.micro',
        imageId: "ami-0f214d1b3d031dc53",
        userData: cdk.Fn.base64(EC2UserData),
        securityGroupIds: ["sg-012843af03647bf7d"],
      },
    });

    // ALB 
    const wordpressALB = new elbv2.CfnLoadBalancer(this, 'WordpressALB', /* all optional props */ {
      ipAddressType: 'ipv4',
      scheme: 'internet-facing',
      name: 'WordpressALB',
      securityGroups: ['sg-0d5f63e0de182b942'], 
      subnets: ['subnet-01fa1d0b6802ec7f6', 'subnet-0e58ba6fd94207b9b'],
      type: 'application',
    
    });

    // ALB - Load Balancer

    // ALB - Listener

    // EC2-Instance Template

    // AutoScaling Group
  }
}
