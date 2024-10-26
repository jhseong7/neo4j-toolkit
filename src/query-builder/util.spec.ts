import { Neo4jProperties } from "../types";
import {
  extractAliasFromPath,
  extractAliasFromSet,
  mergeProperties,
  randomizeKey,
  randomizeParameterKeys,
  replaceQueryParameters,
} from "./util";

describe("QueryBuilderUtil", () => {
  describe("replaceQueryParameters", () => {
    it("replaceQueryParameters", () => {
      const query = "MATCH (n) WHERE n.name = $name RETURN n";
      const parameters = { name: "John Doe" };

      expect(replaceQueryParameters(query, parameters)).toBe(
        'MATCH (n) WHERE n.name = "John Doe" RETURN n'
      );
    });

    it("replaceQueryParameters with multiple parameters", () => {
      const query = "MATCH (n) WHERE n.name = $name AND n.age = $age RETURN n";
      const parameters = { name: "John Doe", age: 30 };

      expect(replaceQueryParameters(query, parameters)).toBe(
        'MATCH (n) WHERE n.name = "John Doe" AND n.age = 30 RETURN n'
      );
    });

    it("replaceQueryParameters with no parameters", () => {
      const query = "MATCH (n) WHERE n.name = $name RETURN n";
      const parameters = {};

      expect(replaceQueryParameters(query, parameters)).toBe(
        "MATCH (n) WHERE n.name = $name RETURN n"
      );
    });

    it("replaceQueryParameters with number, boolean, string return functions", () => {
      const query =
        "MATCH (n) WHERE n.name = $name AND n.time = $time AND n.number = $number AND n.boolean = $boolean RETURN n";
      const parameters = {
        name: "John Doe",
        time: () => "time('11:11')",
        number: 10,
        boolean: true,
      };

      expect(replaceQueryParameters(query, parameters)).toBe(
        "MATCH (n) WHERE n.name = \"John Doe\" AND n.time = time('11:11') AND n.number = 10 AND n.boolean = true RETURN n"
      );
    });
  });

  describe("mergeProperties", () => {
    it("merge to empty objects", () => {
      const obj1 = {};
      const obj2 = {};

      mergeProperties(obj1, obj2);

      expect(obj1).toEqual({});
    });

    it("merge to empty object and non-empty object", () => {
      const obj1 = {};
      const obj2 = { key: "value" };

      mergeProperties(obj1, obj2);

      expect(obj1).toEqual({ key: "value" });
    });

    it("merge overwrite properties", () => {
      const obj1 = { key: "value" };
      const obj2 = { key: "new value" };

      mergeProperties(obj1, obj2);

      expect(obj1).toEqual({ key: "new value" });
    });
  });

  describe("extractAliasFromSet", () => {
    it("extract dot aliases", () => {
      const statement = "n.name = $name";
      expect(extractAliasFromSet(statement)).toEqual(["n"]);
    });

    it("extract multiple dot aliases", () => {
      const statement = "n.name = $name, m.age = $age";
      expect(extractAliasFromSet(statement)).toEqual(["n", "m"]);
    });

    it("extract bracketed aliases", () => {
      const statement = "n[name] = $name, m[age] = $age";
      expect(extractAliasFromSet(statement)).toEqual(["n", "m"]);
    });

    it("extract mixed aliases", () => {
      const statement = "n.name = $name, m[age] = $age";
      expect(extractAliasFromSet(statement)).toEqual(["n", "m"]);
    });
  });

  describe("extractAliasFromPath", () => {
    it("extract from path alias (n)-[:REL]->(m)", () => {
      const statement = "(n)-[:REL]->(m)";
      expect(extractAliasFromPath(statement)).toEqual(["n", "m"]);
    });

    it("extract from path alias (n)", () => {
      const statement = "(n)";
      expect(extractAliasFromPath(statement)).toEqual(["n"]);
    });

    it("extract from complex path with properties and multiple labels", () => {
      const statement =
        "(n:Person {name: $name})-[r:REL]->(m:Person {name: $name})";
      expect(extractAliasFromPath(statement)).toEqual(["n", "r", "m"]);
    });

    it("extract from complex path with properties and multiple labels", () => {
      const statement =
        "(n:Person {name: $name})-[r:REL]->(m:Person {name: $name})--(o:Person)-->(p:Person)";

      expect(extractAliasFromPath(statement)).toEqual([
        "n",
        "r",
        "m",
        "o",
        "p",
      ]);
    });
  });

  describe("randomizeKey", () => {
    it("Generate 10000 random keys, then check if any collision", () => {
      const keys = new Set<string>();

      for (let i = 0; i < 10000; i++) {
        const randomKey = randomizeKey("key");
        expect(keys.has(randomKey)).toBe(false);

        keys.add(randomKey);
      }
    });
  });

  describe("randomizeParameterKey", () => {
    it("Generate 10000 random keys and and values -> check if all are changes", () => {
      const original: Neo4jProperties = {};
      let statementList: string[] = [];

      const RANDOM_TEST_COUNT = 10000;
      for (let i = 0; i < RANDOM_TEST_COUNT; i++) {
        const key = `key${i}`;
        const value = `value${i}`;

        original[key] = value;
        // Push only the key to the statementList
        statementList.push(`$${key}`);

        // Replace the key with the random key
        const { statement: newStatement, parameters: newParameters } =
          randomizeParameterKeys(statementList[i], { [key]: value });

        // Check if the values of the parameters are the same
        const newKey = newStatement.substring(1);
        const newValue = newParameters[newKey];

        expect(original[key]).toBe(newValue);
      }
    });
  });
});
