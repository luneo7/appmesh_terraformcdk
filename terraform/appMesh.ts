import {
  AppmeshMesh,
  AppmeshVirtualNode,
  AppmeshVirtualNodeSpecBackend,
  AppmeshVirtualNodeSpecListenerHealthCheck,
  AppmeshVirtualNodeSpecListenerPortMapping,
} from "./provider-aws";

import { Construct } from "constructs";

export function createVirtualNode(
  scope: Construct,
  appMesh: AppmeshMesh,
  name: string,
  serviceName: string,
  namespace: string,
  backend?: AppmeshVirtualNodeSpecBackend[],
  portMapping: AppmeshVirtualNodeSpecListenerPortMapping = {
    protocol: "http",
    port: 8080,
  },
  healthCheck: AppmeshVirtualNodeSpecListenerHealthCheck[] = [
    {
      healthyThreshold: 2,
      intervalMillis: 5000,
      path: "/health/live",
      port: 8080,
      protocol: "http",
      timeoutMillis: 2000,
      unhealthyThreshold: 2,
    },
  ]
): AppmeshVirtualNode {
  const nodeName = `${name}-vn`;
  const node = new AppmeshVirtualNode(scope, nodeName, {
    dependsOn: [appMesh],
    meshName: appMesh.name,
    name: nodeName,
    spec: [
      {
        listener: [
          {
            healthCheck: healthCheck,
            portMapping: [portMapping],
          },
        ],
        serviceDiscovery: [
          {
            awsCloudMap: [
              {
                serviceName: serviceName,
                namespaceName: namespace,
                attributes: {},
              },
            ],
          },
        ],
        backend: backend,
      },
    ],
  });

  node.addOverride(
    "spec.0.service_discovery.0.aws_cloud_map.0.attributes.ECS_TASK_DEFINITION_FAMILY",
    name
  );

  return node;
}
