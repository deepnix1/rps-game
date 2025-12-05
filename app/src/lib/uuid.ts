export function uuidToBytes32(id: string) {
  const normalized = id.replace(/-/g, "");
  if (normalized.length !== 32) {
    throw new Error("Invalid UUID supplied for bytes32 conversion");
  }
  return `0x${normalized}`;
}

