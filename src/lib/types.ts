export type Workflow = {
  name: string;
  path: string;
};

export type WorkflowCache = {
  workflows: Workflow[];
  timestamp: number;
};
