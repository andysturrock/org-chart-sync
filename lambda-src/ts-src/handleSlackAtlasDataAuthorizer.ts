import 'source-map-support/register';
import util from 'util';
import {APIGatewayAuthorizerResult, APIGatewayRequestAuthorizerEvent} from 'aws-lambda';
import {generatePolicy, validateToken} from './authorization';
import {getSecretValue} from './awsAPI';
import {JwtPayload} from 'jsonwebtoken';

// export async function handleSlackAtlasDataAuthorizer(event: APIGatewayTokenAuthorizerEvent): Promise<APIGatewayAuthorizerResult> {
export async function handleSlackAtlasDataAuthorizer(event: APIGatewayRequestAuthorizerEvent): Promise<APIGatewayAuthorizerResult> {
  try {
    console.log(`event: ${util.inspect(event, true, 99)}`);
    // The jwks uri comes from the tenant and client id of the app registration for the back end/API.
    // It's this app registration that has issued and signed the JWT.
    const tenantId = await getSecretValue('OrgChartSync', 'tenantId');
    const backEndClientId = await getSecretValue('OrgChartSync', 'backEndClientId');
    const jwksUri = `https://login.microsoftonline.com/${tenantId}/discovery/keys?appid=${backEndClientId}`;
    // The AAD authorisation server
    const issuer = `https://login.microsoftonline.com/${tenantId}/v2.0`;
    // The audience is the target of the JWT - in this case the client ID of the app registration for the API.
    const audience = backEndClientId;

    // const token = event.headers.authorizationToken.replace('Bearer ', '');
    if(event.headers) {
      const token = event.headers["Authorization"]?.replace('Bearer ', '');
      if(!token) {
        throw new Error("Missing Authorization header");
      }
      const validToken = await validateToken(token, jwksUri, issuer, audience);
      const scp = (validToken?.payload as JwtPayload)["scp"] as string;
      const scopes = scp.split(/ /);
      console.log(`scopes: ${util.inspect(scopes, true, 99)}`);
      console.log(`validToken: ${util.inspect(validToken, true, 99)}`);
      const effect = validToken ? "Allow" : "Deny";
      const policy = generatePolicy('user', effect, event.methodArn);

      console.log(`Returning policy: ${util.inspect(policy, true, 99)}`);

      return policy;
    }
    else {
      throw new Error("Missing event.headers");
      
    }
  }
  catch (error) {
    console.error(error);
    return generatePolicy('user', 'Deny', event.methodArn);
  }
}
