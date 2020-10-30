import {
  DataAwsIamPolicyDocument,
  IamRole,
  IamRolePolicyAttachment,
} from "./provider-aws";

import { Construct } from "constructs";
import { Roles } from "./types";

export function createRoles(scope: Construct): Roles {
  const trustPolicy = new DataAwsIamPolicyDocument(scope, "task-trust-policy", {
    statement: [
      {
        effect: "Allow",
        principals: [
          {
            identifiers: ["ecs-tasks.amazonaws.com"],
            type: "Service",
          },
        ],
        actions: ["sts:AssumeRole"],
      },
    ],
  });

  const taskRole = new IamRole(scope, "task-role", {
    name: "task-role",
    assumeRolePolicy: trustPolicy.json,
  });

  [
    "arn:aws:iam::aws:policy/CloudWatchFullAccess",
    "arn:aws:iam::aws:policy/AWSXRayDaemonWriteAccess",
    "arn:aws:iam::aws:policy/AWSAppMeshEnvoyAccess",
  ].forEach(
    (attachRole, index) =>
      new IamRolePolicyAttachment(scope, `attach-task-role-${index}`, {
        dependsOn: [taskRole],
        policyArn: attachRole,
        role: taskRole.name!!,
      })
  );

  const taskExecutionRole = new IamRole(scope, "task-execution-role", {
    name: "task-execution-role",
    assumeRolePolicy: trustPolicy.json,
  });

  [
    "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly",
    "arn:aws:iam::aws:policy/CloudWatchLogsFullAccess",
  ].forEach(
    (attachRole, index) =>
      new IamRolePolicyAttachment(
        scope,
        `attach-task-execution-role-${index}`,
        {
          dependsOn: [taskExecutionRole],
          policyArn: attachRole,
          role: taskExecutionRole.name!!,
        }
      )
  );

  return { taskRole, taskExecutionRole };
}
