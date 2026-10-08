import { describe, expect, it } from "vitest";
import { decideFollowup } from "../src/domain/dispatch_followup_policy.js";

describe("decideFollowup", () => {
  it("answers the technician during the live dispatch window", () => {
    expect(decideFollowup("dispatched")).toEqual({
      decision: "answer_technician_now",
      dispatchAction: "send_followup_answer",
      reason: "Technician is actively heading to the job and can use guidance immediately."
    });
  });

  it("holds completed work orders for office review", () => {
    expect(decideFollowup("completed")).toEqual({
      decision: "queue_office_followup",
      dispatchAction: "hold_for_dispatch_review",
      reason: "Work order is outside the live dispatch window for technician-facing follow-up."
    });
  });
});
