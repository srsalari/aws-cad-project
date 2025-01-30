import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import { aws_autoscaling as autoscaling } from 'aws-cdk-lib';
import { aws_elasticloadbalancingv2 as elbv2 } from 'aws-cdk-lib';

export class WordpressAppStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    /**
     * =====================
     *  1) RDS Instance
     * =====================
     * Creates a MySQL database instance in your private subnets.
     * - References the RDS subnet group & security group from the VPC stack.
     * - Exports the endpoint so your WordPress EC2 instances can connect.
     */
    const wordpressRDS = new rds.CfnDBInstance(this, 'WordpressRDS', {
      dbInstanceIdentifier: 'wordpress-db',
      engine: 'mysql',
      engineVersion: '8.0.40',
      dbInstanceClass: 'db.t3.micro',
      allocatedStorage: '20',
      masterUsername: 'admin',
      masterUserPassword: 'Metro123456',
      dbSubnetGroupName: cdk.Fn.importValue('Application-RDS-SUBNET-GROUP-NAME'),
      vpcSecurityGroups: [
        cdk.Fn.importValue('Application-RDS-SG-ID'),
      ],
      publiclyAccessible: false,
      backupRetentionPeriod: 7,
      multiAz: false,
      dbName: 'metrodb',
    });

    new cdk.CfnOutput(this, 'RDSInstanceEndpoint', {
      value: wordpressRDS.attrEndpointAddress,
    });

    /**
     * =====================
     *  2) Application Load Balancer (ALB)
     * =====================
     * Internet-facing ALB to serve incoming HTTP traffic.
     * - Uses subnets exported by the VPC stack (public subnets).
     * - Uses an ALB security group (imported) to allow inbound 80/443.
     */
    const wordpressALB = new elbv2.CfnLoadBalancer(this, 'WordpressALB', {
      ipAddressType: 'ipv4',
      scheme: 'internet-facing',
      name: 'Wordpress-ALB',
      securityGroups: [
        cdk.Fn.importValue('Application-ALB-SG-ID'),
      ],
      // Instead of hardcoding subnets, use the exported Public Subnet IDs
      subnets: [
        cdk.Fn.importValue('Public-Subnet1-ID'),
        cdk.Fn.importValue('Public-Subnet2-ID'),
      ],
      type: 'application',
    });

    new cdk.CfnOutput(this, 'ALBDNSName', {
      value: wordpressALB.attrDnsName,
      exportName: 'Wordpress-ALB-DNS',
    });

    /**
     * =====================
     *  3) ALB Target Group
     * =====================
     * Target group for forwarding traffic to EC2 instances on port 80.
     * Includes a health check path `/healthy.html`.
     */
    const cfnTargetGroup = new elbv2.CfnTargetGroup(this, 'MyCfnTargetGroup', {
      healthCheckEnabled: true,
      healthCheckPath: '/healthy.html',
      healthCheckPort: '80',
      healthCheckProtocol: 'HTTP',
      name: 'Wordpress-ALB-TG',
      port: 80,
      protocol: 'HTTP',
      targetType: 'instance',
      vpcId: cdk.Fn.importValue('Application-VPC-ID'),
    });

    /**
     * =====================
     *  4) ALB Listener
     * =====================
     * Creates an HTTP listener on port 80, forwarding to the target group above.
     */
    const cfnListener = new elbv2.CfnListener(this, 'MyCfnListener', {
      defaultActions: [
        {
          type: 'forward',
          targetGroupArn: cfnTargetGroup.attrTargetGroupArn,
        },
      ],
      loadBalancerArn: wordpressALB.attrLoadBalancerArn,
      port: 80,
      protocol: 'HTTP',
    });

    /**
     * =====================
     *  5) User Data Script
     * =====================
     * Installs Apache, PHP, and WordPress, then configures WordPress
     * using the RDS endpoint info. Places a `healthy.html` file for ALB checks.
     */
    const dbname = 'metrodb';
    const password = 'Metro123456';
    const username = 'admin';
    const hostname = wordpressRDS.attrEndpointAddress;

    const EC2UserData = `
      #!/bin/bash
      echo "Running custom user data script"
      amazon-linux-extras enable php7.4
      sudo yum install -y php php-cli php-fpm php-mysqlnd php-xml php-mbstring php-curl php-zip
      yum install httpd php-mysql -y
      yum update -y

      # Download & Install WordPress
      cd /var/www/html
      echo "healthy" > healthy.html
      wget https://wordpress.org/wordpress-6.7.1.tar.gz
      tar -xzf wordpress-6.7.1.tar.gz
      cp -r wordpress/* /var/www/html/
      rm -rf wordpress wordpress-6.7.1.tar.gz
      chmod -R 755 wp-content
      chown -R apache:apache wp-content

      # Configure WordPress Database
      mv wp-config-sample.php wp-config.php
      sed -i 's/database_name_here/${dbname}/g' wp-config.php
      sed -i 's/username_here/${username}/g' wp-config.php
      sed -i 's/password_here/${password}/g' wp-config.php
      sed -i 's/localhost/${hostname}/g' wp-config.php

      # Start Apache on boot
      service httpd start
      chkconfig httpd on
    `;

    /**
     * =====================
     *  6) Launch Template
     * =====================
     * A launch template referencing our user data, AMI, instance type,
     * and EC2 security group. The template is then used by the AutoScalingGroup.
     */
    const ec2LaunchTemplate = new ec2.CfnLaunchTemplate(this, 'EC2LaunchTemplate', {
      launchTemplateName: 'Wordpress-Launch-Template',
      versionDescription: 'v1',
      launchTemplateData: {
        instanceType: 't2.micro',
        // Example AMI for Amazon Linux 2 in a specific region
        // Replace with your region's latest ID or use SSM to fetch a dynamic ID
        imageId: 'ami-0d1e3f2707b2b8925',
        userData: cdk.Fn.base64(EC2UserData),
        securityGroupIds: [
          cdk.Fn.importValue('Application-EC2-SG-ID'),
        ],
      },
    });
    // Add a dependency so the RDS instance is created before the launch template (optional).
    ec2LaunchTemplate.node.addDependency(wordpressRDS);

    /**
     * =====================
     *  7) Auto Scaling Group
     * =====================
     * Creates an ASG that uses our launch template. It references private subnets,
     * associates with the target group, and sets min/max capacity.
     */
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
      // Use private subnets from the VPC
      vpcZoneIdentifier: [
        cdk.Fn.importValue('Private-Subnet1-ID'),
        cdk.Fn.importValue('Private-Subnet2-ID'),
      ],
    });

    /**
     * =====================
     *  8) Scaling Policy
     * =====================
     * A target-tracking scaling policy that adjusts capacity based on CPU usage.
     * Example threshold: 60% CPU average triggers scale-out.
     */
    const cfnScalingPolicy = new autoscaling.CfnScalingPolicy(this, 'MyCfnScalingPolicy', {
      autoScalingGroupName: cfnAutoScalingGroup.ref,
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
