import 'source-map-support/register';
import util from 'util';
import {APIGatewayAuthorizerResult, APIGatewayTokenAuthorizerEvent} from 'aws-lambda';
import {generatePolicy, validateToken} from './authorization';
import {getSecretValue} from './awsAPI';

export async function handleSlackAtlasDataAuthorizer(event: APIGatewayTokenAuthorizerEvent): Promise<APIGatewayAuthorizerResult> {
  try {
    // The jwks uri comes from the tenant and client id of the app registration for the back end/API.
    // It's this app registration that has issued and signed the JWT.
    const tenantId = await getSecretValue('OrgChartSync', 'tenantId');
    // const frontEndClientId = await getSecretValue('OrgChartSync', 'frontEndClientId');
    const backEndClientId = await getSecretValue('OrgChartSync', 'backEndClientId');
    const jwksUri = `https://login.microsoftonline.com/${tenantId}/discovery/keys?appid=${backEndClientId}`;
    // The AAD authorisation server
    const issuer = `https://login.microsoftonline.com/${tenantId}/v2.0`;
    // The audience is the target of the JWT - in this case the client ID of the app registration for the API.
    const audience = backEndClientId;

    const token = event.authorizationToken.replace('Bearer ', '');
    const validToken = await validateToken(token, jwksUri, issuer, audience);
    const effect = validToken ? "Allow" : "Deny";
    const policy = generatePolicy('user', effect, event.methodArn);

    console.log(`Returning policy: ${util.inspect(policy, true, 99)}`);

    return policy;
  }
  catch (error) {
    console.error(error);
    return generatePolicy('user', 'Deny', event.methodArn);
  }
}
