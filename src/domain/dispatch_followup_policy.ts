export type DispatchStatus = "scheduled" | "dispatched" | "en_route" | "on_site" | "completed" | "cancelled";

export type FollowupDecision = {
  decision: "answer_technician_now" | "queue_office_followup";
  dispatchAction: "send_followup_answer" | "hold_for_dispatch_review";
  reason: string;
};

export function decideFollowup(status: DispatchStatus): FollowupDecision {
  if (status === "dispatched" || status === "en_route") {
    return {
      decision: "answer_technician_now",
      dispatchAction: "send_followup_answer",
      reason: "Technician is actively heading to the job and can use guidance immediately."
    };
  }

  return {
    decision: "queue_office_followup",
    dispatchAction: "hold_for_dispatch_review",
    reason: "Work order is outside the live dispatch window for technician-facing follow-up."
  };
}
