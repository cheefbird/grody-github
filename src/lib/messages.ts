import type { WorkflowResult } from "./types";

export type GetWorkflowsMessage = {
  type: "GET_WORKFLOWS";
  owner: string;
  repo: string;
};

export type ExtensionMessage = GetWorkflowsMessage;

export type MessageResponseMap = {
  GET_WORKFLOWS: WorkflowResult;
};
