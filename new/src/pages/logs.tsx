import React from "react";
import axios from "axios";
import { TextContent } from "@cloudscape-design/components";
import BaseAppLayout from "../components/base-app-layout";

class LogsPage extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      sysLogs: "",
    };
  }

  componentDidMount() {
    this.getSysLogs();
  }

  getSysLogs = () => {
    axios.get('https://192.168.0.82/api/logs/SYS')
      .then(response => {
        this.setState({ sysLogs: response.data });
      })
      .catch(error => {
        console.error("There was an error fetching the logs!", error);
      });
  };

  render() {
    return (
      <BaseAppLayout
        content={
          <TextContent>
            <h1>Logs</h1>
            <h2>System event log</h2>
            <pre>{this.state.sysLogs}</pre>
          </TextContent>
        }
      />
    );
  }
}

export default LogsPage;