import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import { aws_autoscaling as autoscaling } from 'aws-cdk-lib';
import { aws_elasticloadbalancingv2 as elbv2 } from 'aws-cdk-lib';

export class WordpressAppStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Your user data script for WordPress
    const EC2UserData = `
      #!/bin/bash
      echo "Running custom user data script"
      amazon-linux-extras enable php7.4
      sudo yum install -y php php-cli php-fpm php-mysqlnd php-xml php-mbstring php-curl php-zip
      yum install httpd php-mysql -y
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

    // Launch Template
    const ec2LaunchTemplate = new ec2.CfnLaunchTemplate(this, 'EC2LaunchTemplate', {
      launchTemplateName: 'Wordpress-Launch-Template',
      versionDescription: '$Latest',
      launchTemplateData: {
        instanceType: 't2.micro',
        imageId: 'ami-0f214d1b3d031dc53',
        userData: cdk.Fn.base64(EC2UserData),
        securityGroupIds: [
          cdk.Fn.importValue('Application-EC2-SG-ID'), // Make sure the import value is correct
        ],
      },
    });

    // ALB
    const wordpressALB = new elbv2.CfnLoadBalancer(this, 'WordpressALB', {
      ipAddressType: 'ipv4',
      scheme: 'internet-facing',
      name: 'WordpressALB',
      securityGroups: [
        cdk.Fn.importValue('Application-ALB-SG-ID'), // Make sure the import value is correct
      ],
      subnets: [
        'subnet-0f69a80fdb3d0ba9a', // Must be valid
        'subnet-039838d8dfe0bc108', // Must be valid
      ],
      type: 'application',
    });

    // Target Group
    const cfnTargetGroup = new elbv2.CfnTargetGroup(this, 'MyCfnTargetGroup', {
      healthCheckEnabled: true,
      healthCheckPath: '/healthy.html',
      healthCheckPort: '80',
      healthCheckProtocol: 'HTTP',
      name: 'Wordpress-ALB-Target-Group',
      port: 80,
      protocol: 'HTTP',
      targetType: 'instance',
      vpcId: cdk.Fn.importValue('Application-VPC-ID'), // Must be valid
    });

    // Listener — note the corrected ARN reference
    const cfnListener = new elbv2.CfnListener(this, 'MyCfnListener', {
      defaultActions: [
        {
          type: 'forward',
          targetGroupArn: cfnTargetGroup.attrTargetGroupArn,
        },
      ],
      loadBalancerArn: wordpressALB.attrLoadBalancerArn, // <-- Use property reference
      port: 80,
      protocol: 'HTTP',
    });

    // Auto Scaling Group
    const cfnAutoScalingGroup = new autoscaling.CfnAutoScalingGroup(this, 'MyCfnAutoScalingGroup', {
      maxSize: '20',
      minSize: '2',
      // autoScalingGroupName: 'Wordpress-ASG', // Optional
      desiredCapacity: '2',
      healthCheckType: 'EC2',
      launchTemplate: {
        version: ec2LaunchTemplate.attrLatestVersionNumber,
        launchTemplateId: ec2LaunchTemplate.attrLaunchTemplateId,
      },
      targetGroupArns: [cfnTargetGroup.attrTargetGroupArn],
      vpcZoneIdentifier: [
        'subnet-0f69a80fdb3d0ba9a', // Must be valid
        'subnet-039838d8dfe0bc108'
      ],
    });

    // Scaling Policy — reference the ASG's 'ref' instead of a literal name
    const cfnScalingPolicy = new autoscaling.CfnScalingPolicy(this, 'MyCfnScalingPolicy', {
      autoScalingGroupName: cfnAutoScalingGroup.ref, // <-- do NOT hardcode "Wordpress-ASG"
      policyType: 'TargetTrackingScaling',
      targetTrackingConfiguration: {
        targetValue: 60,
        disableScaleIn: false,
        predefinedMetricSpecification: {
          predefinedMetricType: 'ASGAverageCPUUtilization',
        },
      },
    });

    // RDS
    const wordpressRDS = new rds.CfnDBInstance(this, "WordpressRDS", {
      dbInstanceIdentifier: "wordpress-db",
      engine: "mysql",
      dbInstanceClass: "db.t3.micro", 
      engineVersion: '8.0.40',
      allocatedStorage: "20", 
      masterUsername: "admin", 
      masterUserPassword: "Metro123456", 
      dbSubnetGroupName: cdk.Fn.importValue('Application-RDS-SUBNET-GROUP-Name'),
      vpcSecurityGroups:[cdk.Fn.importValue('Application-RDS-SG-ID')],
      publiclyAccessible: false,
      backupRetentionPeriod: 7,
      multiAz: false,
      dbName: "metrodb" 
    });
    new cdk.CfnOutput(this, "ALBDNSName", {
      value: wordpressALB.attrDnsName,
      exportName: "Wordpress-ALB-DNS",
    });
   
  }
}
