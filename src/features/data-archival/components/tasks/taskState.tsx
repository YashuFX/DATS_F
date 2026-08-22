import { CircleCheck, CircleDashed, CircleX, Loader, PauseCircle } from "lucide-react";
import type { TaskStateId } from "../../types";
import { StatusPill } from "../ui/StatusBits";

const META: Record<TaskStateId, { color: string; label: string }> = {
  running: { color: "da-brand", label: "Running" },
  queued: { color: "da-label", label: "Queued" },
  paused: { color: "da-warn", label: "Paused" },
  completed: { color: "da-success", label: "Completed" },
  failed: { color: "da-danger", label: "Failed" },
};

const ICON: Record<TaskStateId, typeof CircleCheck> = {
  running: Loader,
  queued: CircleDashed,
  paused: PauseCircle,
  completed: CircleCheck,
  failed: CircleX,
};

export function TaskStatePill({ state }: { state: TaskStateId }) {
  const { color, label } = META[state];
  const Icon = ICON[state];

  return (
    <StatusPill
      color={color}
      icon={
        <Icon
          className={`size-[0.75rem] ${state === "running" ? "animate-spin [animation-duration:2.4s]" : ""}`}
          strokeWidth={2.2}
        />
      }
    >
      {label}
    </StatusPill>
  );
}

export const TASK_STATE_COLOR = (state: TaskStateId) => META[state].color;
