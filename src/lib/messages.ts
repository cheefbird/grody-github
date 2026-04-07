import type { DeploymentResult } from "./deployment-types";
import type { WorkflowResult } from "./types";

export type GetWorkflowsMessage = {
  type: "GET_WORKFLOWS";
  owner: string;
  repo: string;
};

export type GetOrgDeploymentsMessage = {
  type: "GET_ORG_DEPLOYMENTS";
  org: string;
};

export type ExtensionMessage = GetWorkflowsMessage | GetOrgDeploymentsMessage;

export type MessageResponseMap = {
  GET_WORKFLOWS: WorkflowResult;
  GET_ORG_DEPLOYMENTS: DeploymentResult;
};
