import * as servicecatalog from '@aws-cdk/aws-servicecatalog-alpha';
import * as cdk from 'aws-cdk-lib';
//import * as ram from 'aws-cdk-lib/aws-ram';
import * as route53resolver from 'aws-cdk-lib/aws-route53resolver';
import { Construct } from 'constructs/lib/construct';

export interface Route53OutboundResolverRuleProps extends cdk.StackProps {

}

export class R53OutboundResolverRuleProduct extends servicecatalog.ProductStack {
  constructor(scope: Construct, id: string, props: Route53OutboundResolverRuleProps) {
    super(scope, id );

    console.log(props);

    /**
     * Metadata - Objects that provide additional information about the template
     */
    this.templateOptions.metadata = {
      'AWS::CloudFormation::Interface': {
        ParameterGroups: [
          {
            Label: {
              default: 'Network Configuration',
            },
            Parameters: [
              'VpcId',
              'ResolverEndpointId',
              'AccountIds',
            ],
          },
          {
            Label: {
              default: 'Outbound Endpoint Rule Configuration',
            },
            Parameters: [
              'DomainFQDN',
              'DomainTargetCount',
              'DomainTarget',
            ],
          },
        ],
      },
    };

    /**
     * Parameters - Values to pass to your template at runtime
     */
    const vpcId = new cdk.CfnParameter(this, 'VpcId', {
      type: 'AWS::EC2::VPC::Id',
      description: 'VPC ID that hosts resolver endpoints',
    });
    /* const accountIds = new cdk.CfnParameter(this, 'AccountIds', {
      type: 'CommaDelimitedList',
      description: 'List of account ids with which this rule will be shared',
    }); */

    const resolverEndpointId = new cdk.CfnParameter(this, 'ResolverEndpointId', {
      type: 'String',
      description: 'Outbound Resolver Endpoint ID',
    });

    const domainFQDN = new cdk.CfnParameter(this, 'DomainFQDN', {
      type: 'String',
      description: 'Provide FQDN for domain',
    });

    const domainTargetCount = new cdk.CfnParameter(this, 'DomainTargetCount', {
      type: 'String',
      description: 'count for number targets ip for the resolver rule',
      allowedValues: ['1', '2'],
    });

    const domainTargets = new cdk.CfnParameter(this, 'DomainTarget', {
      type: 'CommaDelimitedList',
      description: 'A comma separated list of IP:port targets (two targets) for example1.com domain resolution. Please change the default IPs as per your environment',
      default: '192.168.1.13:53,192.168.2.14.53',
    });

    const isCountOne = new cdk.CfnCondition(this, 'IsCountOne', {
      expression: cdk.Fn.conditionEquals(domainTargetCount, '1'),
    });
    const isCountTwo = new cdk.CfnCondition(this, 'IsCountTwo', {
      expression: cdk.Fn.conditionEquals(domainTargetCount, '2'),
    });

    // ToDo: List DomainLlist

    const domainRuleWithOneTargets = new route53resolver.CfnResolverRule(this, 'DomainRuleWithOneTarget', {
      domainName: domainFQDN.valueAsString,
      ruleType: 'FORWARD',
      // the properties below are optional
      //name: domainFQDN.valueAsString,
      resolverEndpointId: resolverEndpointId.valueAsString,
      targetIps: [{
        ip: cdk.Fn.select(0, cdk.Fn.split(':', cdk.Fn.select(0, domainTargets.valueAsList ))),
        port: cdk.Fn.select(1, cdk.Fn.split(':', cdk.Fn.select(0, domainTargets.valueAsList ))),
      }],
    });

    domainRuleWithOneTargets.cfnOptions.condition = isCountOne;

    const domainRuleWithTwoTargets = new route53resolver.CfnResolverRule(this, 'DomainRuleWithTwoTarget', {
      domainName: domainFQDN.valueAsString,
      ruleType: 'FORWARD',
      // the properties below are optional
      //name: domainFQDN.valueAsString,
      resolverEndpointId: resolverEndpointId.valueAsString,
      targetIps: [{
        ip: cdk.Fn.select(0, cdk.Fn.split(':', cdk.Fn.select(0, domainTargets.valueAsList ))),
        port: cdk.Fn.select(1, cdk.Fn.split(':', cdk.Fn.select(0, domainTargets.valueAsList ))),
      }, {
        ip: cdk.Fn.select(0, cdk.Fn.split(':', cdk.Fn.select(1, domainTargets.valueAsList ))),
        port: cdk.Fn.select(1, cdk.Fn.split(':', cdk.Fn.select(1, domainTargets.valueAsList ))),
      }],
    });

    domainRuleWithTwoTargets.cfnOptions.condition = isCountTwo;

    /*  const codeOne = cdk.Fn.conditionIf('IsCountOne', domainRuleWithOneTargets.attrArn, cdk.Aws.NO_VALUE );
    const codeTwo = cdk.Fn.conditionIf('IsCountTwo', domainRuleWithTwoTargets.attrArn, cdk.Aws.NO_VALUE ); */

    // Outbound Rule share Accounts
    /*  new ram.CfnResourceShare(this, 'MyCfnResourceShare', {
      name: `forward-${domainFQDN.valueAsString}`,
      // the properties below are optional
      allowExternalPrincipals: false,
      //permissionArns: ['permissionArns'],
      principals: accountIds.valueAsList,
      resourceArns: [
        cdk.Fn.conditionIf(isCountOne.logicalId, domainRuleWithOneTargets.attrArn, cdk.Aws.NO_VALUE ).toString(),
        cdk.Fn.conditionIf(isCountTwo.logicalId, domainRuleWithTwoTargets.attrArn, cdk.Aws.NO_VALUE ).toString(),
      ],
    }); */


    new route53resolver.CfnResolverRuleAssociation(this, 'MyCfnResolverRuleAssociation', {
      resolverRuleId: cdk.Fn.conditionIf(isCountOne.logicalId, domainRuleWithOneTargets.ref, domainRuleWithTwoTargets.ref ).toString(),
      vpcId: vpcId.valueAsString,
      // the properties below are optional
      name: 'route53-outbound-resolover-rule-association',
    });
  }
}