import type { Environment, ListResult, Workflow } from "./types";

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
  GET_WORKFLOWS: ListResult<Workflow>;
  GET_ENVIRONMENTS: ListResult<Environment>;
};
