import { describe, it, expect } from "vitest";
import { escapeCsv } from "@/lib/export/csv-escape";

describe("escapeCsv — formula-injection neutralisation", () => {
  it("prefixes a cell starting with = (formula)", () => {
    expect(escapeCsv("=cmd|'/c calc'!A1")).toBe("'=cmd|'/c calc'!A1");
  });

  it("prefixes a cell starting with +", () => {
    expect(escapeCsv("+SUM(A1)")).toBe("'+SUM(A1)");
  });

  it("prefixes a cell starting with @", () => {
    expect(escapeCsv("@SUM(A1)")).toBe("'@SUM(A1)");
  });

  it("prefixes a cell starting with - that is not a plain number", () => {
    expect(escapeCsv("-cmd")).toBe("'-cmd");
  });

  it("prefixes a cell starting with a leading tab", () => {
    // Leading tab neutralised, then no comma/quote/newline so no quoting.
    expect(escapeCsv("\t=danger")).toBe("'\t=danger");
  });

  it("prefixes a cell starting with a carriage return", () => {
    expect(escapeCsv("\r=danger")).toBe("'\r=danger");
  });
});

describe("escapeCsv — plain-number exemption", () => {
  it("does NOT prefix a negative decimal number", () => {
    expect(escapeCsv("-123.45")).toBe("-123.45");
  });

  it("does NOT prefix a plain positive integer", () => {
    expect(escapeCsv("42")).toBe("42");
  });

  it("does NOT prefix a negative integer", () => {
    expect(escapeCsv("-7")).toBe("-7");
  });

  it("does NOT prefix a plain positive decimal", () => {
    expect(escapeCsv("3.14")).toBe("3.14");
  });
});

describe("escapeCsv — quoting for CSV-significant characters", () => {
  it("quotes a cell containing a comma", () => {
    expect(escapeCsv("Smith, John")).toBe('"Smith, John"');
  });

  it("quotes a cell containing a double quote and doubles the quote", () => {
    expect(escapeCsv('he said "hi"')).toBe('"he said ""hi"""');
  });

  it("quotes a cell containing a newline", () => {
    expect(escapeCsv("line1\nline2")).toBe('"line1\nline2"');
  });

  it("neutralises AND quotes when a formula also contains a comma", () => {
    // First prefixed with ', then quoted because it contains a comma.
    expect(escapeCsv("=A1,B1")).toBe("\"'=A1,B1\"");
  });
});

describe("escapeCsv — benign passthrough", () => {
  it("returns plain text unchanged", () => {
    expect(escapeCsv("BHP Group Limited")).toBe("BHP Group Limited");
  });

  it("returns an empty string unchanged", () => {
    expect(escapeCsv("")).toBe("");
  });

  it("does not prefix text that merely contains = mid-string", () => {
    expect(escapeCsv("a=b")).toBe("a=b");
  });
});
