import { useEffect, useState } from "react";
import {
  Box,
  SplitPanel,
  KeyValuePairs,
  StatusIndicator,
  SpaceBetween,
} from "@cloudscape-design/components";
import { ApiHelper } from "../common/helpers/api-helper";

interface DeviceStatusProps {
  isInferenceRunning: boolean;
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

const DeviceStatusPanel = ({ isInferenceRunning }: DeviceStatusProps) => {
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

  useEffect(() => {
    if (!isInferenceRunning) {
      console.debug("Inference is not running, resetting updates since inference started.");
      setUpdatesSinceInferenceStarted(0);
    }
  }, [isInferenceRunning]);

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

          if (isInferenceRunning) {
            setUpdatesSinceInferenceStarted((prev) => prev + 1);
          }
        }
      } catch (error) {
        console.error("Error fetching device status:", error);
      }
    };

    fetchDeviceStatus(); // Initial fetch
    const intervalId = setInterval(fetchDeviceStatus, 4000);

    return () => clearInterval(intervalId);
  }, [isInferenceRunning]); // Remove updatesSinceInferenceStarted from dependency array

  const getStatusType = (
    value: number,
    thresholds: [number, number]
  ): "success" | "warning" | "error" => {
    const [warning, error] = thresholds;
    if (value < warning) return "success";
    if (value < error) return "warning";
    return "error";
  };

  const getCPUStatusType = (
    value: number,
    thresholds: [number, number],
    isInferenceRunning: boolean
  ): "info" | "success" | "warning" | "error" => {
    if (!isInferenceRunning) return "info";
    const [warning, error] = thresholds;
    if (value > warning) return "success";
    if (value > error) return "warning";
    return "error";
  };

  return (
    <SplitPanel
      header={"Device Status"}
      i18nStrings={{ preferencesTitle: "Preferences" }}
      hidePreferencesButton={true}
      closeBehavior="collapse"
    >
      <SpaceBetween size="xs" direction="vertical">
        <KeyValuePairs
          columns={4}
          items={[
            {
              label: "CPU",
              value: (
                <SpaceBetween size="m" direction="horizontal">
                  <Box>Usage:</Box>
                  <StatusIndicator type={getStatusType(metrics.cpuUsage, [60, 80])}>
                    {metrics.cpuUsage}%
                  </StatusIndicator>
                  <Box>Temp:</Box>{" "}
                  <StatusIndicator type={getStatusType(metrics.temperature, [45, 55])}>
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
                    [75, 50],
                    isInferenceRunning && updatesSinceInferenceStarted > 1
                  )}
                >
                  {metrics.cpuFreq} MHz / {metrics.cpuFreqMax} MHz
                </StatusIndicator>
              ),
            },
            {
              label: "Memory Usage",
              value: (
                <StatusIndicator type={getStatusType(metrics.memoryUsage, [70, 85])}>
                  {metrics.memoryUsage}%
                </StatusIndicator>
              ),
            },
            {
              label: "Disk Usage",
              value: (
                <StatusIndicator type={getStatusType(metrics.diskUsage, [70, 90])}>
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
