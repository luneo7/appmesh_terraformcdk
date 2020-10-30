import {
  Alb,
  AlbListener,
  AlbTargetGroup,
  AppmeshMesh,
  AppmeshRoute,
  AppmeshVirtualNode,
  AppmeshVirtualRouter,
  AppmeshVirtualService,
} from "./provider-aws";
import { Cluster, Deployment, Network, Roles, SecurityGroups } from "./types";
import { TerraformOutput, TerraformStack } from "cdktf";
import { createEcsCluster, createFargate } from "./ecs";

import { Construct } from "constructs";
import { MyApp } from "./app";
import { MyAwsProvider } from "./provider";
import { createLogs } from "./logs";
import { createNetwork } from "./network";
import { createRoles } from "./roles";
import { createSgs } from "./security";
import { createVirtualNode } from "./appMesh";
import { getServiceName } from "./util";

class MyStack extends TerraformStack {
  readonly deployments = [Deployment.GREEN, Deployment.BLUE];
  readonly services = ["banana", "mango"];
  readonly namespace = "mesh.local";
  readonly appMeshName = "appmesh";
  readonly awsRegion = "us-east-1";

  private virtualRouters: AppmeshVirtualRouter[] = [];
  private virtualNodes: AppmeshVirtualNode[] = [];

  constructor(scope: Construct, name: string) {
    super(scope, name);

    const provider = new MyAwsProvider(this, "aws", {
      region: this.awsRegion,
      profile: "terraform",
      version: "3.11.0",
    });

    createLogs(this);
    const network = createNetwork(this, provider);
    const sgs = createSgs(this, network);
    const roles = createRoles(this);
    const cluster = createEcsCluster(this, this.namespace, network);

    this.createMesh(network, cluster, roles, sgs);
  }

  createMesh(
    network: Network,
    cluster: Cluster,
    roles: Roles,
    securityGroups: SecurityGroups
  ) {
    const appMesh = new AppmeshMesh(this, this.appMeshName, {
      name: this.appMeshName,
    });

    this.createGateway(network, cluster, roles, securityGroups, appMesh);

    this.createVirtualNodes(appMesh);
    this.createVirtualRouters(appMesh);
    this.createRoutes(appMesh);
    this.createVirtualServices(appMesh);
    this.createApps(network, cluster, roles, securityGroups);
  }

  createApps(
    network: Network,
    cluster: Cluster,
    roles: Roles,
    securityGroups: SecurityGroups
  ) {
    for (const service of this.services) {
      for (const deployment of this.deployments) {
        createFargate({
          scope: this,
          cluster,
          roles,
          securityGroups: [securityGroups.internalSg],
          subnets: network.privateSubnets,
          appName: service,
          appMeshName: this.appMeshName,
          awsRegion: this.awsRegion,
          deployment: deployment,
        });

        if (service === "mango") {
          createFargate({
            scope: this,
            cluster,
            roles,
            securityGroups: [securityGroups.internalSg],
            subnets: network.privateSubnets,
            appName: service,
            appMeshName: this.appMeshName,
            awsRegion: this.awsRegion,
            deployment: deployment,
            grpc: true,
          });
        }
      }
    }
  }

  createGateway(
    network: Network,
    cluster: Cluster,
    roles: Roles,
    securityGroups: SecurityGroups,
    appMesh: AppmeshMesh
  ) {
    const alb = new Alb(this, "public-alb", {
      dependsOn: [securityGroups.externalSg, ...network.publicSubnets],
      name: "gateway-load-balancer",
      subnets: network.publicSubnets.map((o) => o.id!!),
      securityGroups: [securityGroups.externalSg.id!!],
    });

    new TerraformOutput(this, "alb-dns-name", {
      value: alb.dnsName,
    });

    const targetGroup = new AlbTargetGroup(this, "web-target-group", {
      dependsOn: [network.vpc],
      name: "web-target-group",
      port: 8080,
      protocol: "HTTP",
      vpcId: network.vpc.id!!,
      targetType: "ip",
      healthCheck: [
        {
          path: "/health/live",
          port: "traffic-port",
          interval: 10,
          timeout: 5,
          matcher: "200",
          healthyThreshold: 2,
          unhealthyThreshold: 2,
        },
      ],
    });

    new AlbListener(this, "web-listener", {
      loadBalancerArn: alb.arn,
      port: 80,
      protocol: "HTTP",
      defaultAction: [
        {
          targetGroupArn: targetGroup.arn,
          type: "forward",
        },
      ],
    });

    const loadBalancer = [
      {
        targetGroupArn: targetGroup.arn,
        containerName: "app",
        containerPort: 8080,
      },
    ];

    createVirtualNode(
      this,
      appMesh,
      "gateway",
      "gateway",
      this.namespace,
      this.services.map((service) => {
        return {
          virtualService: [
            {
              virtualServiceName: `${service}.${this.namespace}`,
            },
          ],
        };
      })
    );

    createFargate({
      scope: this,
      cluster,
      roles,
      securityGroups: [securityGroups.gatewaySg],
      subnets: network.privateSubnets,
      appName: "gateway",
      appMeshName: this.appMeshName,
      awsRegion: this.awsRegion,
      assignPublicIp: true,
      dependsOn: [alb, targetGroup],
      loadBalancer,
    });
  }

  createVirtualRouters(appMesh: AppmeshMesh) {
    for (let service of this.services) {
      const name = `${service}-vr`;
      this.virtualRouters.push(
        new AppmeshVirtualRouter(this, name, {
          dependsOn: [appMesh],
          meshName: this.appMeshName,
          name,
          spec: [
            {
              listener: [
                {
                  portMapping: [
                    {
                      protocol: "http",
                      port: 8080,
                    },
                  ],
                },
              ],
            },
          ],
        })
      );

      if (service === "mango") {
        const nameGrpc = `${service}-grpc-vr`;

        this.virtualRouters.push(
          new AppmeshVirtualRouter(this, nameGrpc, {
            dependsOn: [appMesh],
            meshName: this.appMeshName,
            name: nameGrpc,
            spec: [
              {
                listener: [
                  {
                    portMapping: [
                      {
                        protocol: "grpc",
                        port: 9000,
                      },
                    ],
                  },
                ],
              },
            ],
          })
        );
      }
    }
  }

  createVirtualServices(appMesh: AppmeshMesh) {
    for (const service of this.services) {
      const router = this.virtualRouters.filter((router) =>
        router.name.includes(service)
      );

      new AppmeshVirtualService(this, `${service}-vs`, {
        dependsOn: [appMesh, ...router],
        meshName: this.appMeshName,
        name: `${service}.${this.namespace}`,
        spec: [
          {
            provider: [
              {
                virtualRouter: [
                  {
                    virtualRouterName: `${service}-vr`,
                  },
                ],
              },
            ],
          },
        ],
      });

      if (service === "mango") {
        new AppmeshVirtualService(this, `${service}-grpc-vs`, {
          dependsOn: [appMesh, ...router],
          meshName: this.appMeshName,
          name: `${service}-grpc.${this.namespace}`,
          spec: [
            {
              provider: [
                {
                  virtualRouter: [
                    {
                      virtualRouterName: `${service}-grpc-vr`,
                    },
                  ],
                },
              ],
            },
          ],
        });
      }
    }
  }

  createRoutes(appMesh: AppmeshMesh) {
    for (const service of this.services) {
      const router = this.virtualRouters.filter((router) =>
        router.name.includes(service)
      );

      const nodes = this.virtualNodes.filter((node) =>
        node.name.includes(service)
      );

      const name = `${service}-route`;
      new AppmeshRoute(this, name, {
        dependsOn: [appMesh, ...router, ...nodes],
        meshName: this.appMeshName,
        virtualRouterName: `${service}-vr`,
        name,
        spec: [
          {
            httpRoute: [
              {
                action: [
                  {
                    weightedTarget: [
                      {
                        virtualNode: `${service}-blue-vn`,
                        weight: 0,
                      },
                      {
                        virtualNode: `${service}-green-vn`,
                        weight: 100,
                      },
                    ],
                  },
                ],
                match: [{ prefix: "/" }],
              },
            ],
          },
        ],
      });

      if (service === "mango") {
        const nameGprc = `${service}-grpc-route`;

        new AppmeshRoute(this, nameGprc, {
          dependsOn: [appMesh, ...router, ...nodes],
          meshName: this.appMeshName,
          virtualRouterName: `${service}-grpc-vr`,
          name: nameGprc,
          spec: [
            {
              grpcRoute: [
                {
                  action: [
                    {
                      weightedTarget: [
                        {
                          virtualNode: `${service}-grpc-blue-vn`,
                          weight: 0,
                        },
                        {
                          virtualNode: `${service}-grpc-green-vn`,
                          weight: 100,
                        },
                      ],
                    },
                  ],
                  match: [
                    {
                      serviceName: "demo.ProtoService",
                      methodName: "GetPeople",
                    },
                  ],
                },
              ],
            },
          ],
        });

        // grpcRoute.addOverride("spec.0.grpc_route.0.match.0.service_name", null);
        // grpcRoute.addOverride("spec.0.grpc_route.0.match.0.method_name", null);
      }
    }
  }

  createVirtualNodes(appMesh: AppmeshMesh) {
    for (const service of this.services) {
      for (const deployment of this.deployments) {
        const name = `${service}-${deployment}`;

        const serviceName = getServiceName(service, deployment);

        const backends = [
          ...this.services
            .filter((s) => s !== service)
            .map((s) => {
              return {
                virtualService: [
                  {
                    virtualServiceName: `${s}.${this.namespace}`,
                  },
                ],
              };
            }),
          ...this.services
            .filter((s) => s !== service && s === "mango")
            .map((s) => {
              return {
                virtualService: [
                  {
                    virtualServiceName: `${s}-grpc.${this.namespace}`,
                  },
                ],
              };
            }),
        ];

        this.virtualNodes.push(
          createVirtualNode(
            this,
            appMesh,
            name,
            serviceName,
            this.namespace,
            backends
          )
        );

        if (service === "mango") {
          const grpcName = `${service}-grpc-${deployment}`;
          const grpcServiceName = getServiceName(`${service}-grpc`, deployment);

          this.virtualNodes.push(
            createVirtualNode(
              this,
              appMesh,
              grpcName,
              grpcServiceName,
              this.namespace,
              backends,
              {
                port: 9000,
                protocol: "grpc",
              },
              []
            )
          );
        }
      }
    }
  }
}

const app = new MyApp();
new MyStack(app, "terraform");
app.synth();
