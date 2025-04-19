import { useEffect, useState, useCallback } from "react";
import {
  Box,
  SplitPanel,
  StatusIndicator,
  SpaceBetween,
  FlashbarProps,
  Grid,
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
  latencyMean: number;
  latencyP95: number;
  fpsMean: number;
}

interface DeviceStatusResponse {
  success: boolean;
  cpu_percent: number;
  memory_usage: number;
  free_disk: number;
  cpu_temp: number;
  cpu_freq: number;
  cpu_freq_max: number;
  latency_mean: number;
  latency_p95: number;
  fps_mean: number;
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
    performance: {
      latency_p95: { warning: 1.2, error: 1.4 },
      fps_mean: { warning: 1.05, error: 1.1 },
    },
  });

  const [metrics, setMetrics] = useState<DeviceMetrics>({
    cpuUsage: 0,
    memoryUsage: 0,
    diskUsage: 0,
    temperature: 0,
    cpuFreq: 0,
    cpuFreqMax: 0,
    cpuFreqPct: 0,
    latencyMean: 0.0,
    latencyP95: 0.0,
    fpsMean: 0.0,
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
        const existingMessageIndex = prev.findIndex((message) => message.id === id);

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
            latencyMean: parseFloat(response.latency_mean.toFixed(1)),
            latencyP95: parseFloat(response.latency_p95.toFixed(1)),
            fpsMean: parseFloat(response.fps_mean.toFixed(1)),
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

  const checkPerformanceStatus = (
    value: number,
    referenceValue: number,
    thresholdPair: [number, number],
    isInferenceRunning: boolean
  ): "success" | "warning" | "error" | "stopped" | "pending" => {
    if (!isInferenceRunning) return "stopped";
    if (updatesSinceInferenceStarted <= 3) return "pending";
    const [warning, error] = thresholdPair;
    if (value/referenceValue < warning) return "success";
    if (value/referenceValue < error) return "warning";
    return "error";
  };

  return (
    <SplitPanel header={"Car Health"} hidePreferencesButton={true} closeBehavior="collapse">
      <SpaceBetween size="xs" direction="vertical">
        <Grid
          gridDefinition={[
            { colspan: { default: 12, xxs: 12, xs: 4 } },
            { colspan: { default: 6, xxs: 6, xs: 4 } },
            { colspan: { default: 6, xxs: 6, xs: 4 } },
          ]}
        >
          {/* CPU Metrics */}
          <SpaceBetween size="xxs" direction="vertical">
            <Box variant="h4">CPU</Box>
            <div style={{ display: "grid", gridTemplateColumns: "100px auto", rowGap: "6px" }}>
              <Box>Usage:</Box>
              <StatusIndicator
                type={checkStatus(metrics.cpuUsage, [
                  thresholds.cpu.usage.warning,
                  thresholds.cpu.usage.error,
                ])}
              >
                {metrics.cpuUsage}%
              </StatusIndicator>

              <Box>Temperature:</Box>
              <StatusIndicator
                type={checkStatus(metrics.temperature, [
                  thresholds.cpu.temperature.warning,
                  thresholds.cpu.temperature.error,
                ])}
              >
                {metrics.temperature}°C
              </StatusIndicator>

              <Box>Frequency:</Box>
              <StatusIndicator
                type={getCPUStatusType(
                  metrics.cpuFreqPct,
                  [thresholds.cpu.frequency.warning, thresholds.cpu.frequency.error],
                  isInferenceRunning && updatesSinceInferenceStarted > 2
                )}
              >
                {metrics.cpuFreq} MHz / {metrics.cpuFreqMax} MHz
              </StatusIndicator>
            </div>
          </SpaceBetween>

          {/* Memory & Disk Usage */}
          <SpaceBetween size="xxs" direction="vertical">
            <Box variant="h4">Memory Usage</Box>
            <div style={{ display: "grid", gridTemplateColumns: "100px auto", rowGap: "6px" }}>
              <Box>RAM:</Box>
              <StatusIndicator
                type={checkStatus(metrics.memoryUsage, [
                  thresholds.memory.warning,
                  thresholds.memory.error,
                ])}
              >
                {metrics.memoryUsage}%
              </StatusIndicator>

              <Box>Disk:</Box>
              <StatusIndicator
                type={checkStatus(metrics.diskUsage, [
                  thresholds.disk.warning,
                  thresholds.disk.error,
                ])}
              >
                {metrics.diskUsage}%
              </StatusIndicator>
            </div>
          </SpaceBetween>

          {/* FPS & Latency */}
          <SpaceBetween size="xxs" direction="vertical">
            <Box variant="h4">Performance</Box>
            <div style={{ display: "grid", gridTemplateColumns: "100px auto", rowGap: "6px" }}>
              <Box>Mean Latency:</Box>
                <StatusIndicator
                type={isInferenceRunning ? "info" : "stopped"}
                >
                {metrics.latencyMean.toFixed(1)} ms
                </StatusIndicator>
              <Box>95% Latency:</Box>
              <StatusIndicator
                type={checkPerformanceStatus(
                  metrics.latencyP95,
                  metrics.latencyMean,
                  [thresholds.performance.latency_p95.warning, thresholds.performance.latency_p95.warning],
                  isInferenceRunning
                )}
              >
                {metrics.latencyP95.toFixed(1)} ms
              </StatusIndicator>
              <Box>Frame Rate:</Box>
              <StatusIndicator
                type={checkPerformanceStatus(
                  30.0,
                  metrics.fpsMean,
                  [thresholds.performance.fps_mean.warning, thresholds.performance.fps_mean.error],
                  isInferenceRunning
                )}
              >
                {metrics.fpsMean.toFixed(1)} fps
              </StatusIndicator>
            </div>
          </SpaceBetween>

          {/* Empty grid cell for layout balance */}
          <div></div>
        </Grid>
      </SpaceBetween>
    </SplitPanel>
  );
};

export default DeviceStatusPanel;
