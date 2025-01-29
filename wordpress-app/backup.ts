//  backup of wordpress-app-stack.ts
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
// import { AutoScalingGroup } from 'aws-cdk-lib/aws-autoscaling';
import { aws_autoscaling as autoscaling } from 'aws-cdk-lib';
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
      versionDescription: "$Latest",
      launchTemplateData: {
        instanceType: 't2.micro',
        imageId: "ami-0f214d1b3d031dc53",
        userData: cdk.Fn.base64(EC2UserData),
        securityGroupIds: [cdk.Fn.importValue('Application-EC2-SG-ID')],
      },
    });

    // ALB 
    const wordpressALB = new elbv2.CfnLoadBalancer(this, 'WordpressALB', /* all optional props */ {
      ipAddressType: 'ipv4',
      scheme: 'internet-facing',
      name: 'WordpressALB',
      securityGroups: [cdk.Fn.importValue('Application-ALB-SG-ID')],
      // securityGroups: ['sg-0d5f63e0de182b942'], 
      subnets: ['subnet-0f69a80fdb3d0ba9a', 'subnet-039838d8dfe0bc108'],
      type: 'application',
    
    });

  
    const cfnTargetGroup = new elbv2.CfnTargetGroup(this, 'MyCfnTargetGroup', /* all optional props */ {
      healthCheckEnabled: true,
     
      healthCheckPath: '/healthy.html',
      healthCheckPort: '80',
      healthCheckProtocol: 'HTTP',
      name: 'Wordpress-ALB-Target-Group',
      port: 80,
      protocol: 'HTTP',
      targetType: 'instance',
      vpcId: cdk.Fn.importValue('Application-VPC-ID'),
    });

    const cfnListener = new elbv2.CfnListener(this, 'MyCfnListener', {
      defaultActions: [{
        type: 'forward',        
        targetGroupArn: cfnTargetGroup.attrTargetGroupArn,
      }],
      loadBalancerArn: 'wordpressALB.attrLoadBalancerArn',
      port: 80,
      protocol: 'HTTP',
    });
    
    const cfnAutoScalingGroup = new autoscaling.CfnAutoScalingGroup(this, 'MyCfnAutoScalingGroup', {
      maxSize: '20',
      minSize: '2',
      autoScalingGroupName: 'Wordpress-ASG',
      desiredCapacity: '2',
      healthCheckType: 'EC2',
      launchTemplate: {
        version: ec2LaunchTemplate.attrLatestVersionNumber,
        launchTemplateId: ec2LaunchTemplate.attrLaunchTemplateId,
      },
      targetGroupArns: [cfnTargetGroup.attrTargetGroupArn],
      vpcZoneIdentifier: ['subnet-0f69a80fdb3d0ba9a', 'subnet-039838d8dfe0bc108'],
    })
    
    const cfnScalingPolicy = new autoscaling.CfnScalingPolicy(this, 'MyCfnScalingPolicy', {
      autoScalingGroupName: 'Wordpress-ASG',
      policyType: 'TargetTrackingScaling',
      targetTrackingConfiguration: {
        targetValue: 60,
        disableScaleIn: false,
        predefinedMetricSpecification: {
          predefinedMetricType: 'ASGAverageCPUUtilization',
        },
      },
    });
  }
}
