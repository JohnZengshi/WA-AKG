import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { randomUUID } from "crypto";

const MACHINE_ID_FILE = join(process.cwd(), ".machine-id");

export function createMachineIdGetter(
  deps: {
    existsSync: typeof existsSync;
    readFileSync: typeof readFileSync;
    writeFileSync: typeof writeFileSync;
    randomUUID: typeof randomUUID;
    isClient?: boolean;
  } = { existsSync, readFileSync, writeFileSync, randomUUID, isClient: false }
) {
  return function getMachineId(): string {
    const { isClient } = deps;
    if (isClient && typeof window !== "undefined") {
      const stored = window.localStorage.getItem("wa-akg-machine-id");
      if (stored) return stored;
      const id = deps.randomUUID();
      window.localStorage.setItem("wa-akg-machine-id", id);
      return id;
    }

    if (deps.existsSync(MACHINE_ID_FILE)) {
      return deps.readFileSync(MACHINE_ID_FILE, "utf-8").trim();
    }

    const id = deps.randomUUID();
    deps.writeFileSync(MACHINE_ID_FILE, id, "utf-8");
    return id;
  };
}

export const getMachineId = createMachineIdGetter();
