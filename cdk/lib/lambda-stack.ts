import {Duration, Stack} from 'aws-cdk-lib';
import {Construct} from 'constructs';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as targets from 'aws-cdk-lib/aws-route53-targets';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as logs from 'aws-cdk-lib/aws-logs';
import {LambdaStackProps} from './common';
import {Rule, Schedule} from 'aws-cdk-lib/aws-events';
import {LambdaFunction} from 'aws-cdk-lib/aws-events-targets';

export class LambdaStack extends Stack {
  constructor(scope: Construct, id: string, props: LambdaStackProps) {
    super(scope, id, props);

    // Semantic versioning has dots as separators but this is invalid in a URL
    // so replace the dots with underscores first.
    const lambdaVersionIdForURL = props.lambdaVersion.replace(/\./g, '_');
    const accessControlAllowOrigin = '*'; // `https://${props.orgChartSyncDomainName}`;

    // Common props for all lambdas, so define them once here.
    const allLambdaProps = {
      environment: {
        NODE_OPTIONS: '--enable-source-maps',
      },
      logRetention: logs.RetentionDays.THREE_DAYS,
      runtime: lambda.Runtime.NODEJS_20_X,
      timeout: Duration.seconds(30),
    };

    // The lambda for rotating the Slack refresh token.
    const rotateSlackRefreshTokenLambda = new lambda.Function(this, "rotateSlackRefreshTokenLambda", {
      handler: "rotateSlackRefreshToken.rotateSlackRefreshToken",
      functionName: 'OrgChartSync-rotateSlackRefreshToken',
      code: lambda.Code.fromAsset("../lambda-src/dist/rotateSlackRefreshToken"),
      ...allLambdaProps
    });
    // Allow read/write access to the secret it needs
    props.orgChartSyncSecret.grantRead(rotateSlackRefreshTokenLambda);
    props.orgChartSyncSecret.grantWrite(rotateSlackRefreshTokenLambda);
    // Schedule it to run every 2 hours.
    // The tokens last 12 hours but more secure to rotate more often.
    new Rule(this, 'Rule', {
      description: "Schedule the OrgChartSync-rotateSlackRefreshToken lambda every 2 hours",
      schedule: Schedule.rate(Duration.hours(2)),
      targets: [new LambdaFunction(rotateSlackRefreshTokenLambda)],
    });

    // The lambda for handling the callback for the Slack install
    const handleSlackAuthRedirectLambda = new lambda.Function(this, "handleSlackAuthRedirectLambda", {
      handler: "handleSlackAuthRedirect.handleSlackAuthRedirect",
      functionName: 'OrgChartSync-handleSlackAuthRedirect',
      code: lambda.Code.fromAsset("../lambda-src/dist/handleSlackAuthRedirect"),
      ...allLambdaProps
    });
    // Allow read/write access to the secret it needs
    props.orgChartSyncSecret.grantRead(handleSlackAuthRedirectLambda);
    props.orgChartSyncSecret.grantWrite(handleSlackAuthRedirectLambda);

    // The lambda for GETting the Slack Atlas data
    const handleGetSlackAtlasDataLambda = new lambda.Function(this, "handleGetSlackAtlasDataLambda", {
      handler: "handleGetSlackAtlasData.handleGetSlackAtlasData",
      functionName: 'OrgChartSync-handleGetSlackAtlasData',
      code: lambda.Code.fromAsset("../lambda-src/dist/handleGetSlackAtlasData"),
      ...allLambdaProps
    });
    // Allow read/write access to the secret it needs
    props.orgChartSyncSecret.grantRead(handleGetSlackAtlasDataLambda);
    props.orgChartSyncSecret.grantWrite(handleGetSlackAtlasDataLambda);

    // The lambda for POSTing the Slack Atlas data
    const handlePostSlackAtlasDataLambda = new lambda.Function(this, "handlePostSlackAtlasDataLambda", {
      handler: "handlePostSlackAtlasData.handlePostSlackAtlasData",
      functionName: 'OrgChartSync-handlePostSlackAtlasData',
      code: lambda.Code.fromAsset("../lambda-src/dist/handlePostSlackAtlasData"),
      ...allLambdaProps
    });
    // Allow read/write access to the secret it needs
    props.orgChartSyncSecret.grantRead(handlePostSlackAtlasDataLambda);
    props.orgChartSyncSecret.grantWrite(handlePostSlackAtlasDataLambda);

    // The lambda for PATCHing the Slack Atlas data
    const handlePatchSlackAtlasDataLambda = new lambda.Function(this, "handlePatchSlackAtlasDataLambda", {
      handler: "handlePatchSlackAtlasData.handlePatchSlackAtlasData",
      functionName: 'OrgChartSync-handlePatchSlackAtlasData',
      code: lambda.Code.fromAsset("../lambda-src/dist/handlePatchSlackAtlasData"),
      ...allLambdaProps
    });
    // Allow read/write access to the secret it needs
    props.orgChartSyncSecret.grantRead(handlePatchSlackAtlasDataLambda);
    props.orgChartSyncSecret.grantWrite(handlePatchSlackAtlasDataLambda);

    // The lambda which acts as an authorizer for the Slack Atlas Data lambdas
    const handleSlackAtlasDataAuthorizerLambda = new lambda.Function(this, "handleSlackAtlasDataAuthorizerLambda", {
      handler: "handleSlackAtlasDataAuthorizer.handleSlackAtlasDataAuthorizer",
      functionName: 'OrgChartSync-handleSlackAtlasDataAuthorizer',
      code: lambda.Code.fromAsset("../lambda-src/dist/handleSlackAtlasDataAuthorizer"),
      ...allLambdaProps
    });
    // Allow read access to the secret it needs
    props.orgChartSyncSecret.grantRead(handleSlackAtlasDataAuthorizerLambda);

    // Add the lambda as a token authorizer to the API Gateway
    // const handleSlackAtlasDataAuthorizer = new apigateway.TokenAuthorizer(this, 'handleSlackAtlasDataAuthorizer', {
    //   handler: handleSlackAtlasDataAuthorizerLambda,
    //   authorizerName: 'handleSlackAtlasDataAuthorizer',
    //   resultsCacheTtl: Duration.seconds(0)
    // });
    const handleSlackAtlasDataAuthorizer = new apigateway.RequestAuthorizer(this, 'handleSlackAtlasDataAuthorizer', {
      handler: handleSlackAtlasDataAuthorizerLambda,
      authorizerName: 'handleSlackAtlasDataAuthorizer',
      resultsCacheTtl: Duration.seconds(0),
      identitySources: ["method.request.header.Authorization"]
    });

    // Get hold of the hosted zone which has previously been created
    const zone = route53.HostedZone.fromHostedZoneAttributes(this, 'R53Zone', {
      zoneName: props.customDomainName,
      hostedZoneId: props.route53ZoneId,
    });

    // Create the cert for the gateway.
    // Usefully, this writes the DNS Validation CNAME records to the R53 zone,
    // which is great as normal Cloudformation doesn't do that.
    const acmCertificateForCustomDomain = new acm.DnsValidatedCertificate(this, 'CustomDomainCertificate', {
      domainName: props.orgChartSyncDomainName,
      hostedZone: zone,
      validation: acm.CertificateValidation.fromDns(zone),
    });

    // Create the custom domain
    const customDomain = new apigateway.DomainName(this, 'CustomDomainName', {
      domainName: props.orgChartSyncDomainName,
      certificate: acmCertificateForCustomDomain,
      endpointType: apigateway.EndpointType.REGIONAL,
      securityPolicy: apigateway.SecurityPolicy.TLS_1_2
    });

    // This is the API Gateway which then calls the initial response and auth redirect lambdas
    const api = new apigateway.RestApi(this, "APIGateway", {
      restApiName: "OrgChartSync",
      description: "Service for Org Chart Sync Tool.",
      deploy: false // create the deployment below
    });

    // By default CDK creates a deployment and a "prod" stage.  That means the URL is something like
    // https://2z2ockh6g5.execute-api.eu-west-2.amazonaws.com/prod/
    // We want to create the stage to match the version id.
    const apiGatewayDeployment = new apigateway.Deployment(this, 'ApiGatewayDeployment', {
      api: api,
    });
    const stage = new apigateway.Stage(this, 'Stage', {
      deployment: apiGatewayDeployment,
      loggingLevel: apigateway.MethodLoggingLevel.INFO,
      dataTraceEnabled: true,
      stageName: lambdaVersionIdForURL
    });

    // Connect the API Gateway to the lambdas
    const handleSlackAuthRedirectLambdaIntegration = new apigateway.LambdaIntegration(handleSlackAuthRedirectLambda, {
      requestTemplates: {"application/json": '{ "statusCode": "200" }'}
    });
    const handleGetSlackAtlasDataLambdaIntegration = new apigateway.LambdaIntegration(handleGetSlackAtlasDataLambda, {
      requestTemplates: {"application/json": '{ "statusCode": "200" }'}
    });
    const handlePostSlackAtlasDataLambdaIntegration = new apigateway.LambdaIntegration(handlePostSlackAtlasDataLambda, {
      requestTemplates: {"application/json": '{ "statusCode": "200" }'}
    });
    const handlePatchSlackAtlasDataLambdaIntegration = new apigateway.LambdaIntegration(handlePatchSlackAtlasDataLambda, {
      requestTemplates: {"application/json": '{ "statusCode": "200" }'}
    });
    const handleSlackAuthRedirectResource = api.root.addResource('slack-oauth-redirect');
    const handleSlackAtlasDataResource = api.root.addResource('slack-atlas-data');
    // And add the methods.
    handleSlackAuthRedirectResource.addMethod("GET", handleSlackAuthRedirectLambdaIntegration);
    handleSlackAtlasDataResource.addMethod("GET", handleGetSlackAtlasDataLambdaIntegration, {
      authorizer: handleSlackAtlasDataAuthorizer
    });
    handleSlackAtlasDataResource.addMethod("POST", handlePostSlackAtlasDataLambdaIntegration, {
      authorizer: handleSlackAtlasDataAuthorizer
    });
    handleSlackAtlasDataResource.addMethod("PATCH", handlePatchSlackAtlasDataLambdaIntegration, {
      authorizer: handleSlackAtlasDataAuthorizer
    });

    // Add an OPTIONS mock integration which returns the CORS headers.
    const corsOptions: apigateway.CorsOptions = {
      allowOrigins: [accessControlAllowOrigin],
      allowHeaders: apigateway.Cors.DEFAULT_HEADERS,
      allowMethods: apigateway.Cors.ALL_METHODS, //['OPTIONS', 'GET', 'POST']
    };
    handleSlackAtlasDataResource.addCorsPreflight(corsOptions);

    // Add a CORS header for when the authorizer declines the request.
    // Otherwise the web client gets a CORS error rather than the 403.
    new apigateway.GatewayResponse(this, 'GatewayResponse', {
      restApi: api,
      type: apigateway.ResponseType.DEFAULT_4XX,
      responseHeaders: {
        // Mappings here have to be wrapped in single quotes.
        "Access-Control-Allow-Origin" : `'${accessControlAllowOrigin}'`,
        "Access-Control-Allow-Headers" : `'${apigateway.Cors.DEFAULT_HEADERS.join(' ')}'`,
        "Access-Control-Allow-Methods" : `'${apigateway.Cors.ALL_METHODS.join(' ')}'`
      },
      statusCode: "418"
    });

    // Create the R53 "A" record to map from the custom domain to the actual API URL
    new route53.ARecord(this, 'CustomDomainAliasRecord', {
      recordName: props.orgChartSyncDomainName,
      zone: zone,
      target: route53.RecordTarget.fromAlias(new targets.ApiGatewayDomain(customDomain))
    });
    // And path mapping to the API
    customDomain.addBasePathMapping(api, {basePath: `${lambdaVersionIdForURL}`, stage: stage});
  }
}
