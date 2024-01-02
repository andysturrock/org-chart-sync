/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

type PageLayoutProps = {
  children: any
};

import React from "react";
import Navbar from "react-bootstrap/Navbar";

import {useIsAuthenticated} from "@azure/msal-react";
import {AADSignInOutButton} from "./AADSignInOutButton";

/**
 * Renders the navbar component with a sign in or sign out button depending on whether or not a user is authenticated
 * @param props
 */
export function PageLayout(props: PageLayoutProps) {
  const isAuthenticatedWithAAD = useIsAuthenticated();

  return (
    <>
      <Navbar bg="primary" variant="dark" className="navbarStyle">
        <a className="navbar-brand" href="/">
          Org Chart Sync
        </a>
        <div className="collapse navbar-collapse justify-content-end">
          <AADSignInOutButton isAuthenticated={isAuthenticatedWithAAD} />
        </div>
      </Navbar>
      {props.children}
    </>
  );
}