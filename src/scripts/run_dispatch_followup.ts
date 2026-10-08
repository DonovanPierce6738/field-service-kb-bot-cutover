import { handleFieldServiceFollowup } from "../fieldservice_followup_route.js";

async function main() {
  const result = await handleFieldServiceFollowup({
    workOrderId: "WO-1042",
    dispatchStatus: "dispatched",
    photoLabels: ["condenser-coils", "serial-plate"],
    serviceNote: "Customer reports weak cooling. Outdoor unit has heavy coil buildup.",
    technicianQuestion: "Can I clean the condenser coils on site before ordering parts?"
  });

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
