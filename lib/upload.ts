import type { Id } from "@/convex/_generated/dataModel";

/** POSTs a file to a Convex upload URL (files.generateUploadUrl). */
export async function uploadFile(uploadUrl: string, file: File) {
  const res = await fetch(uploadUrl, {
    method: "POST",
    headers: { "Content-Type": file.type },
    body: file,
  });
  if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
  const { storageId } = (await res.json()) as { storageId: Id<"_storage"> };
  return storageId;
}
