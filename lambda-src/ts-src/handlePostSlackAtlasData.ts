import 'source-map-support/register';
import * as util from 'util';
import {APIGatewayProxyEvent, APIGatewayProxyResult} from "aws-lambda";
import {getSecretValue} from './awsAPI';

type PostSlackAtlasUser = {
  firstName: string,
  lastName: string,
  title: string,
  email: string,
  managerId: string | undefined | null
};

/**
 * Handle the request for POST to Slack Atlas
 * @param event the event from the API requesting the data
 * @returns HTTP 200 with body containing the body of the call to Slack Atlas SCIM API.
 */
export async function handlePostSlackAtlasData(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    console.log(`event: ${util.inspect(event, true, 99)}`);
    if(!event.body) {
      throw new Error("Missing event body");
    }
    const postSlackAtlasUser: PostSlackAtlasUser = JSON.parse(event.body) as PostSlackAtlasUser;
    // TODO there is a better way to do this using keyof and a loop
    if(!postSlackAtlasUser.firstName) {
      throw new Error("Missing firstName property");
    }
    if(!postSlackAtlasUser.lastName) {
      throw new Error("Missing lastName property");
    }
    if(!postSlackAtlasUser.title) {
      throw new Error("Missing title property");
    }
    if(!postSlackAtlasUser.email) {
      throw new Error("Missing email property");
    }
    if(!postSlackAtlasUser.managerId) {
      postSlackAtlasUser.managerId = null;
    }

    // Slack requires users to have unique usernames and email addresses.
    // So edit the Slack email to be in form of bob+slackprofile@example.com
    // Remove any +slackprofile bit first if it's there so we don't end up twice.
    let profileEmail = postSlackAtlasUser.email.replace('+slackprofile@', '@');
    profileEmail = postSlackAtlasUser.email.replace('@', '+slackprofile@');
    // The username we append .profile-only.  We do this so that if we ever want to create
    // a proper Slack user for this profile user, we won't get a username or email clash.
    // Slack usernames must be 21 chars or under.
    let profileUserName = `${postSlackAtlasUser.firstName.substring(0,1)}.` +
      `${postSlackAtlasUser.lastName.substring(0,6)}.profile-only`;
    profileUserName = profileUserName.toLowerCase();
    const postUsersRequest = {
      schemas: [
        "urn:ietf:params:scim:schemas:core:2.0:User",
        "urn:ietf:params:scim:schemas:extension:enterprise:2.0:User"
      ],
      userName: profileUserName,
      name: {
        familyName: postSlackAtlasUser.lastName,
        givenName: postSlackAtlasUser.firstName,
      },
      displayName: `${postSlackAtlasUser.firstName} ${postSlackAtlasUser.lastName}`,
      emails: [
        {
          value: profileEmail,
          type: "work",
          primary: true
        }
      ],
      userType: "[[profile-only]]",
      title: postSlackAtlasUser.title,
      active: true,
      "urn:ietf:params:scim:schemas:extension:enterprise:2.0:User": {
        manager: {
          managerId: postSlackAtlasUser.managerId
        }
      }
    };

    const accessControlAllowOrigin = await getSecretValue('OrgChartSync', 'Access-Control-Allow-Origin');
    
    const result: APIGatewayProxyResult = {
      headers: {
        "Access-Control-Allow-Origin" : accessControlAllowOrigin,
        "Access-Control-Allow-Credentials" : true
      },
      body: JSON.stringify(postUsersRequest),
      statusCode: 200
    };

    console.log(`Returning ${util.inspect(result, true, 99)}`);

    return result;
  }
  catch (error) {
    console.error(error);

    const json = {
      error: JSON.stringify(util.inspect(error))
    };

    const result: APIGatewayProxyResult = {
      headers: {
        "Access-Control-Allow-Origin" : "*",  // OK to allow any origin to get the error message
        "Access-Control-Allow-Credentials" : true
      },
      body: JSON.stringify(json),
      statusCode: 500
    };
    return result;
  }
}
