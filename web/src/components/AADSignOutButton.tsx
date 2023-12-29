import React from "react";
import {useMsal} from "@azure/msal-react";
import {Button} from "react-bootstrap";

/**
 * Renders a sign out button 
 */
export function AADSignOutButton() {
  const {instance} = useMsal();

  const handleLogout = () => {
    void instance.logoutRedirect({
      postLogoutRedirectUri: "/",
    });
  };

  return (
    <Button
      variant="secondary"
      className="ml-auto"
      title="Sign Out"
      onClick={() => handleLogout()}
    >
      Sign Out of AAD
    </Button>
  );
}