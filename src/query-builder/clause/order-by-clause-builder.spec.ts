import { OrderByClauseBuilder } from "./order-by-clause-builder";

describe("OrderByClauseBuilder", () => {
  it("Test empty", () => {
    const builder = new OrderByClauseBuilder();
    expect(builder.toRawQuery()).toBe(""); // Empty if no properties or statements
  });

  it("Test single statement input", () => {
    const TEST_STATEMENT = "n.name";

    const builder = new OrderByClauseBuilder({ aliases: ["n"] }).add(
      TEST_STATEMENT,
      "ASC"
    );

    expect(builder.toRawQuery()).toBe("ORDER BY " + TEST_STATEMENT + " ASC");
  });

  it("(throw test) Test alias not provided", () => {
    const TEST_STATEMENT = "n.name";

    expect(() => {
      new OrderByClauseBuilder().add(TEST_STATEMENT).toRawQuery();
    }).toThrow();
  });

  it("(throw test) Test invalid direction creation (must throw)", () => {
    const TEST_STATEMENT = "n.name";

    expect(() => {
      new OrderByClauseBuilder({ aliases: ["a"] })
        .add(TEST_STATEMENT, "SOME" as any)
        .toRawQuery();
    }).toThrow();
  });

  it("Test ASC direction", () => {
    const TEST_STATEMENT = "n.name";

    const builder = new OrderByClauseBuilder({ aliases: ["n"] }).add(
      TEST_STATEMENT,
      "ASC"
    );

    expect(builder.toRawQuery()).toBe("ORDER BY " + TEST_STATEMENT + " ASC");
  });

  it("Test DESC direction", () => {
    const TEST_STATEMENT = "n.name";

    const builder = new OrderByClauseBuilder({ aliases: ["n"] }).add(
      TEST_STATEMENT,
      "DESC"
    );

    expect(builder.toRawQuery()).toBe("ORDER BY " + TEST_STATEMENT + " DESC");
  });

  it("Test multiple statement chaining", () => {
    const builder = new OrderByClauseBuilder({ aliases: ["n", "m"] })
      .add("n.name", "DESC")
      .add("m.age", "ASC");

    expect(builder.toRawQuery()).toBe("ORDER BY n.name DESC, m.age ASC");
  });

  it("Test multiple statement with partial unspecified direction", () => {
    const builder = new OrderByClauseBuilder({ aliases: ["n", "m"] })
      .add("n.name")
      .add("m.age", "ASC");

    expect(builder.toRawQuery()).toBe("ORDER BY n.name ASC, m.age ASC");
  });

  it("(throw test) Test partial missing alias", () => {
    const builder = new OrderByClauseBuilder({ aliases: ["n", "m"] });

    expect(() => {
      builder.add("n.name").add("k.age", "ASC").toRawQuery();
    }).toThrow();
  });

  it("Test multiple statement with the same alias", () => {
    const builder = new OrderByClauseBuilder({ aliases: ["n"] })
      .add("n.name", "ASC")
      .add("n.age", "DESC")
      .add("n.birthday", "ASC");

    expect(builder.toRawQuery()).toBe(
      "ORDER BY n.name ASC, n.age DESC, n.birthday ASC"
    );
  });

  it("Test default direction test (ASC)", () => {
    const builder = new OrderByClauseBuilder({ aliases: ["n"] }).add("n.name");

    expect(builder.toRawQuery()).toBe("ORDER BY n.name ASC");
  });

  it("Test setAlias", () => {
    const builder = new OrderByClauseBuilder()
      .add("n.name")
      .add("m.age")
      .setAliasList(["n", "m"]);

    expect(builder.toRawQuery()).toBe("ORDER BY n.name ASC, m.age ASC");
  });
});
