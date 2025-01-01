import React from "react";
import { Button } from "react-bootstrap";

type SlackVsAADDifferenceFixRowProps = {
  diffText: string;
  fixButtonText: string;
  fixButtonOnClick: React.MouseEventHandler<HTMLButtonElement>;
  children?: React.ReactNode;
  rowKey: React.Key;
}

export function SlackVsAADDifferenceFixRow(props: SlackVsAADDifferenceFixRowProps) {
  console.log(`SlackVsAADDifferenceFixRow key (props.rowKey): ${props.rowKey}`)
  return (
    <tr key={props.rowKey}>
      <td style={{ textAlign: "left", borderWidth: 1, borderColor: "black", borderStyle: "solid" }}>
        <Button
          variant="secondary"
          className="ml-auto"
          title={props.fixButtonText}
          disabled={false}
          // eslint-disable-next-line @typescript-eslint/no-misused-promises
          // onClick={async () => {await onFixFileDifferenceInSlackButtonClick(difference);}}
          onClick={props.fixButtonOnClick}
        >
          {props.fixButtonText}
        </Button>
      </td>
      <td style={{ textAlign: "left", borderWidth: 1, borderColor: "black", borderStyle: "solid" }}>
        {props.diffText}
      </td>
      {props.children}
    </tr>
  );
} 