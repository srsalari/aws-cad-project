import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
// import * as ssm from 'aws-cdk-lib/aws-ssm'; // Uncomment if storing outputs in SSM

export class WordpressVpcStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    /**
     * 1) Create a new Virtual Private Cloud (VPC)
     *    - CIDR: 10.50.0.0/16
     *    - Includes Public and Private subnets across multiple AZs
     *    - Internet Gateway is created for public subnets
     */
    const customVpc = new ec2.Vpc(this, 'CustomVPC', {
      ipAddresses: ec2.IpAddresses.cidr('10.50.0.0/16'),
      createInternetGateway: true,
    });

    /**
     * 2) Output the VPC ID so that other stacks can import it.
     */
    new cdk.CfnOutput(this, 'CustomVPCIDOutput', {
      value: customVpc.vpcId,
      exportName: 'Application-VPC-ID',
    });

    /**
     * 3) Retrieve public & private subnets
     *    and export their IDs for referencing in other stacks.
     */
    const publicSubnets = customVpc.publicSubnets;
    const privateSubnets = customVpc.privateSubnets;

    // Public Subnet 1/2
    new cdk.CfnOutput(this, 'PublicSubnetID1Output', {
      value: publicSubnets[0].subnetId,
      exportName: 'Public-Subnet1-ID',
    });
    new cdk.CfnOutput(this, 'PublicSubnetID2Output', {
      value: publicSubnets[1].subnetId,
      exportName: 'Public-Subnet2-ID',
    });

    // Private Subnet 1/2
    new cdk.CfnOutput(this, 'PrivateSubnetID1Output', {
      value: privateSubnets[0].subnetId,
      exportName: 'Private-Subnet1-ID',
    });
    new cdk.CfnOutput(this, 'PrivateSubnetID2Output', {
      value: privateSubnets[1].subnetId,
      exportName: 'Private-Subnet2-ID',
    });

    /**
     * 4) Security Group for ALB
     *    - Allows inbound HTTP (80) & HTTPS (443) from anywhere (0.0.0.0/0).
     */
    const albSecurityGroup = new ec2.SecurityGroup(this, 'ALBSecurityGroup', {
      vpc: customVpc,
    });
    albSecurityGroup.addIngressRule(
      ec2.Peer.ipv4('0.0.0.0/0'),
      ec2.Port.tcp(80),
      'Allow HTTP from Internet'
    );
    albSecurityGroup.addIngressRule(
      ec2.Peer.ipv4('0.0.0.0/0'),
      ec2.Port.tcp(443),
      'Allow HTTPS from Internet'
    );

    new cdk.CfnOutput(this, 'ALBSGOutput', {
      value: albSecurityGroup.securityGroupId,
      exportName: 'Application-ALB-SG-ID',
    });

    /**
     * 5) Security Group for EC2 instances
     *    - Allows SSH (22) from anywhere (for demo), not recommended for production.
     *    - Allows inbound HTTP/HTTPS from the ALB SG.
     */
    const ec2SecurityGroup = new ec2.SecurityGroup(this, 'EC2SecurityGroup', {
      vpc: customVpc,
    });
    ec2SecurityGroup.addIngressRule(
      ec2.Peer.ipv4('0.0.0.0/0'),
      ec2.Port.tcp(22),
      'Allow SSH from Internet (Demo only!)'
    );
    ec2SecurityGroup.addIngressRule(
      albSecurityGroup,
      ec2.Port.tcp(80),
      'Allow inbound HTTP from ALB'
    );
    ec2SecurityGroup.addIngressRule(
      albSecurityGroup,
      ec2.Port.tcp(443),
      'Allow inbound HTTPS from ALB'
    );

    new cdk.CfnOutput(this, 'EC2SGOutput', {
      value: ec2SecurityGroup.securityGroupId,
      exportName: 'Application-EC2-SG-ID',
    });

    /**
     * 6) Security Group for RDS MySQL
     *    - Allows inbound traffic on port 3306 from the EC2 SG only.
     */
    const rdsSecurityGroup = new ec2.SecurityGroup(this, 'RDSSecurityGroup', {
      vpc: customVpc,
    });
    rdsSecurityGroup.addIngressRule(
      ec2SecurityGroup,
      ec2.Port.tcp(3306),
      'Allow MySQL from EC2 instances'
    );

    new cdk.CfnOutput(this, 'RDSSGOutput', {
      value: rdsSecurityGroup.securityGroupId,
      exportName: 'Application-RDS-SG-ID',
    });

    /**
     * 7) Create an RDS Subnet Group
     *    - This is required for placing your RDS instance in private subnets.
     */
    const rdsSubnetGroup = new rds.SubnetGroup(this, 'RDSSubnetGroup', {
      description: 'RDS SubnetGroup',
      vpc: customVpc,
      subnetGroupName: 'RDS-SUBNET-GROUP', // Optional custom name
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
    });

    new cdk.CfnOutput(this, 'RDSSubnetGroupOutput', {
      value: rdsSubnetGroup.subnetGroupName,
      exportName: 'Application-RDS-SUBNET-GROUP-NAME',
    });
  }
}
