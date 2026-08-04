import type { EnvironmentResult, WorkflowResult } from "./types";

export type GetWorkflowsMessage = {
  type: "GET_WORKFLOWS";
  owner: string;
  repo: string;
};

export type GetEnvironmentsMessage = {
  type: "GET_ENVIRONMENTS";
  owner: string;
  repo: string;
};

export type ExtensionMessage = GetWorkflowsMessage | GetEnvironmentsMessage;

export type MessageResponseMap = {
  GET_WORKFLOWS: WorkflowResult;
  GET_ENVIRONMENTS: EnvironmentResult;
};
