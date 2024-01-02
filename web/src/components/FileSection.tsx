import {Component, ChangeEvent, createRef} from "react";
import {Button} from "react-bootstrap";

type FileSectionState = {
  selectedFile: File | null
};
/**
 * Renders information about the user obtained from MS Graph 
 * @param props
 */
export class FileSection<PropsType> extends Component<PropsType, FileSectionState> {
  private hiddenFileInput = createRef<HTMLInputElement>();

  constructor(props: Readonly<PropsType> | PropsType) {
    super(props);
    this.state = {
      selectedFile: null
    };
  }

  onFileChange(event: ChangeEvent<HTMLInputElement>) {
    if(event.target.files) {
    // Update the state
      this.setState({
        selectedFile: event.target.files[0],
      });
    }
  }

  fileData() {
    if(this.state.selectedFile) {
      return (
        <div>
          <p>
            File Name:{" "}
            {this.state.selectedFile.name}
          </p>
        </div>
      );
    } else {
      return (
        <div>
          <h6>No file selected</h6>
                
        </div>
      );
    }
  }

  onClick() {
    this.hiddenFileInput.current?.click();
  }

  render() {
    return (
      <div>
        <hr />
        <h5 className="card-title">File data</h5>
        <br />
        <div>
          <input
            type="file"
            onChange={this.onFileChange.bind(this)}
            accept=".csv"
            style={{display: 'none'}}
            ref={this.hiddenFileInput}
          />
          <Button
            variant="secondary"
            className="ml-auto"
            title="Select File"
            onClick={this.onClick.bind(this)}>
              Select File
          </Button>
        </div>
        {this.fileData()}
      </div>
    );
  }
}