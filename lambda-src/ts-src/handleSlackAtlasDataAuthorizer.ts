import 'source-map-support/register';
import util from 'util';
import {APIGatewayAuthorizerResult, APIGatewayRequestAuthorizerEvent} from 'aws-lambda';
import {generatePolicy, validateToken} from './authorization';
import {getSecretValue} from './awsAPI';
import {JwtPayload} from 'jsonwebtoken';

export async function handleSlackAtlasDataAuthorizer(event: APIGatewayRequestAuthorizerEvent): Promise<APIGatewayAuthorizerResult> {
  try {
    // The jwks uri comes from the tenant and client id of the app registration for the back end/API.
    // It's this app registration that has issued and signed the JWT.
    const tenantId = await getSecretValue('OrgChartSync', 'tenantId');
    const backEndClientId = await getSecretValue('OrgChartSync', 'backEndClientId');
    const jwksUri = `https://login.microsoftonline.com/${tenantId}/discovery/keys?appid=${backEndClientId}`;
    // The AAD authorisation server
    const issuer = `https://login.microsoftonline.com/${tenantId}/v2.0`;
    // The audience is the target of the JWT - in this case the client ID of the app registration for the API.
    const audience = backEndClientId;

    if(event.headers) {
      // Seems to sometimes have uppercase A, sometimes not.
      let token = event.headers["authorization"]?.replace('Bearer ', '');
      if(!token) {
        token = event.headers["Authorization"]?.replace('Bearer ', '');
      }
      if(!token) {
        throw new Error("Missing Authorization header");
      }

      let effect: "Deny" | "Allow" = "Deny";
      const validToken = await validateToken(token, jwksUri, issuer, audience);
      if(validToken) {
        const roles = (validToken?.payload as JwtPayload)["roles"] as string[];
        // Check this token has the appropriate role for the http method
        switch(event.httpMethod) {
        case "POST":
        case "PATCH":
        case "DELETE": {
          effect = roles.find((role) => role === "SlackAtlasWriters") ? "Allow" : "Deny";
          break;
        }
        case "GET":{
          effect = roles.find((role) => role === "SlackAtlasReaders") ? "Allow" : "Deny";
          break;
        }
        default:
          break;
        }
      }
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
