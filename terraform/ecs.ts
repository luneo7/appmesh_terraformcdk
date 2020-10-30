import {
  CloudwatchLogGroup,
  EcsCluster,
  EcsService,
  EcsServiceLoadBalancer,
  EcsTaskDefinition,
  SecurityGroup,
  ServiceDiscoveryPrivateDnsNamespace,
  ServiceDiscoveryService,
  Subnet,
} from "./provider-aws";
import { Cluster, Deployment, Network, Roles } from "./types";

import { Construct } from "constructs";
import { TerraformResource } from "cdktf";
import { getServiceName } from "./util";

export function createEcsCluster(
  scope: Construct,
  namespace: string,
  network: Network
): Cluster {
  const ecsCluster = new EcsCluster(scope, "cluster", {
    name: "cluster",
  });

  const serviceNamespace = new ServiceDiscoveryPrivateDnsNamespace(
    scope,
    "service-discovery-namespace",
    {
      dependsOn: [network.vpc],
      name: namespace,
      vpc: network.vpc.id!!,
    }
  );

  return { ecsCluster, serviceNamespace };
}

export function createFargate({
  scope,
  cluster,
  roles,
  securityGroups,
  subnets,
  appName,
  appMeshName,
  awsRegion,
  deployment,
  assignPublicIp,
  loadBalancer,
  grpc = false,
  dependsOn = [],
}: {
  scope: Construct;
  cluster: Cluster;
  roles: Roles;
  securityGroups: SecurityGroup[];
  subnets: Subnet[];
  appName: string;
  appMeshName: string;
  awsRegion: string;
  deployment?: Deployment;
  assignPublicIp?: boolean;
  loadBalancer?: EcsServiceLoadBalancer[];
  grpc?: boolean;
  dependsOn?: TerraformResource[]
}) {

  const app = `${appName}${grpc ? "-grpc" : ""}`
  const serviceName = getServiceName(app, deployment);

  const name = `${appName}${grpc ? "-grpc" : ""}${
    typeof deployment !== "undefined" ? `-${deployment}` : ""
  }`;

  const logGroup = new CloudwatchLogGroup(scope, `${name}-logs`, {
    name: `/ecs/app/${name}`,
    retentionInDays: 1,
  });

  const appPort = grpc ? 9000 : 8080;

  const containerDefs = [
    {
      name: "app",
      image: `457446225942.dkr.ecr.us-east-1.amazonaws.com/${appName}:latest`,
      environment: [
        {
          name: "SERVICE_NAME",
          value: name,
        },
      ],
      portMappings: [
        {
          containerPort: appPort,
          hostPort: appPort,
          protocol: "tcp",
        },
      ],
      logConfiguration: {
        logDriver: "awslogs",
        options: {
          "awslogs-group": logGroup.name,
          "awslogs-region": awsRegion,
          "awslogs-stream-prefix": name,
        },
      },
      essential: true,
      dependsOn: [
        {
          containerName: "envoy",
          condition: "HEALTHY",
        },
      ],
    },
    {
      name: "envoy",
      image: `840364872350.dkr.ecr.${awsRegion}.amazonaws.com/aws-appmesh-envoy:v1.15.1.0-prod`,
      essential: true,
      user: "1337",
      ulimits: [
        {
          name: "nofile",
          hardLimit: 15000,
          softLimit: 15000,
        },
      ],
      environment: [
        {
          name: "APPMESH_VIRTUAL_NODE_NAME",
          value: `mesh/${appMeshName}/virtualNode/${name}-vn`,
        },
        {
          name: "ENABLE_ENVOY_XRAY_TRACING",
          value: "1",
        },
        {
          name: "ENABLE_ENVOY_STATS_TAGS",
          value: "1",
        },
      ],
      logConfiguration: {
        logDriver: "awslogs",
        options: {
          "awslogs-group": logGroup.name,
          "awslogs-region": awsRegion,
          "awslogs-stream-prefix": `${name}-envoy`,
        },
      },
      healthCheck: {
        command: [
          "CMD-SHELL",
          "curl -s http://localhost:9901/server_info | grep state | grep -q LIVE",
        ],
        interval: 5,
        timeout: 2,
        retries: 3,
      },
      portMappings: [
        {
          containerPort: 9901,
          hostPort: 9901,
          protocol: "tcp",
        },
        {
          containerPort: 15000,
          hostPort: 15000,
          protocol: "tcp",
        },
        {
          containerPort: 15001,
          hostPort: 15001,
          protocol: "tcp",
        },
      ],
    },
    {
      name: "xray-daemon",
      image: "amazon/aws-xray-daemon",
      user: "1337",
      essential: true,
      cpu: 32,
      memoryReservation: 256,
      portMappings: [
        {
          hostPort: 2000,
          containerPort: 2000,
          protocol: "udp",
        },
      ],
      logConfiguration: {
        logDriver: "awslogs",
        options: {
          "awslogs-group": logGroup.name,
          "awslogs-region": awsRegion,
          "awslogs-stream-prefix": `${name}-xray`,
        },
      },
    },
  ];

  const taskDef = new EcsTaskDefinition(scope, `${name}-task-def`, {
    family: name,
    taskRoleArn: roles.taskRole.arn,
    executionRoleArn: roles.taskExecutionRole.arn,
    cpu: "512",
    memory: "1024",
    requiresCompatibilities: ["FARGATE"],
    networkMode: "awsvpc",
    proxyConfiguration: [
      {
        type: "APPMESH",
        containerName: "envoy",
        properties: {},
      },
    ],
    containerDefinitions: JSON.stringify(containerDefs),
  });

  taskDef.addOverride("proxy_configuration.0.properties.IgnoredUID", "1337");
  taskDef.addOverride(
    "proxy_configuration.0.properties.ProxyIngressPort",
    "15000"
  );
  taskDef.addOverride(
    "proxy_configuration.0.properties.ProxyEgressPort",
    "15001"
  );
  taskDef.addOverride(
    "proxy_configuration.0.properties.AppPorts",
    `${appPort}`
  );
  taskDef.addOverride(
    "proxy_configuration.0.properties.EgressIgnoredIPs",
    "169.254.170.2,169.254.169.254"
  );

  const sds = new ServiceDiscoveryService(scope, `${name}-sds`, {
    dependsOn: [cluster.serviceNamespace],
    name: serviceName,
    healthCheckCustomConfig: [
      {
        failureThreshold: 2,
      },
    ],
    dnsConfig: [
      {
        namespaceId: cluster.serviceNamespace.id!!,
        dnsRecords: [
          {
            type: "A",
            ttl: 300,
          },
        ],
      },
    ],
  });

  new EcsService(scope, `${name}-service`, {
    dependsOn: [cluster.ecsCluster, logGroup, ...securityGroups, ...subnets, ...dependsOn],
    name: serviceName,
    cluster: cluster.ecsCluster.id,
    launchType: "FARGATE",
    taskDefinition: taskDef.arn,
    desiredCount: 1,
    serviceRegistries: [
      {
        registryArn: sds.arn,
      },
    ],
    networkConfiguration: [
      {
        securityGroups: securityGroups.map((o) => o.id!!),
        subnets: subnets.map((o) => o.id!!),
        assignPublicIp,
      },
    ],
    loadBalancer,
  });
}
