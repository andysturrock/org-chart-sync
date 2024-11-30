/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */ 

/*
 * TODO Rename this file to config.ts and add your config below.
 */

import { LogLevel } from "@azure/msal-browser";

/**
 * Configuration object to be passed to MSAL instance on creation. 
 * For a full list of MSAL.js configuration parameters, visit:
 * https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-browser/docs/configuration.md 
 */

export const msalConfig = {
  auth: {
    clientId: "alphanum", // from AAD app registration
    authority: "https://login.microsoftonline.com/alphanum", // Tenant id from AAD
    redirectUri: "https://example.com", // The URL of where the web is hosted
  },
  cache: {
    cacheLocation: "sessionStorage", // This configures where your cache will be stored
    storeAuthStateInCookie: false, // Set this to "true" if you are having issues on IE11 or Edge
  },
  system: {
    loggerOptions: {
      loggerCallback: (level: LogLevel, message: string, containsPii: boolean) => {
        if(containsPii) {
          return;
        }
        switch(level) {
        case LogLevel.Error:
          console.error(message);
          return;
        case LogLevel.Info:
          console.info(message);
          return;
        case LogLevel.Verbose:
          console.debug(message);
          return;
        case LogLevel.Warning:
          console.warn(message);
          return;
        default:
          return;
        }
      }
    }
  }
};

/**
 * Scopes you add here will be prompted for user consent during sign-in.
 * By default, MSAL.js will add OIDC scopes (openid, profile, email) to any login request.
 * For more information about OIDC scopes, visit: 
 * https://docs.microsoft.com/en-us/azure/active-directory/develop/v2-permissions-and-consent#openid-connect-scopes
 */
export const graphAPIScopes = {
  scopes: ["User.Read", "User.ReadBasic.All", "Directory.Read.All"]
};

export const slackAtlasDataAPIScopes = {
  scopes: ["api://alphanum/SlackAtlas.Write"] // from AAD app registration for the back-end APIs
};

export const slackConfig = {
  slackAtlasEndpoint: "https://orgchartsync.slackapps.example.com/0_0_1/slack-atlas-data"
};