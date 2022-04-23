import * as servicecatalog from '@aws-cdk/aws-servicecatalog-alpha';
import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs/lib/construct';
import { envVars } from '../env-vars';
import { R53OutboundResolverRuleProduct } from './products/network/route53/route53-outbound-resolver-rule';
import { Route53ResolverProduct } from './products/network/route53/route53-resolver';

export interface IPortfolioStackProps extends cdk.StackProps {

}

export class PortfolioStack extends cdk.Stack {
  readonly portfolio: servicecatalog.IPortfolio;
  constructor(scope: Construct, id: string, props: IPortfolioStackProps) {
    super(scope, id, props);

    if (envVars.SC_PORTFOLIO_ARN != '') {
      this.portfolio = servicecatalog.Portfolio.fromPortfolioArn(this, 'ImportedNetworkPortfolio', envVars.SC_PORTFOLIO_ARN);
    } else {
      this.portfolio = new servicecatalog.Portfolio(this, envVars.SC_PORTFOLIO_NAME, {
        displayName: envVars.SC_PORTFOLIO_NAME ?? 'DemoPortfolio',
        providerName: 'Cloud Infra TF',
        description: 'CDK Network Reference Architecture',
        messageLanguage: servicecatalog.MessageLanguage.EN,
      });

      if ( envVars.SC_ACCESS_GROUP_NAME != '') {
        const group = iam.Group.fromGroupName(this, 'SCGroup', envVars.SC_ACCESS_GROUP_NAME);
        this.portfolio.giveAccessToGroup(group);
      }

      if ( envVars.SC_ACCESS_ROLE_ARN != '') {
        this.portfolio.giveAccessToRole(iam.Role.fromRoleArn(this, `${envVars.SC_PORTFOLIO_NAME}-Role`, envVars.SC_ACCESS_ROLE_ARN));
      } else {
        this.portfolio.giveAccessToRole(iam.Role.fromRoleArn(this, `${envVars.SC_PORTFOLIO_NAME}AdminRole`, `arn:aws:iam::${process.env.CDK_DEFAULT_ACCOUNT}:role/AssumableAdminRole`));
      }

      /* const stageTagOptions = new servicecatalog.TagOptions(this, 'StageTagOptions', {
        allowedValuesForTags: {
          stage: ['dev', 'qa', 'staging', 'prod'],
        },
      });
      this.portfolio.associateTagOptions(stageTagOptions);
 */
    }

    const devEnv = {
      account: process.env.CDK_DEFAULT_ACCOUNT,
      region: process.env.CDK_DEFAULT_REGION,
    };

    const product1 = new servicecatalog.CloudFormationProduct(this, 'Route53Resolver', {
      productName: 'route53-resolver',
      owner: 'AWSTF',
      description: 'Route53 Resolver Product',
      productVersions: [
        {
          productVersionName: 'v1',
          cloudFormationTemplate: servicecatalog.CloudFormationTemplate.fromProductStack(new Route53ResolverProduct(this, 'Route53ResolverProduct', {
            env: devEnv,
          })),
        },
      ],
    });

    this.portfolio.addProduct(product1);

    const product2 = new servicecatalog.CloudFormationProduct(this, 'R53OutboundResolverRule', {
      productName: 'route53-outbound-resolver-rule',
      owner: 'AWSTF',
      description: 'Route53 Outbound Resolver Rule Product',
      productVersions: [
        {
          productVersionName: 'v1',
          cloudFormationTemplate: servicecatalog.CloudFormationTemplate.fromProductStack(new R53OutboundResolverRuleProduct(this, 'Route53OutboundResolverRuleProduct', {
            env: devEnv,
          })),
        },
      ],
    });

    this.portfolio.addProduct(product2);

  }
}