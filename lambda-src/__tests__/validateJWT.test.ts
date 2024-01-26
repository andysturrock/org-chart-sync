import {validateToken} from "../ts-src/authorization";

describe("test validate function", () => {
  it("should return undefined for invalid token", async () => {

    const tenantId = "";
    const backEndClientId = "";
    const token = "";
    const jwksUri = `https://login.microsoftonline.com/${tenantId}/discovery/keys?appid=${backEndClientId}`;
    const issuer = `https://login.microsoftonline.com/${tenantId}/v2.0`;
    const audience = backEndClientId;
    const undefinedToken = await validateToken(token, jwksUri, issuer, audience);
    expect(undefinedToken).toBeUndefined();
  });
});
