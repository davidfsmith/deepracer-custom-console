import axios, { AxiosResponse } from "axios";

const AUTH_GRACE_PERIOD = 2000; // 2 seconds grace period
let loginTimestamp: number | null = null;

export abstract class ApiHelper {
  static setLoginTimestamp() {
    loginTimestamp = Date.now();
  }

  static isInAuthGracePeriod() {
    return loginTimestamp && (Date.now() - loginTimestamp) < AUTH_GRACE_PERIOD;
  }

  static async get<T>(path: string): Promise<T | null> {
    try {
      const response: AxiosResponse<T> = await axios.get("/api/" + path);
      return response.data;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      if (error.response?.status === 401) {
        // Ignore 401s during grace period
        if (ApiHelper.isInAuthGracePeriod()) {
          console.debug("Ignoring 401 during auth grace period");
          return null;
        }
        console.log("Unauthorized");
        // Only redirect if we're not already on the login page
        if (!window.location.pathname.includes("/login")) {
          window.location.href = "/#/login";
        }
        return null;
      }
      if (
        (error.response?.status >= 500 && error.response?.status < 600) ||
        error.code === "ERR_CONNECTION_REFUSED"
      ) {
        console.log("Unable to connect to server");
        window.location.href = "/#/system-unavailable";
        return null;
      }
      console.error("Error getting api " + path + ":", error);
      return null;
    }
  }

  static async post<T>(path: string, data: unknown): Promise<T | null> {
    try {
      const response: AxiosResponse<T> = await axios.post("/api/" + path, data);
      return response.data;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      if (error.response?.status === 401) {
        // Ignore 401s during grace period
        if (ApiHelper.isInAuthGracePeriod()) {
          console.debug("Ignoring 401 during auth grace period");
          return null;
        }
        console.log("Unauthorized");
        // Only redirect if we're not already on the login page
        if (!window.location.pathname.includes("/login")) {
          window.location.href = "/#/login";
        }
        return null;
      }
      if (
        (error.response?.status >= 500 && error.response?.status < 600) ||
        error.code === "ERR_CONNECTION_REFUSED"
      ) {
        console.log("Unable to connect to server");
        window.location.href = "/#/system-unavailable";
        return null;
      }
      console.error("Error posting to api " + path + ":", error);
      return null;
    }
  }
}
