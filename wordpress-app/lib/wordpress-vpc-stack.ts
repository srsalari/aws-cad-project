import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as rds from 'aws-cdk-lib/aws-rds';



export class WordpressVpcStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // The code that defines your stack goes here

    // example resource
    // const queue = new sqs.Queue(this, 'WordpressAppQueue', {
    //   visibilityTimeout: cdk.Duration.seconds(300)
    // });

    //VPC with SSM Param

    const customVpc = new ec2.Vpc(this, 'CustomVPC', {
      ipAddresses: ec2.IpAddresses.cidr('10.50.0.0/16'),
      createInternetGateway: true,
    });

    
    // const ssmVPC = new ssm.StringParameter(this, 'vpcSsmParameter', {
    //   parameterName: '/AWS/CAD/VPC/ID',
    //   stringValue: customVpc.vpcId,
    // });


    //SG-ALB with SSM Param

    const albSecurityGroup = new ec2.SecurityGroup(this, 'ALBSecurityGroup', { 
      vpc: customVpc
    });

    albSecurityGroup.addIngressRule(
      ec2.Peer.ipv4("0.0.0.0/0"),
      ec2.Port.tcp(80)
    )

    albSecurityGroup.addIngressRule(
      ec2.Peer.ipv4("0.0.0.0/0"),
      ec2.Port.tcp(443)
    )
    
    // const ssmALBSG = new ssm.StringParameter(this, 'albSGSsmParameter', {
    //   parameterName: '/AWS/CAD/ALB/SG/ID',
    //   stringValue: albSecurityGroup.securityGroupId,
    // });
    
    //SG-EC2 with SSM Param
    const ec2SecurityGroup = new ec2.SecurityGroup(this, 'EC2SecurityGroup', { 
      vpc: customVpc
    });

    ec2SecurityGroup.addIngressRule(
      ec2.Peer.ipv4("0.0.0.0/0"),
      ec2.Port.tcp(22)
    )

    ec2SecurityGroup.addIngressRule(
      albSecurityGroup,
      ec2.Port.tcp(80)
    )

    ec2SecurityGroup.addIngressRule(
      albSecurityGroup,
      ec2.Port.tcp(443)
    )

    // const ssmEC2SG = new ssm.StringParameter(this, 'ec2SGSsmParameter', {
    //   parameterName: '/AWS/CAD/EC2/SG/ID',
    //   stringValue: ec2SecurityGroup.securityGroupId,
    // });

    //SG-RDS with SSM Param

    const rdsSecurityGroup = new ec2.SecurityGroup(this, 'RDSSecurityGroup', { 
      vpc: customVpc
    });

    rdsSecurityGroup.addIngressRule(
      ec2SecurityGroup,
      ec2.Port.tcp(3306)
    )

    // const ssmRDSSG = new ssm.StringParameter(this, 'RDSSGSsmParameter', {
    //   parameterName: '/AWS/CAD/RDS/SG/ID',
    //   stringValue: rdsSecurityGroup.securityGroupId,
    // });


    //RDS-Subnet-Group with SSM Param

    const rdsSubnetGroup = new rds.SubnetGroup(this, 'RDSSubnetGroup', {
      description: 'RDS SubnetGroup',
      vpc: customVpc,
    
      // the properties below are optional
      subnetGroupName: 'RDS-SUBNET-GROUP',
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
    });

    // const ssmRDSSubnetGroup = new ssm.StringParameter(this, 'RDSSubnetGroupSsmParameter', {
    //   parameterName: '/AWS/CAD/RDS/SUBNET/GROUP',
    //   stringValue: rdsSubnetGroup.subnetGroupName,
    // });

  }
}