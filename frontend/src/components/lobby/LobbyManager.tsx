import { useContext, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { createPortal } from "react-dom";
import { AppContext } from "../../context/AppContext";
import {
  requestLobbies,
  onLobbyList,
  offLobbyList,
  joinLobby,
  createLobby,
  leaveLobby,
  type LobbyInfo,
} from "../../socket/selectLobby";
import "./LobbyManager.css";

const PAGE_SIZE = 10;

function LockIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

type View = "list" | "create" | "password";

export default function LobbyManager() {
  const { activeLobbyId, setActiveLobbyId, activeLobbyName, setActiveLobbyName, username } =
    useContext(AppContext);

  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>("list");
  const [lobbies, setLobbies] = useState<LobbyInfo[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [newName, setNewName] = useState("");
  const [newIsPrivate, setNewIsPrivate] = useState(false);
  const [newPassword, setNewPassword] = useState("");

  const [pendingLobby, setPendingLobby] = useState<LobbyInfo | null>(null);
  const [joinPassword, setJoinPassword] = useState("");

  const [portalEl] = useState(() => document.createElement("div"));

  useEffect(() => {
    document.body.appendChild(portalEl);
    return () => {
      document.body.removeChild(portalEl);
    };
  }, [portalEl]);

  // server broadcasts lobby-list on every change
  useEffect(() => {
    const handleList = (list: LobbyInfo[]) => setLobbies(list);
    onLobbyList(handleList);
    requestLobbies();
    return () => offLobbyList(handleList);
  }, []);

  const handleOpen = () => {
    setView("list");
    setSearch("");
    setPage(0);
    setError(null);
    requestLobbies();
    setOpen(true);
  };

  const handleClose = () => setOpen(false);

  const doJoin = (lobby: LobbyInfo, password?: string) => {
    setBusy(true);
    joinLobby(lobby.id, username, password, (res) => {
      setBusy(false);
      if (!res.ok) {
        setError(res.error ?? "Beitritt fehlgeschlagen");
        return;
      }
      if (activeLobbyId && activeLobbyId !== lobby.id) leaveLobby(activeLobbyId);
      setActiveLobbyId(lobby.id);
      setActiveLobbyName(lobby.name);
      handleClose();
    });
  };

  const handleLobbyClick = (lobby: LobbyInfo) => {
    setError(null);
    if (lobby.isPrivate) {
      setPendingLobby(lobby);
      setJoinPassword("");
      setView("password");
    } else {
      doJoin(lobby);
    }
  };

  const handlePasswordSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!pendingLobby) return;
    doJoin(pendingLobby, joinPassword);
  };

  const handleCreateSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const name = newName.trim();
    createLobby(
      { name, isPrivate: newIsPrivate, password: newIsPrivate ? newPassword : undefined, username },
      (res) => {
        setBusy(false);
        if (!res.ok || !res.lobbyId) {
          setError(res.error ?? "Erstellen fehlgeschlagen");
          return;
        }
        if (activeLobbyId && activeLobbyId !== res.lobbyId) leaveLobby(activeLobbyId);
        setActiveLobbyId(res.lobbyId);
        setActiveLobbyName(name);
        setNewName("");
        setNewPassword("");
        setNewIsPrivate(false);
        handleClose();
      }
    );
  };

  const openCreate = () => {
    setNewName("");
    setNewIsPrivate(false);
    setNewPassword("");
    setError(null);
    setView("create");
  };

  const backToList = () => {
    setError(null);
    setView("list");
  };

  // Client-side search + pagination over the live list.
  const filtered = lobbies.filter((l) =>
    l.name.toLowerCase().includes(search.trim().toLowerCase())
  );
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const visible = filtered.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE);

  const createDisabled = busy || !newName.trim() || (newIsPrivate && !newPassword.trim());

  return (
    <>
      <button className="btn btn-secondary lm-trigger" onClick={handleOpen}>
        {activeLobbyName ?? "Lobby wählen"}
      </button>

      {open &&
        createPortal(
          <div className="lm-overlay" onClick={handleClose}>
            <div className="lm-window" onClick={(e) => e.stopPropagation()}>
              <div className="lm-head">
                {view !== "list" && (
                  <button className="lm-back" aria-label="Zurück" onClick={backToList}>
                    ←
                  </button>
                )}
                <h2>
                  {view === "list" && "Lobbys"}
                  {view === "create" && "Neue Lobby"}
                  {view === "password" && "Passwort eingeben"}
                </h2>
                <button className="lm-close" aria-label="Schließen" onClick={handleClose}>
                  ✕
                </button>
              </div>

              {/* ---------- List view ---------- */}
              {view === "list" && (
                <div className="lm-body">
                  <input
                    className="lm-input lm-search"
                    type="text"
                    placeholder="Lobby suchen…"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(0);
                    }}
                    aria-label="Lobby nach Name suchen"
                  />

                  {error && <p className="lm-error">{error}</p>}

                  {visible.length === 0 ? (
                    <p className="lm-empty">Keine Lobbys gefunden.</p>
                  ) : (
                    <div className="lm-list">
                      {visible.map((lobby) => (
                        <button
                          key={lobby.id}
                          className={
                            "lm-lobby" + (activeLobbyId === lobby.id ? " is-active" : "")
                          }
                          onClick={() => handleLobbyClick(lobby)}
                          disabled={busy}
                        >
                          <span className="lm-lobby__name">
                            {lobby.isPrivate && (
                              <span className="lm-lobby__lock">
                                <LockIcon />
                              </span>
                            )}
                            {lobby.name}
                          </span>
                          <span className="lm-lobby__meta">{lobby.participantCount} 👤</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {pageCount > 1 && (
                    <div className="lm-pager">
                      <button
                        className="btn"
                        onClick={() => setPage(currentPage - 1)}
                        disabled={currentPage === 0}
                      >
                        ← Zurück
                      </button>
                      <span className="lm-pager__info">
                        Seite {currentPage + 1}/{pageCount}
                      </span>
                      <button
                        className="btn"
                        onClick={() => setPage(currentPage + 1)}
                        disabled={currentPage >= pageCount - 1}
                      >
                        Weiter →
                      </button>
                    </div>
                  )}

                  <div className="lm-actions">
                    <button className="btn btn-secondary lm-create-btn" onClick={openCreate}>
                      + Neue Lobby erstellen
                    </button>
                  </div>
                </div>
              )}

              {/* ---------- Create view ---------- */}
              {view === "create" && (
                <form className="lm-body" onSubmit={handleCreateSubmit}>
                  <label className="lm-field">
                    <span>Name</span>
                    <input
                      className="lm-input"
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="Meine Lobby"
                      maxLength={40}
                      autoFocus
                    />
                  </label>

                  <div className="lm-field">
                    <span>Sichtbarkeit</span>
                    <div className="lm-segment" role="group" aria-label="Sichtbarkeit">
                      <button
                        type="button"
                        className={!newIsPrivate ? "is-active" : ""}
                        aria-pressed={!newIsPrivate}
                        onClick={() => setNewIsPrivate(false)}
                      >
                        Öffentlich
                      </button>
                      <button
                        type="button"
                        className={newIsPrivate ? "is-active" : ""}
                        aria-pressed={newIsPrivate}
                        onClick={() => setNewIsPrivate(true)}
                      >
                        Privat
                      </button>
                    </div>
                  </div>

                  {newIsPrivate && (
                    <label className="lm-field">
                      <span>Passwort</span>
                      <input
                        className="lm-input"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Passwort festlegen"
                        autoComplete="new-password"
                      />
                    </label>
                  )}

                  {error && <p className="lm-error">{error}</p>}

                  <button type="submit" className="btn btn-secondary lm-submit" disabled={createDisabled}>
                    {busy ? "Wird erstellt…" : "Lobby erstellen & beitreten"}
                  </button>
                </form>
              )}

              {/* ---------- Password view (joining a private lobby) ---------- */}
              {view === "password" && pendingLobby && (
                <form className="lm-body" onSubmit={handlePasswordSubmit}>
                  <p className="lm-prompt">
                    Die Lobby <strong>{pendingLobby.name}</strong> ist privat.
                  </p>
                  <label className="lm-field">
                    <span>Passwort</span>
                    <input
                      className="lm-input"
                      type="password"
                      value={joinPassword}
                      onChange={(e) => setJoinPassword(e.target.value)}
                      placeholder="Passwort"
                      autoComplete="current-password"
                      autoFocus
                    />
                  </label>

                  {error && <p className="lm-error">{error}</p>}

                  <button type="submit" className="btn btn-secondary lm-submit" disabled={busy || !joinPassword}>
                    {busy ? "Beitreten…" : "Beitreten"}
                  </button>
                </form>
              )}
            </div>
          </div>,
          portalEl
        )}
    </>
  );
}
