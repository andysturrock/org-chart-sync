import React from "react";
import {useMsal} from "@azure/msal-react";
import {graphAPIScopes} from "../authConfig";
import {Button} from "react-bootstrap";

/**
 * Renders a drop down button with child buttons for logging in with a popup or redirect
 * Note the [useMsal] package 
 */

export function AADSignInButton() {
  const {instance} = useMsal();

  const handleLogin = () => {
    instance.loginRedirect(graphAPIScopes).catch((e) => {
      console.log(e);
    });
  };
  
  return (
    <Button
      variant="secondary"
      className="ml-auto"
      title="Sign In"
      onClick={() => handleLogin()}>
        Sign In to AAD
    </Button>
  );
}