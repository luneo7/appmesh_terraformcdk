import { Network, SecurityGroups } from "./types";

import { Construct } from "constructs";
import { SecurityGroup } from "./provider-aws";

export function createSgs(scope: Construct, network: Network): SecurityGroups {
  const instancesSg = new SecurityGroup(scope, "ecs-instances-sg", {
    dependsOn: [network.vpc],
    vpcId: network.vpc.id!!,
    ingress: [
      {
        protocol: "-1",
        cidrBlocks: ["10.0.0.0/16"],
        description: "",
        fromPort: 0,
        ipv6CidrBlocks: [],
        prefixListIds: [],
        securityGroups: [],
        selfAttribute: false,
        toPort: 0,
      },
    ],
  });

  const externalSg = new SecurityGroup(scope, "external-security-group", {
    dependsOn: [network.vpc, ...network.privateSubnets],
    name: "external-sg",
    vpcId: network.vpc.id!!,
    ingress: [
      {
        protocol: "tcp",
        fromPort: 80,
        toPort: 80,
        cidrBlocks: ["0.0.0.0/0"],
        description: "",
        ipv6CidrBlocks: [],
        prefixListIds: [],
        securityGroups: [],
        selfAttribute: false,
      },
    ],
    egress: [
      {
        protocol: "-1",
        fromPort: 0,
        toPort: 0,
        cidrBlocks: ["0.0.0.0/0"],
        description: "",
        ipv6CidrBlocks: [],
        prefixListIds: [],
        securityGroups: [],
        selfAttribute: false,
      },
    ],
  });

  const internalSg = new SecurityGroup(scope, "internal-security-group", {
    dependsOn: [network.vpc, externalSg, ...network.privateSubnets],
    name: "internal-sg",
    vpcId: network.vpc.id!!,
    ingress: [
      {
        protocol: "-1",
        cidrBlocks: network.privateSubnets.map((o) => o.cidrBlock),
        fromPort: 0,
        toPort: 0,
        description: "",
        ipv6CidrBlocks: [],
        prefixListIds: [],
        securityGroups: [],
        selfAttribute: false,
      },
    ],
    egress: [
      {
        protocol: "-1",
        fromPort: 0,
        toPort: 0,
        cidrBlocks: ["0.0.0.0/0"],
        description: "",
        ipv6CidrBlocks: [],
        prefixListIds: [],
        securityGroups: [],
        selfAttribute: false,
      },
    ],
  });

  const gatewaySg = new SecurityGroup(scope, "gateway-security-group", {
    dependsOn: [network.vpc, externalSg, ...network.privateSubnets],
    name: "gateway-sg",
    vpcId: network.vpc.id!!,
    ingress: [
      {
        protocol: "-1",
        cidrBlocks: network.privateSubnets.map((o) => o.cidrBlock),
        fromPort: 0,
        toPort: 0,
        description: "",
        ipv6CidrBlocks: [],
        prefixListIds: [],
        securityGroups: [],
        selfAttribute: false,
      },
      {
        protocol: "tcp",
        fromPort: 8080,
        toPort: 8080,
        securityGroups: [externalSg.id!!],
        cidrBlocks: [],
        description: "",
        ipv6CidrBlocks: [],
        prefixListIds: [],
        selfAttribute: false,
      },
    ],
    egress: [
      {
        protocol: "-1",
        fromPort: 0,
        toPort: 0,
        cidrBlocks: ["0.0.0.0/0"],
        securityGroups: [],
        description: "",
        ipv6CidrBlocks: [],
        prefixListIds: [],
        selfAttribute: false,
      },
    ],
  });

  return { instancesSg, internalSg, externalSg, gatewaySg };
}
