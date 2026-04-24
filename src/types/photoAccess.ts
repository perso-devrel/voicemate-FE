// Viewer-relative photo access flags returned by BE (GET /api/matches, /api/discover).
// snake_case mirrors BE response shape so no transform is needed in the service layer.
export type PhotoAccess = {
  main_photo_unlocked: boolean;
  all_photos_unlocked: boolean;
};

// Fallback used when registry has no entry yet (BE not deployed, or list not fetched).
// Default = fully locked so UX never leaks photos pre-unlock.
export const DEFAULT_PHOTO_ACCESS: PhotoAccess = {
  main_photo_unlocked: false,
  all_photos_unlocked: false,
};
