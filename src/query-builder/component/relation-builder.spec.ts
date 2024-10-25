import { RelationPatternBuilder } from "./relation-builder";

describe("RelationBuilder", () => {
  it("Test [n]", () => {
    const builder = RelationPatternBuilder.new().setAlias("n");

    expect(builder.toRawQuery()).toBe("[n]");
  });

  it("Test [n:Label]", () => {
    const randomLabel =
      "Random" + Math.floor(Math.random() * 1000).toString(36);
    const builder = RelationPatternBuilder.new()
      .setAlias("n")
      .setLabel(randomLabel);

    expect(builder.toRawQuery()).toBe(`[n:${randomLabel}]`);
  });

  it("Test properties [n {prop1: 'value1'}]", () => {
    const builder = RelationPatternBuilder.new()
      .setAlias("n")
      .addProperty("prop1", "value1");

    expect(builder.toRawQuery()).toBe(`[n {prop1: "value1"}]`);
  });

  it("Test multiple properties", () => {
    const builder = RelationPatternBuilder.new().setAlias("n").addProperties({
      prop1: "value1",
      prop2: "value2",
    });

    expect(builder.toRawQuery()).toBe(`[n {prop1: "value1", prop2: "value2"}]`);
  });

  it("Test multiple properties with different types", () => {
    const builder = RelationPatternBuilder.new().setAlias("n").addProperties({
      prop1: "value1",
      prop2: 10,
    });

    expect(builder.toRawQuery()).toBe(`[n {prop1: "value1", prop2: 10}]`);
  });

  it("Test properties overwrite", () => {
    const builder = RelationPatternBuilder.new()
      .setAlias("n")
      .addProperty("prop1", "value1")
      .addProperty("prop1", "value2");

    expect(builder.toRawQuery()).toBe(`[n {prop1: "value2"}]`);
  });

  it("Test properties overwrite with different types", () => {
    const builder = RelationPatternBuilder.new()
      .setAlias("n")
      .addProperty("prop1", "value1")
      .addProperty("prop1", 10);

    expect(builder.toRawQuery()).toBe(`[n {prop1: 10}]`);
  });

  it("Test label and properties", () => {
    const randomLabel =
      "Random" + Math.floor(Math.random() * 1000).toString(36);
    const builder = RelationPatternBuilder.new()
      .setAlias("n")
      .setLabel(randomLabel)
      .addProperty("prop1", "value1");

    expect(builder.toRawQuery()).toBe(`[n:${randomLabel} {prop1: "value1"}]`);
  });

  it("Test function calls in the properties", () => {
    const builder = RelationPatternBuilder.new()
      .setAlias("n")
      .addProperty("prop1", "value1")
      .addProperty("prop2", () => "time('11:11')");

    expect(builder.toRawQuery()).toBe(
      `[n {prop1: "value1", prop2: time('11:11')}]`
    );
  });
});
