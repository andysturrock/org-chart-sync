import 'source-map-support/register';
import {APIGatewayProxyEvent, APIGatewayProxyResult} from "aws-lambda";
import axios, {AxiosRequestConfig} from "axios";
import {getSecretValue, putSecretValue} from "./awsAPI";
import querystring from 'querystring';
import util from 'util';

export async function handleSlackAuthRedirect(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    type QueryStringParameters = {
      code: string,
      state: string // TODO use this to prevent CSRF attacks
    };

    const slackClientId = await getSecretValue("OrgChartSync", "slackClientId");
    const slackClientSecret = await getSecretValue('OrgChartSync', 'slackClientSecret');

    const queryStringParameters: QueryStringParameters = event.queryStringParameters as QueryStringParameters;
    if(!event.queryStringParameters) {
      throw new Error("Missing event queryStringParameters");
    }
    const code = queryStringParameters.code;

    const config: AxiosRequestConfig = {
      headers: { 
        "Content-Type": "application/x-www-form-urlencoded"
      }
    };
    const url = "https://slack.com/api/oauth.v2.access";
    const form = querystring.stringify({
      code,
      client_id: slackClientId,
      client_secret: slackClientSecret
    });

    type SlackResponse = {
      ok: boolean,
      app_id: string,
      authed_user: {
        id: string,
        access_token: string,
        refresh_token: string
      },
      scope: string,
      token_type: string,
      access_token: string,
      refresh_token: string,
      bot_user_id: string,
      team?: { id: string, name: string },
      enterprise?: { id: string, name: string },
      is_enterprise_install: boolean,
      error?: string
    };
    const {data} = await axios.post<SlackResponse>(url, form, config);
    console.log(`data: ${util.inspect(data, true, 99)}`);
    
    if(!data.ok) {
      throw new Error(`Failed to exchange token: ${data.error}`);
    }

    // Store the user refresh token in the Secret Manager
    await putSecretValue("OrgChartSync", "slackRefreshToken", data.authed_user.refresh_token);

    let successText = `Successfully installed OrgChartSync in workspace`;
    if(data.team?.name) {
      successText = `Successfully installed OrgChartSync in workspace ${data.team.name}`;
    }
    else if(data.enterprise?.name) {
      successText = `Successfully installed OrgChartSync in organisation ${data.enterprise.name}`;
    } 

    const html = `
<!DOCTYPE html>
<html>
<body>

<h1>Installation Success</h1>
<p>${successText}</p>

</body>
</html>
    `;

    const result: APIGatewayProxyResult = {
      body: html,
      statusCode: 200,
      headers: {
        'Content-Type': 'text/html',
      }
    };
    return result;
  }
  catch (error) {
    console.error(error);
    const html = `
<!DOCTYPE html>
<html>
<body>

<h1>Installation Failure</h1>
<p>There was an error.  Please check the logs.</p>

</body>
</html>
    `;

    const result: APIGatewayProxyResult = {
      body: html,
      statusCode: 200,
      headers: {
        'Content-Type': 'text/html',
      }
    };
    return result;
  }
}

