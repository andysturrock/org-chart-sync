import {useMsal} from "@azure/msal-react";
import {Button} from "react-bootstrap";
import {graphAPIScopes} from "../config";

type AADSignInOutButtonProps = {
  /**
   * Is the user authenticated?
   */
  isAuthenticated: boolean
};
/**
 * Renders a sign in and out button 
 */
export function AADSignInOutButton(aadSignInOutButtonProps: AADSignInOutButtonProps) {
  const {instance} = useMsal();

  const handleLogout = () => {
    void instance.logoutRedirect({
      postLogoutRedirectUri: "/",
    });
  };

  const handleLogin = () => {
    instance.loginRedirect(graphAPIScopes).catch((e) => {
      console.log(e);
    });
  };

  const handler = aadSignInOutButtonProps.isAuthenticated ? handleLogout : handleLogin;
  const title = aadSignInOutButtonProps.isAuthenticated ? "Sign Out" : "Sign In";

  return (
    <Button
      variant="secondary"
      className="ml-auto"
      title={title}
      onClick={() => handler()}
    >
      {title}
    </Button>
  );
}