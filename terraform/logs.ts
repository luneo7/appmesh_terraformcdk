import { CloudwatchLogGroup } from "./provider-aws";
import { Construct } from "constructs";

export function createLogs(scope: Construct) {
  new CloudwatchLogGroup(scope, "logs", {
    name: "/ecs/app",
    retentionInDays: 1,
  });
}
