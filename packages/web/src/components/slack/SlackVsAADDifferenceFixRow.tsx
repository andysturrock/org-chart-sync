import React, { JSX, useState } from "react";
import { Button } from "react-bootstrap";

type ClickHandler = (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => Promise<string>;

export type FixButtonProps = {
  fixButtonText: string;
  fixButtonOnClick: ClickHandler;
  disableButton: boolean;
  setButtonHasBeenClicked?: React.Dispatch<React.SetStateAction<boolean>>
}
export type SlackVsAADDifferenceFixRowProps = {
  diffText: string;
  fixButtons: FixButtonProps[]
  children?: React.ReactNode;
  rowKey: React.Key;
}

function FixButton(props: FixButtonProps) {
  const [buttonDisabled, setButtonDisabled] = useState<boolean>(false);
  const [buttonText, setButtonText] = useState<string>(props.fixButtonText);

  async function onClick(event: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
    setButtonDisabled(true);
    if(props.setButtonHasBeenClicked) {
      props.setButtonHasBeenClicked(true);
    }
    setButtonText("Fixing...");
    const buttonText = await props.fixButtonOnClick(event);
    setButtonText(buttonText);
  }

  return (
    <Button
      variant="secondary"
      className="ml-auto"
      title={props.fixButtonText}
      disabled={props.disableButton || buttonDisabled}
      onClick={onClick}
    >
      {buttonText}
    </Button>
  );
}

export function SlackVsAADDifferenceFixRow(props: SlackVsAADDifferenceFixRowProps) {
  const buttons: JSX.Element[] = [];

  // Each button calls this when it has been clicked.
  // This means all buttons are disabled when one has been clicked.
  const [buttonHasBeenClicked, setButtonHasBeenClicked] = useState<boolean>(false);

  for(const fixButtonProp of props.fixButtons) {
    buttons.push(<FixButton
                  fixButtonText={fixButtonProp.fixButtonText}
                  fixButtonOnClick={fixButtonProp.fixButtonOnClick}
                  disableButton={buttonHasBeenClicked ||fixButtonProp.disableButton}
                  setButtonHasBeenClicked={setButtonHasBeenClicked}
                >
                </FixButton>
    );
  }
  return (
    <tr key={props.rowKey}>
      <td style={{ textAlign: "left", borderWidth: 1, borderColor: "black", borderStyle: "solid" }}>
        {buttons}
      </td>
      <td style={{ textAlign: "left", borderWidth: 1, borderColor: "black", borderStyle: "solid" }}>
        {props.diffText}
      </td>
      {props.children}
    </tr>
  );
}
