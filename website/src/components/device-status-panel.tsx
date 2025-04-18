import { useEffect, useState, useCallback } from "react";
import {
  Box,
  SplitPanel,
  KeyValuePairs,
  StatusIndicator,
  SpaceBetween,
  FlashbarProps,
} from "@cloudscape-design/components";
import { ApiHelper } from "../common/helpers/api-helper";

interface DeviceStatusProps {
  isInferenceRunning: boolean;
  notifications?: FlashbarProps.MessageDefinition[];
  setNotifications: React.Dispatch<React.SetStateAction<FlashbarProps.MessageDefinition[]>>;
}

interface DeviceMetrics {
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  temperature: number;
  cpuFreq: number;
  cpuFreqMax: number;
  cpuFreqPct: number;
}

interface DeviceStatusResponse {
  success: boolean;
  cpu_percent: number;
  memory_usage: number;
  free_disk: number;
  cpu_temp: number;
  cpu_freq: number;
  cpu_freq_max: number;
}

const DeviceStatusPanel = ({ isInferenceRunning, setNotifications }: DeviceStatusProps) => {
  // Define thresholds for different metrics
  const [thresholds] = useState({
    cpu: {
      usage: { warning: 90, error: 95 },
      temperature: { warning: 75, error: 90 },
      frequency: { warning: 75, error: 50 }, // Note: For CPU frequency, higher is better
    },
    memory: { warning: 85, error: 95 },
    disk: { warning: 90, error: 95 },
  });

  const [metrics, setMetrics] = useState<DeviceMetrics>({
    cpuUsage: 0,
    memoryUsage: 0,
    diskUsage: 0,
    temperature: 0,
    cpuFreq: 0,
    cpuFreqMax: 0,
    cpuFreqPct: 0,
  });

  const [updatesSinceInferenceStarted, setUpdatesSinceInferenceStarted] = useState(0);

  const removeFlashMessage = useCallback(
    (id: string) => {
      setNotifications((prev) => prev.filter((message) => message.id !== id));
    },
    [setNotifications]
  );

  const addFlashMessage = useCallback(
    (id: string, content: string, type: FlashbarProps.Type) => {
      // Check if a message with this ID already exists and update it if needed
      setNotifications((prev) => {
        const existingMessageIndex = prev.findIndex(message => message.id === id);
        
        // Create the new/updated message
        const newMessage: FlashbarProps.MessageDefinition = {
          id,
          content,
          type,
          dismissible: type !== "in-progress",
          onDismiss: type !== "in-progress" ? () => removeFlashMessage(id) : undefined,
        };
        
        // If message already exists, update it
        if (existingMessageIndex >= 0) {
          const updatedMessages = [...prev];
          updatedMessages[existingMessageIndex] = newMessage;
          return updatedMessages;
        }
        
        // Otherwise add a new message
        return [...prev, newMessage];
      });
      return id; // Return the id of the new/updated message
    },
    [removeFlashMessage, setNotifications]
  );

  useEffect(() => {
    if (!isInferenceRunning) {
      console.debug("Inference is not running, resetting updates since inference started.");
      setUpdatesSinceInferenceStarted(0);
    }
  }, [isInferenceRunning]);

  // Separate effect for handling warning and error messages based on metrics
  useEffect(() => {
    // Check CPU usage
    const cpuUsageId = "device-status-cpu-usage";
    if (metrics.cpuUsage >= thresholds.cpu.usage.error) {
      addFlashMessage(cpuUsageId, "CPU Usage is extremely high", "error");
    } else if (metrics.cpuUsage >= thresholds.cpu.usage.warning) {
      addFlashMessage(cpuUsageId, "CPU Usage is getting high", "warning");
    } else {
      removeFlashMessage(cpuUsageId);
    }

    // Check CPU temperature
    const cpuTempId = "device-status-cpu-temp";
    if (metrics.temperature >= thresholds.cpu.temperature.error) {
      addFlashMessage(cpuTempId, "CPU Temperature is extremely high", "error");
    } else if (metrics.temperature >= thresholds.cpu.temperature.warning) {
      addFlashMessage(cpuTempId, "CPU Temperature is getting high", "warning");
    } else {
      removeFlashMessage(cpuTempId);
    }

    // Check memory usage
    const memoryUsageId = "device-status-memory-usage";
    if (metrics.memoryUsage >= thresholds.memory.error) {
      addFlashMessage(memoryUsageId, "Memory Usage is extremely high", "error");
    } else if (metrics.memoryUsage >= thresholds.memory.warning) {
      addFlashMessage(memoryUsageId, "Memory Usage is getting high", "warning");
    } else {
      removeFlashMessage(memoryUsageId);
    }

    // Check disk usage
    const diskUsageId = "device-status-disk-usage";
    if (metrics.diskUsage >= thresholds.disk.error) {
      addFlashMessage(diskUsageId, "Disk Usage is extremely high", "error");
    } else if (metrics.diskUsage >= thresholds.disk.warning) {
      addFlashMessage(diskUsageId, "Disk Usage is getting high", "warning");
    } else {
      removeFlashMessage(diskUsageId);
    }
  }, [metrics, addFlashMessage, removeFlashMessage, thresholds]);

  // Count updates since inference started
  useEffect(() => {
    if (isInferenceRunning) {
      setUpdatesSinceInferenceStarted((prev) => prev + 1);
    }
  }, [metrics, isInferenceRunning]);

  // Use API Helper to fetch real device status
  useEffect(() => {
    const fetchDeviceStatus = async () => {
      try {
        const response = await ApiHelper.get<DeviceStatusResponse>("get_device_status");

        if (response?.success) {
          setMetrics({
            cpuUsage: parseFloat(response.cpu_percent.toFixed(0)),
            memoryUsage: parseFloat(response.memory_usage.toFixed(1)),
            diskUsage: parseFloat((100 - response.free_disk).toFixed(1)),
            temperature: parseFloat(response.cpu_temp.toFixed(1)),
            cpuFreq: parseFloat(response.cpu_freq.toFixed(0)),
            cpuFreqMax: parseFloat(response.cpu_freq_max.toFixed(0)),
            cpuFreqPct: (response.cpu_freq / response.cpu_freq_max) * 100,
          });
        }
      } catch (error) {
        console.error("Error fetching device status:", error);
      }
    };

    fetchDeviceStatus(); // Initial fetch
    const intervalId = setInterval(fetchDeviceStatus, 4000);

    return () => clearInterval(intervalId);
  }, []); // Remove updatesSinceInferenceStarted from dependency array

  const checkStatus = (
    value: number,
    thresholdPair: [number, number]
  ): "success" | "warning" | "error" => {
    const [warning, error] = thresholdPair;
    if (value < warning) return "success";
    if (value < error) return "warning";
    return "error";
  };

  const getCPUStatusType = (
    value: number,
    thresholdPair: [number, number],
    isInferenceRunning: boolean
  ): "info" | "success" | "warning" | "error" => {
    if (!isInferenceRunning) return "info";
    const [warning, error] = thresholdPair;
    if (value > warning) return "success";
    if (value > error) return "warning";
    return "error";
  };

  return (
    <SplitPanel header={"Car Health"} hidePreferencesButton={true} closeBehavior="collapse">
      <SpaceBetween size="xs" direction="vertical">
        <KeyValuePairs
          columns={4}
          items={[
            {
              label: "CPU",
              value: (
                <SpaceBetween size="m" direction="horizontal">
                  <Box>Usage:</Box>
                  <StatusIndicator
                    type={checkStatus(metrics.cpuUsage, [
                      thresholds.cpu.usage.warning,
                      thresholds.cpu.usage.error,
                    ])}
                  >
                    {metrics.cpuUsage}%
                  </StatusIndicator>
                  <Box>Temp:</Box>{" "}
                  <StatusIndicator
                    type={checkStatus(metrics.temperature, [
                      thresholds.cpu.temperature.warning,
                      thresholds.cpu.temperature.error,
                    ])}
                  >
                    {metrics.temperature}°C
                  </StatusIndicator>
                </SpaceBetween>
              ),
            },
            {
              label: "CPU Frequency",
              value: (
                <StatusIndicator
                  type={getCPUStatusType(
                    metrics.cpuFreqPct,
                    [thresholds.cpu.frequency.warning, thresholds.cpu.frequency.error],
                    isInferenceRunning && updatesSinceInferenceStarted > 2
                  )}
                >
                  {metrics.cpuFreq} MHz / {metrics.cpuFreqMax} MHz
                </StatusIndicator>
              ),
            },
            {
              label: "Memory Usage",
              value: (
                <StatusIndicator
                  type={checkStatus(metrics.memoryUsage, [
                    thresholds.memory.warning,
                    thresholds.memory.error,
                  ])}
                >
                  {metrics.memoryUsage}%
                </StatusIndicator>
              ),
            },
            {
              label: "Disk Usage",
              value: (
                <StatusIndicator
                  type={checkStatus(metrics.diskUsage, [
                    thresholds.disk.warning,
                    thresholds.disk.error,
                  ])}
                >
                  {metrics.diskUsage}%
                </StatusIndicator>
              ),
            },
          ]}
        />
      </SpaceBetween>
    </SplitPanel>
  );
};

export default DeviceStatusPanel;
