import { TextContent } from "@cloudscape-design/components";
import BaseAppLayout from "../components/base-app-layout";

export default function LogsPage() {
  return (
    <BaseAppLayout
      content={
        <TextContent>
          <h1>Logs</h1>
        </TextContent>
      }
    />
  );
}
