import {
  EcsCluster,
  IamRole,
  SecurityGroup,
  ServiceDiscoveryPrivateDnsNamespace,
  Subnet,
  Vpc,
} from "./provider-aws";

export type Roles = {
  taskRole: IamRole;
  taskExecutionRole: IamRole;
};

export type Network = {
  vpc: Vpc;
  privateSubnets: Subnet[];
  publicSubnets: Subnet[];
};

export type Cluster = {
  ecsCluster: EcsCluster;
  serviceNamespace: ServiceDiscoveryPrivateDnsNamespace;
};

export type SecurityGroups = {
  instancesSg: SecurityGroup;
  internalSg: SecurityGroup;
  externalSg: SecurityGroup;
  gatewaySg: SecurityGroup;
};

export const enum Deployment {
  GREEN = "green",
  BLUE = "blue",
}
