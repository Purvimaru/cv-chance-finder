import { describe, expect, it } from "vitest";
import { prefilter } from "./rank";
import { parseCareerUrl } from "./sources";

const job = (o: Partial<any>) => ({ id: Math.random().toString(), title: "Frontend Engineer", company: "A", location: "Berlin", remote: false, url: "https://x", description: "", source: "t", ...o });

describe("job prefilter", () => {
  it("drops senior roles for entry level", () => {
    const r = prefilter([job({ title: "Senior Frontend Engineer" }), job({ title: "Junior Frontend Engineer" })], { title: "frontend", location: "", remoteOnly: false, level: "entry" }, []);
    expect(r.map((j) => j.title)).toEqual(["Junior Frontend Engineer"]);
  });
  it("remote only keeps remote jobs", () => {
    const r = prefilter([job({}), job({ title: "Frontend Dev", remote: true })], { title: "frontend", location: "", remoteOnly: true, level: "" }, []);
    expect(r).toHaveLength(1);
  });
});

describe("career link detection", () => {
  it("reads Greenhouse and Lever links", () => {
    expect(parseCareerUrl("https://boards.greenhouse.io/stripe")).toMatchObject({ platform: "greenhouse", slug: "stripe" });
    expect(parseCareerUrl("jobs.lever.co/palantir/123")).toMatchObject({ platform: "lever", slug: "palantir" });
  });
});
