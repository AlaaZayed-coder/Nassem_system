import { LogForm } from "@/components/maintenance/log-form";
import { getMachines } from "@/lib/maintenance-data";

export default async function NewLogPage() {
  const machines = await getMachines();

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <LogForm machines={machines} />
    </div>
  );
}
