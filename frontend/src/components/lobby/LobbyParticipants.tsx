import { useContext, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AppContext } from "../../context/AppContext";
import { socket } from "../../socket/socket";
import {
  requestParticipants,
  onLobbyList,
  offLobbyList,
  type Participant,
  type LobbyInfo,
} from "../../socket/selectLobby";
import "./LobbyManager.css";

export default function LobbyParticipants() {
  const { activeLobbyId, activeLobbyName } = useContext(AppContext);

  const [open, setOpen] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);

  const [portalEl] = useState(() => document.createElement("div"));

  useEffect(() => {
    document.body.appendChild(portalEl);
    return () => {
      document.body.removeChild(portalEl);
    };
  }, [portalEl]);

  // Fetch on open and refresh live while open (lobby-list fires on every join/leave).
  useEffect(() => {
    if (!open || !activeLobbyId) return;
    const refresh = () => requestParticipants(activeLobbyId, setParticipants);
    refresh();
    const handleList = (_list: LobbyInfo[]) => refresh();
    onLobbyList(handleList);
    return () => offLobbyList(handleList);
  }, [open, activeLobbyId]);

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  return (
    <>
      <button className="btn btn-secondary lm-trigger" onClick={handleOpen}>
        Lobby Teilnehmer
      </button>

      {open &&
        createPortal(
          <div className="lm-overlay" onClick={handleClose}>
            <div className="lm-window" onClick={(e) => e.stopPropagation()}>
              <div className="lm-head">
                <h2>{activeLobbyName ? `Teilnehmer – ${activeLobbyName}` : "Teilnehmer"}</h2>
                <button className="lm-close" aria-label="Schließen" onClick={handleClose}>
                  ✕
                </button>
              </div>

              <div className="lm-body">
                {!activeLobbyId ? (
                  <p className="lm-empty">Keine Lobby ausgewählt.</p>
                ) : participants.length === 0 ? (
                  <p className="lm-empty">Niemand in dieser Lobby.</p>
                ) : (
                  <div className="lm-list">
                    {participants.map((p) => (
                      <div key={p.id} className="lm-participant">
                        <span className="lm-lobby__name">
                          {p.username}
                          {p.id === socket.id && " (Du)"}
                        </span>
                        {p.isAdmin && <span className="lm-lobby__meta">👑 Admin</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>,
          portalEl
        )}
    </>
  );
}
