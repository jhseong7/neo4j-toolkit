import { ReturnClauseBuilder } from "./return-clause-builder";

describe("ReturnBuilder", () => {
  it("Test empty", () => {
    const builder = new ReturnClauseBuilder();
    expect(builder.toRawQuery()).toBe(""); // Empty if no properties or statements
  });

  it("Test single statement input", () => {
    const TEST_STATEMENT = "n.name";

    const builder = new ReturnClauseBuilder({
      aliases: ["n"],
    }).add(TEST_STATEMENT);

    expect(builder.toRawQuery()).toBe("RETURN " + TEST_STATEMENT);
  });

  it("(throw test) Test alias not provided", () => {
    const TEST_STATEMENT = "n.name";

    expect(() => {
      new ReturnClauseBuilder().add(TEST_STATEMENT);
    }).toThrow();
  });

  it("Test single statement with return alias", () => {
    const TEST_STATEMENT = "n.name";

    const builder = new ReturnClauseBuilder({
      aliases: ["n"],
    }).add(TEST_STATEMENT, "givenName");

    expect(builder.toRawQuery()).toBe("RETURN n.name AS givenName");
  });

  it("Test multiple statement chaining", () => {
    const builder = new ReturnClauseBuilder({
      aliases: ["n", "m"],
    })
      .add("n.name")
      .add("m.age");

    expect(builder.toRawQuery()).toBe("RETURN n.name, m.age");
  });

  it("Test multiple statement with return alias", () => {
    const builder = new ReturnClauseBuilder({
      aliases: ["n", "m"],
    })
      .add("n.name", "givenName")
      .add("m.age", "givenAge");

    expect(builder.toRawQuery()).toBe(
      "RETURN n.name AS givenName, m.age AS givenAge"
    );
  });
});
