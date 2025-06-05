export interface SigmaDataType {
  depth: number;
  id: string;
  label: string;
  connects?: string[];
}

export interface NodeDataType extends SigmaDataType {
  x: number;
  y: number;
  color: string;
}
