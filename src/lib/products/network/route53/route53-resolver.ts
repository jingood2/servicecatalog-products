import * as servicecatalog from '@aws-cdk/aws-servicecatalog-alpha';
import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as r53Resolver from 'aws-cdk-lib/aws-route53resolver';
import { Construct } from 'constructs/lib/construct';

export interface Route53ResolverProps extends cdk.StackProps {

}

export class Route53ResolverProduct extends servicecatalog.ProductStack {
  constructor(scope: Construct, id: string, props: Route53ResolverProps) {
    super(scope, id );

    console.log(props);

    const vpcId = new cdk.CfnParameter(this, 'VpcId', {
      type: 'AWS::EC2::VPC::Id',
      description: 'VPC ID that hosts resolver endpoints',
    });

    const endpointSubnetA = new cdk.CfnParameter(this, 'EndpointSubnetA', {
      type: 'AWS::EC2::Subnet::Id',
      description: 'Chose the private subnet for route53 resolver endpoint',
    });

    const endpointSubnetB = new cdk.CfnParameter(this, 'EndpointSubnetB', {
      type: 'AWS::EC2::Subnet::Id',
      description: 'Chose the private subnet for route53 resolver endpoint',
    });

    const endpointCidr = new cdk.CfnParameter(this, 'EndpointSubnetId', {
      type: 'String',
      description: 'Provide the CIDRs of resources in on-prem that will be accessed from AWS via outbound endpoint or CIDR of resources in on-prem accessing AWS Private Hosted Zones via inbound endpoints',
    });

    const endpointType = new cdk.CfnParameter(this, 'EndpointType', {
      type: 'String',
      description: 'Endpoint Type - Inbound or Outbound',
      default: 'INBOUND',
      allowedValues: ['INBOUND', 'OUTBOUND'],
    });

    const createOutboundEndpoint = new cdk.CfnCondition(this, 'CreateOutboundEndpoint', {
      expression: cdk.Fn.conditionEquals(endpointType, 'OUTBOUND'),
    });
    const createInboundEndpoint = new cdk.CfnCondition(this, 'CreateInboundEndpoint', {
      expression: cdk.Fn.conditionEquals(endpointType, 'INBOUND'),
    });

    const resolverSgName = cdk.Fn.conditionIf(createOutboundEndpoint.logicalId, 'outbound-resolver-endpoint-sg', 'inbound-resolver-endpoint-sg');

    const inboundSecurityGroup = new ec2.CfnSecurityGroup(this, 'ResolverInboundSecurityGroup', {
      vpcId: vpcId.valueAsString,
      groupDescription: 'Security group controlling Route53 Endpoint access',
      groupName: resolverSgName.toString(),
      securityGroupIngress: [
        {
          ipProtocol: 'tcp',
          cidrIp: endpointCidr.valueAsString,
          fromPort: 53,
          toPort: 53,
        },
        {
          ipProtocol: 'udp',
          cidrIp: endpointCidr.valueAsString,
          fromPort: 53,
          toPort: 53,
        },
      ],
      /* securityGroupIngress: cdk.Fn.conditionIf(createInboundEndpoint.logicalId,
        [{
          ipProtocol: 'tcp',
          cidrIp: endpointCidr.valueAsString,
          fromPort: 53,
          toPort: 53,
        },
        {
          ipProtocol: 'udp',
          cidrIp: endpointCidr.valueAsString,
          fromPort: 53,
          toPort: 53,
        }], cdk.Aws.NO_VALUE ), */
    });

    inboundSecurityGroup.cfnOptions.condition = createInboundEndpoint;


    const outboundSecurityGroup = new ec2.CfnSecurityGroup(this, 'ResolverOutboundSecurityGroup', {
      vpcId: vpcId.valueAsString,
      groupDescription: 'Security group controlling Route53 Endpoint access',
      groupName: resolverSgName.toString(),
      securityGroupEgress: [
        {
          ipProtocol: 'tcp',
          cidrIp: endpointCidr.valueAsString,
          fromPort: 53,
          toPort: 53,
        },
        {
          ipProtocol: 'udp',
          cidrIp: endpointCidr.valueAsString,
          fromPort: 0,
          toPort: 53,
        },
      ],
    });

    outboundSecurityGroup.cfnOptions.condition = createOutboundEndpoint;

    const resolverInboundEndpoint = new r53Resolver.CfnResolverEndpoint(this, 'ResolverInboundEndpoint', {
      direction: endpointType.valueAsString,
      ipAddresses: [{ subnetId: endpointSubnetA.valueAsString }, { subnetId: endpointSubnetB.valueAsString }],
      securityGroupIds: [inboundSecurityGroup.attrGroupId],
      name: 'route53-resolver-inbound-endpoint',
    });
    resolverInboundEndpoint.cfnOptions.condition = createInboundEndpoint;

    const resolverOutboundEndpoint = new r53Resolver.CfnResolverEndpoint(this, 'ResolverOutboundEndpoint', {
      direction: endpointType.valueAsString,
      ipAddresses: [{ subnetId: endpointSubnetA.valueAsString }, { subnetId: endpointSubnetB.valueAsString }],
      securityGroupIds: [outboundSecurityGroup.attrGroupId],
      name: 'route53-resolver-outbound-endpoint',
    });
    resolverOutboundEndpoint.cfnOptions.condition = createOutboundEndpoint;

    new cdk.CfnOutput(this, 'ResolverInboundEndpointId', {
      condition: createInboundEndpoint,
      value: resolverInboundEndpoint.attrArn,
      description: 'Route53 Resolver Inbound Endpoint ID',
    });

    new cdk.CfnOutput(this, 'ResolverOutboundEndpointId', {
      condition: createOutboundEndpoint,
      value: resolverOutboundEndpoint.attrArn,
      description: 'Route53 Resolver Outbound Endpoint ID',
    });
  }
}