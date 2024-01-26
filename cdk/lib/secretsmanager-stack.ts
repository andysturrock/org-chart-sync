import {Stack} from 'aws-cdk-lib';
import {Construct} from 'constructs';
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import {SecretsManagerStackProps} from './common';

export class SecretsManagerStack extends Stack {
  public readonly orgChartSyncSecret: secretsmanager.ISecret;

  constructor(scope: Construct, id: string, props: SecretsManagerStackProps) {
    super(scope, id, props);

    // Just get a reference to the secret by name
    this.orgChartSyncSecret = secretsmanager.Secret.fromSecretNameV2(this, 'orgChartSyncSecret', "OrgChartSync");

    // Create exports from the CF template so that CF knows that other stacks depend on this stack.
    this.exportValue(this.orgChartSyncSecret.secretArn, {name: 'orgChartSyncSecret'});
  }
}
