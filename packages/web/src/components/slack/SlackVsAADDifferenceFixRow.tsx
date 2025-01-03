import React, { useState } from "react";
import { Button } from "react-bootstrap";

type ClickHandler = (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => Promise<string>;

type SlackVsAADDifferenceFixRowProps = {
  diffText: string;
  fixButtonText: string;
  fixButtonOnClick: ClickHandler;
  children?: React.ReactNode;
  rowKey: React.Key;
  disableButton: boolean;
}

export function SlackVsAADDifferenceFixRow(props: SlackVsAADDifferenceFixRowProps) {
  const [buttonDisabled, setButtonDisabled] = useState<boolean>(false);
  const [buttonText, setButtonText] = useState<string>(props.fixButtonText);

  async function onClick(event: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
    setButtonDisabled(true);
    setButtonText("Fixing...");
    const buttonText = await props.fixButtonOnClick(event);
    setButtonText(buttonText);
  }

  return (
    <tr key={props.rowKey}>
      <td style={{ textAlign: "left", borderWidth: 1, borderColor: "black", borderStyle: "solid" }}>
        <Button
          variant="secondary"
          className="ml-auto"
          title={props.fixButtonText}
          disabled={props.disableButton || buttonDisabled}
          onClick={onClick}
        >
          {buttonText}
        </Button>
      </td>
      <td style={{ textAlign: "left", borderWidth: 1, borderColor: "black", borderStyle: "solid" }}>
        {props.diffText}
      </td>
      {props.children}
    </tr>
  );
}
