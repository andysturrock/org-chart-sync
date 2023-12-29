import {SecretsManagerClient, GetSecretValueCommand, SecretsManagerClientConfig, GetSecretValueRequest, PutSecretValueCommand, PutSecretValueRequest} from "@aws-sdk/client-secrets-manager";
import util from 'util';

async function getSecrets(secretName: string) { 
  const configuration: SecretsManagerClientConfig = {
    region: 'eu-west-2'
  };
    
  const client = new SecretsManagerClient(configuration);
  const input: GetSecretValueRequest = {
    SecretId: secretName,
  };
  const command = new GetSecretValueCommand(input);
  const response = await client.send(command);
  
  if(!response.SecretString) {
    throw new Error(`Secret ${secretName} not found`);
  }
  
  type SecretValue = {
    [key: string]: string;
  };
  const secrets = JSON.parse(response.SecretString) as SecretValue;

  return secrets;
}
/**
 * Get a secret value from AWS Secrets Manager
 * @param secretName Name of the secrets
 * @param secretKey Key of the secret.  The secret is assumed to be stored as JSON text.
 * @returns The secret value as a string
 * @throws AccessDeniedException if the caller doesn't have access to that secret or Error if the secret or key don't exist
 */
export async function getSecretValue(secretName: string, secretKey: string) {

  const envSecret = process.env[secretKey];
  if(envSecret) {
    return envSecret;
  }

  const secrets = await getSecrets(secretName);

  const secret = secrets[secretKey];
  if(!secret) {
    throw new Error(`Secret key ${secretKey} not found`);
  }
  return secret;
}

/**
 * Stores a secret value in AWS Secrets Manager
 * @param secretName Name of the secrets
 * @param secretKey Key of the secret.  The secret is assumed to be stored as JSON text.
 * @returns The secret value as a string
 * @throws AccessDeniedException if the caller doesn't have access to that secret or Error if the secret doesn't exist
 */
export async function putSecretValue(secretName: string, secretKey: string, secretValue: string) {

  const secrets = await getSecrets(secretName);
  secrets[secretKey] = secretValue;

  const configuration: SecretsManagerClientConfig = {
    region: 'eu-west-2'
  };
    
  const client = new SecretsManagerClient(configuration);
  console.log(`putting: ${JSON.stringify(secrets)}`);
  const input: PutSecretValueRequest = {
    SecretId: secretName,
    SecretString: JSON.stringify(secrets)
  };
  const command = new PutSecretValueCommand(input);
  const result = await client.send(command);
  console.log(`result = ${util.inspect(result, false, 99)}`);
}