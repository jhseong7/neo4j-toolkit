import { PathPatternCommonClauseBuilder } from "./select-clause-builder";

describe("SelectClauseBuilders", () => {
  const GLOBAL_PREFIX = "TEST";
  // Check the base class, then all the others will be checked
  describe("PathPatternCommonClauseBuilder", () => {
    it("Test empty", () => {
      const builder = new PathPatternCommonClauseBuilder(GLOBAL_PREFIX);
      expect(builder.toRawQuery()).toBe(""); // Empty if no properties or statements
    });

    it("Test direct statement input", () => {
      const TEST_STATEMENT = "(n:Test)-[r:REL]->(m:Test)";

      const builder = new PathPatternCommonClauseBuilder(
        GLOBAL_PREFIX
      ).addPathPattern(TEST_STATEMENT);

      expect(builder.toRawQuery()).toBe(`${GLOBAL_PREFIX} ` + TEST_STATEMENT);
    });

    it("Test statement with path builder", () => {
      const builder = new PathPatternCommonClauseBuilder(
        GLOBAL_PREFIX
      ).addPathPattern((p) => p.setNode({ alias: "n", labels: ["Test"] }));

      expect(builder.toRawQuery()).toBe(`${GLOBAL_PREFIX} (n:Test)`);
    });

    it("Add multiple path patterns (direct only)", () => {
      const builder = new PathPatternCommonClauseBuilder(GLOBAL_PREFIX)
        .addPathPattern("(n:Test)-[r:REL]->(m:Test)")
        .addPathPattern("(n2)-[r2]->(m2)");

      expect(builder.toRawQuery()).toBe(
        `${GLOBAL_PREFIX} (n:Test)-[r:REL]->(m:Test), (n2)-[r2]->(m2)`
      );
    });

    it("Add multiple path patterns (builder only)", () => {
      const builder = new PathPatternCommonClauseBuilder(GLOBAL_PREFIX)
        .addPathPattern((p) => p.setNode({ alias: "n", labels: ["Test"] }))
        .addPathPattern((p) => p.setNode({ alias: "n2" }));

      expect(builder.toRawQuery()).toBe(`${GLOBAL_PREFIX} (n:Test), (n2)`);
    });

    it("Add multiple path patterns (mixed)", () => {
      const builder = new PathPatternCommonClauseBuilder(GLOBAL_PREFIX)
        .addPathPattern("(n:Test)-[r:REL]->(m:Test)")
        .addPathPattern((p) => p.setNode({ alias: "n2" }));

      expect(builder.toRawQuery()).toBe(
        `${GLOBAL_PREFIX} (n:Test)-[r:REL]->(m:Test), (n2)`
      );
    });

    it("(Throw test) add conflicting aliases", () => {
      const builder = new PathPatternCommonClauseBuilder(GLOBAL_PREFIX)
        .addPathPattern("(n:Test)-[r:REL]->(m:Test)")
        .addPathPattern("(n)-[r]->(m)");

      expect(() => {
        builder.toRawQuery();
      }).toThrow();
    });

    it("Add path patterns with properties", () => {
      const builder = new PathPatternCommonClauseBuilder(GLOBAL_PREFIX)
        .addPathPattern((p) =>
          p.setNode({
            alias: "n",
            labels: ["Test"],
            properties: { prop1: "value1", prop2: 10, prop3: true },
          })
        )
        .addPathPattern((p) =>
          p.setNode({
            alias: "n2",
            properties: { prop1: "value2", prop2: 20, prop3: false },
          })
        );

      expect(builder.toRawQuery()).toBe(
        `${GLOBAL_PREFIX} (n:Test {prop1: "value1", prop2: 10, prop3: true}), (n2 {prop1: "value2", prop2: 20, prop3: false})`
      );
    });
  });
});
