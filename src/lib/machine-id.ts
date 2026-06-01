// Client-safe machine ID getter
// Uses localStorage in browser, fs in server
const MACHINE_ID_KEY = "wa-akg-machine-id";

function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = crypto.getRandomValues(new Uint8Array(1))[0] & 15;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function createMachineIdGetter(
  deps: {
    existsSync?: (path: string) => boolean;
    readFileSync?: (path: string, encoding: string) => string;
    writeFileSync?: (path: string, data: string, encoding: string) => void;
    randomUUID?: () => string;
    isClient?: boolean;
  } = {}
) {
  const {
    existsSync,
    readFileSync,
    writeFileSync,
    randomUUID = generateUUID,
    isClient = typeof window !== "undefined",
  } = deps;

  return function getMachineId(): string {
    // Client-side: use localStorage
    if (isClient) {
      let id = localStorage.getItem(MACHINE_ID_KEY);
      if (!id) {
        id = randomUUID();
        localStorage.setItem(MACHINE_ID_KEY, id);
      }
      return id;
    }

    // Server-side: use fs
    const fs = { existsSync, readFileSync, writeFileSync };
    const MACHINE_ID_FILE = join(process.cwd(), ".machine-id");

    if (fs.existsSync && fs.existsSync(MACHINE_ID_FILE)) {
      return fs.readFileSync!(MACHINE_ID_FILE, "utf-8").trim();
    }

    const id = randomUUID();
    if (fs.writeFileSync) {
      fs.writeFileSync(MACHINE_ID_FILE, id, "utf-8");
    }
    return id;
  };
}

function join(...parts: string[]): string {
  return parts.join("/").replace(/\/+/g, "/");
}

export const getMachineId = createMachineIdGetter({
  existsSync: typeof window === "undefined" ? require("fs").existsSync : undefined,
  readFileSync: typeof window === "undefined" ? require("fs").readFileSync : undefined,
  writeFileSync: typeof window === "undefined" ? require("fs").writeFileSync : undefined,
});
