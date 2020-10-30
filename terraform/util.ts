import { Deployment } from "./types";

export function getServiceName(name: string, deployment?: Deployment) {
  return `${name}${
    typeof deployment !== "undefined" && deployment !== Deployment.GREEN
      ? `-${deployment}`
      : ""
  }`;
}
