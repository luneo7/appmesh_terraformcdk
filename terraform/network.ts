import {
  DataAwsAvailabilityZones,
  Eip,
  InternetGateway,
  NatGateway,
  Route,
  RouteTable,
  RouteTableAssociation,
  Subnet,
  Vpc,
} from "./provider-aws";

import { Construct } from "constructs";
import { Network } from "./types";
import { TerraformProvider } from "cdktf";

export function createNetwork(
  scope: Construct,
  provider: TerraformProvider
): Network {
  const vpc = new Vpc(scope, "mesh-vpc", {
    enableDnsSupport: true,
    enableDnsHostnames: true,
    cidrBlock: "10.0.0.0/16",
  });

  const azs = new DataAwsAvailabilityZones(scope, "azs", {
    provider,
  });

  const privateSubnets: Subnet[] = [];
  const publicSubnets: Subnet[] = [];

  for (let index = 0; index < 2; index++) {
    const publicRange = index * 32;
    const privateRange = (index + 2) * 32;

    const publicSubnet = new Subnet(scope, `public-subnet-${index}`, {
      dependsOn: [vpc],
      vpcId: vpc.id!!,
      cidrBlock: `10.0.${publicRange}.0/19`,
      availabilityZone: `\${${azs.fqn}.names[${index}]}`,
    });

    publicSubnets.push(publicSubnet);

    const privateSubnet = new Subnet(scope, `private-subnet-${index}`, {
      dependsOn: [vpc],
      vpcId: vpc.id!!,
      cidrBlock: `10.0.${privateRange}.0/19`,
      availabilityZone: `\${${azs.fqn}.names[${index}]}`,
    });

    privateSubnets.push(privateSubnet);

    const eip = new Eip(scope, `eip-${index}`, {
      vpc: true,
    });

    const natGateway = new NatGateway(scope, `nat-gateway-${index}`, {
      dependsOn: [publicSubnet, eip],
      subnetId: publicSubnet.id!!,
      allocationId: eip.id!!,
    });

    const routeTable = new RouteTable(scope, `route-table-${index}`, {
      dependsOn: [vpc, natGateway],
      vpcId: vpc.id!!,
      route: [
        {
          cidrBlock: "0.0.0.0/0",
          natGatewayId: natGateway.id!!,
          egressOnlyGatewayId: "",
          gatewayId: "",
          instanceId: "",
          ipv6CidrBlock: "",
          networkInterfaceId: "",
          transitGatewayId: "",
          vpcPeeringConnectionId: "",
          localGatewayId:"",
        },
      ],
    });

    new RouteTableAssociation(scope, `route-table-association-${index}`, {
      dependsOn: [privateSubnet, routeTable],
      subnetId: privateSubnet.id!!,
      routeTableId: routeTable.id!!,
    });
  }

  const igw = new InternetGateway(scope, "internet-gateway", {
    dependsOn: [vpc],
    vpcId: vpc.id!!,
  });

  new Route(scope, "internet-access", {
    dependsOn: [igw],
    routeTableId: vpc.mainRouteTableId,
    destinationCidrBlock: "0.0.0.0/0",
    gatewayId: igw.id!!,
  });

  return { vpc, privateSubnets, publicSubnets };
}
