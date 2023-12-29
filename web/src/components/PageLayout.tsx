/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import React from "react";
import Navbar from "react-bootstrap/Navbar";

import {useIsAuthenticated} from "@azure/msal-react";
import {AADSignInButton} from "./AADSignInButton";
import {AADSignOutButton} from "./AADSignOutButton";

/**
 * Renders the navbar component with a sign in or sign out button depending on whether or not a user is authenticated
 * @param props
 */
export function PageLayout(props: { children: any; }) {
  const isAuthenticatedWithAAD = useIsAuthenticated();
  const isAuthenticatedWithSlack = false;

  return (
    <>
      <Navbar bg="primary" variant="dark" className="navbarStyle">
        <a className="navbar-brand" href="/">
          Org Chart Sync
        </a>
        <div className="collapse navbar-collapse justify-content-end">
          {isAuthenticatedWithAAD ? <AADSignOutButton /> : <AADSignInButton />}
        </div>
      </Navbar>
      <br />
      <br />
      <h5>
        <center>
          This app helps sync the Azure Active Directory and Slack Atlas with the provided org chart file.
        </center>
      </h5>
      <br />
      <br />
      {props.children}
    </>
  );
}