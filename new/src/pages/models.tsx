import { TextContent, Table, Flashbar } from "@cloudscape-design/components";
import BaseAppLayout from "../components/base-app-layout";
import Button from "@cloudscape-design/components/button";
import * as React from "react";
import axios from "axios";

class ModelsPage extends React.Component {
  state = {
    models: [],
    selectedModels: [],
    flashMessages: [],
  };

  componentDidMount() {
    this.getModels();
  }

  getModels = async () => {
    try {
      const response = await axios.get("/api/uploaded_model_list");
      this.setState({ models: response.data });
    } catch (error) {
      console.error("Error fetching models:", error);
    }
  };

  deleteModels = async () => {
    try {
      const response = await axios.post("/api/deleteModels", {
        filenames: this.state.selectedModels.map(model => model.name)
      });
      if (response.data.success) {
        this.getModels(); // Refresh the model list after deletion
        this.setState({
          flashMessages: [...this.state.flashMessages, { type: 'success', content: 'Models deleted successfully' }]
        });
      } else {
        this.setState({
          flashMessages: [...this.state.flashMessages, { type: 'error', content: 'Failed to delete models' }]
        });
      }
    } catch (error) {
      console.error("Error deleting models:", error);
      this.setState({
        flashMessages: [...this.state.flashMessages, { type: 'error', content: 'Error deleting models' }]
      });
    }
  };

  uploadModel = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post('/api/uploadModels', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        console.log('Model uploaded successfully:', response.data.message);
      } else {
        console.error('Failed to upload model:', response.data.message);
      }
    } catch (error) {
      console.error('Error uploading model:', error);
    }
  };

  handleSelectionChange = ({ detail }) => {
    this.setState({ selectedModels: detail.selectedItems });
  };

  formatDate = (epochTime) => {
    const date = new Date(epochTime * 1000); // Convert epoch time to milliseconds
    const options = { year: 'numeric', month: 'long', day: '2-digit' };
    const timeOptions = { hour: '2-digit', minute: '2-digit', hour12: true };
    const formattedDate = date.toLocaleDateString('en-US', options);
    const formattedTime = date.toLocaleTimeString('en-US', timeOptions);
    return `${formattedDate} ${formattedTime}`;
  };

  render() {
    const { models, selectedModels, flashMessages } = this.state;

    return (
      <BaseAppLayout
        content={
          <TextContent>
            <Flashbar items={flashMessages} />
            <h1>Models</h1>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2>Reinforcement learning models</h2>
              <div style={{ display: 'flex', gap: '8px' }}>
                <Button onClick={this.uploadModel}> Upload Model</Button>
                <Button onClick={this.deleteModels} disabled={selectedModels.length === 0}>Delete</Button>
                <Button onClick={this.getModels}>Refresh</Button>
              </div>
            </div>
            <div style={{ marginTop: '16px' }}>
              <Table
                columnDefinitions={[
                  { id: 'name', header: 'Name', cell: item => item.name },
                  { id: 'sensors', header: 'Sensor(s)', cell: item => item.sensors },
                  { id: 'training_algorithm', header: 'Training algorithm', cell: item => item.training_algorithm },
                  { id: 'action_space_type', header: 'Action space type', cell: item => item.action_space_type },
                  { id: 'size', header: 'Size', cell: item => item.size },
                  { id: 'creation_time', header: 'Upload time', cell: item => this.formatDate(item.creation_time) },
                ]}
                items={models}
                header="Model List"
                selectionType="multi"
                selectedItems={selectedModels}
                onSelectionChange={this.handleSelectionChange}
              />
            </div>
          </TextContent>
        }
      />
    );
  }
}

export default ModelsPage;