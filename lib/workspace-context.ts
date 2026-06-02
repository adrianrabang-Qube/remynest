export type WorkspaceType = "my-nest" | "care"

export interface WorkspaceContext {
  workspaceType: WorkspaceType
  activeProfileId: string | null
  isMyNest: boolean
}

export function buildWorkspaceContext(
  activeProfileId: string | null,
  urlContext?: string | null,
): WorkspaceContext {
  const isMyNest =
    urlContext === "my-nest" || activeProfileId === null

  return {
    workspaceType: isMyNest ? "my-nest" : "care",
    activeProfileId,
    isMyNest,
  }
}