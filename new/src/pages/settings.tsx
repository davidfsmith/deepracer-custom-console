import { TextContent } from "@cloudscape-design/components";
import BaseAppLayout from "../components/base-app-layout";

export default function SettingsPage() {
  return (
    <BaseAppLayout
      content={
        <TextContent>
          <h1>Settings</h1>
        </TextContent>
      }
    />
  );
}
