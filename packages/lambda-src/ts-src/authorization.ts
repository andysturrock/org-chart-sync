import 'source-map-support/register';
import {APIGatewayAuthorizerResult, PolicyDocument, Statement} from 'aws-lambda';
import {JwksClient} from 'jwks-rsa';
import {verify, decode, VerifyOptions, Algorithm, JwtHeader, Jwt} from 'jsonwebtoken';

/**
 * Validate a JWT token contained in an APIGatewayTokenAuthorizerEvent.
 * @param event the event containing the token
 * @returns decoded token payload if valid, undefined otherwise.
 */
export async function validateToken(token: string, jwksUri: string, issuer: string, audience: string) {
  try {
    // Get the signing key from the AAD jwks endpoint.
    const decodedToken = decode(token, {complete: true});
    // MS JWT headers have a nonce field in them
    type AadJwtHeader = (JwtHeader & {nonce: string});
    const header: AadJwtHeader = decodedToken?.header as AadJwtHeader;
    const client = new JwksClient({
      jwksUri
    });
    const signingKey = await client.getSigningKey(decodedToken?.header.kid);
    const publicKey = signingKey.getPublicKey();

    const algorithm: Algorithm = decodedToken?.header.alg as Algorithm;
    const verifyOptions: VerifyOptions = {
      algorithms: [algorithm],
      nonce: header.nonce,
      issuer,
      // Client ID of back-end app registration
      audience,
      complete: true
    };
    const verifiedToken = verify(token, publicKey, verifyOptions) as Jwt;

    return verifiedToken;
  } catch (error) {
    console.error(error);
    return undefined;
  }
}

/**
 * Create a AuthResponse policy to be used as the return value of an APIGateway authorizer lambda.
 * @param principalId The Principal for the policy
 * @param effect Should be one of 'Allow' or 'Deny'
 * @param resource The resource or resources the policy should apply to.  Will probably be the API method ARN.
 * @returns 
 */
export function generatePolicy(principalId: string, effect: 'Allow' | 'Deny', resource: string | string[]): APIGatewayAuthorizerResult {
  const policyDocument: PolicyDocument = {
    Version: '',
    Statement: []
  };
  const apiGatewayAuthorizerResult: APIGatewayAuthorizerResult = {
    principalId: '',
    policyDocument
  };

  apiGatewayAuthorizerResult.principalId = principalId;
  if((effect.length > 0) && (Boolean(resource))) {
    policyDocument.Version = '2012-10-17';
    policyDocument.Statement = [];
    const statement: Statement = {
      Action: 'execute-api:Invoke',
      Effect: effect,
      Resource: resource
    };
    statement.Action = 'execute-api:Invoke';
    statement.Effect = effect;
    statement.Resource = resource;
    policyDocument.Statement[0] = statement;
    apiGatewayAuthorizerResult.policyDocument = policyDocument;
  }

  return apiGatewayAuthorizerResult;
}

