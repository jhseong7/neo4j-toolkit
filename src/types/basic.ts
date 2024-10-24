type Primitive = string | number | boolean;

export type Neo4jPrimitive = Primitive | Primitive[] | null | undefined;
export type Neo4jProperties = Record<string, Neo4jPrimitive>;
