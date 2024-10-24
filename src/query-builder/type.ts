import { Neo4jProperties } from "@/types";

export type ParameterizedQuery = {
  query: string;
  parameters: Neo4jProperties;
};

export interface IQueryBuilder {
  toRawQuery(): string;
  toParameterizedQuery(): ParameterizedQuery;
}
