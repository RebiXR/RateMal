/*
 * Model for drawings saved to a user's account.
 */

import { DrawEvent } from '../DrawEvents.ts';

export interface ISavedDrawing {
  id: string;            // randomUUID()
  userId: string;        // owner (from JWT)
  lobbyName: string;     // name of the lobby the drawing came from
  title: string;
  events: DrawEvent[];   // full draw history (from lobbyHistory)
  thumbnail: string;     // small JPEG data URL for the gallery
  createdAt: Date;
}

// Lightweight gallery entry (no events payload).
export interface SavedDrawingSummary {
  id: string;
  userId: string;
  lobbyName: string;
  title: string;
  thumbnail: string;
  createdAt: Date;
}
