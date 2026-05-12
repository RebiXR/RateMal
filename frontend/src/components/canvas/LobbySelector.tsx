import { useEffect, useContext, useState } from "react";
import { AppContext } from "../../context/AppContext";
import {
  createLobby,
  deleteLobby,
  joinLobby,
  offLobbyDeleted,
  offLobbyList,
  onLobbyDeleted,
  onLobbyList,
  requestLobbies,
  type LobbyInfo,
} from "../../socket/selectLobby";
import "../../style/buttons.css";

type LobbySelectorProps = {
  currentUser?: {
    email: string;
    username?: string;
  } | null;
};

export default function LobbySelector({ currentUser }: LobbySelectorProps) {
  const { setActiveLobbyId, activeLobbyId } = useContext(AppContext);
  const [lobbies, setLobbies] = useState<LobbyInfo[]>([]);
  const displayName = currentUser?.username || currentUser?.email;

  useEffect(() => {
    requestLobbies();

    onLobbyList((lobbyList) => {
      setLobbies(lobbyList);
    });

    onLobbyDeleted((deletedLobbyId) => {
      if (activeLobbyId === deletedLobbyId) {
        setActiveLobbyId(null);
      }
    });

    return () => {
      offLobbyList();
      offLobbyDeleted();
    };
  }, [activeLobbyId, setActiveLobbyId]);

  const handleJoinLobby = (lobbyId: string) => {
    setActiveLobbyId(lobbyId);
    joinLobby(lobbyId, "user-1"); // replace with read id
  };

  const handleCreateLobby = () => {
    createLobby(displayName ? `${displayName} Lobby` : undefined);
  };

  return (
    <div
      style={{
        padding: "1rem",
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        flexWrap: "wrap",
      }}
    >
      <h2 style={{ margin: 0, fontSize: "1.1rem" }}>Lobbys</h2>
      <button
        className="btn btn-secondary"
        onClick={handleCreateLobby}
        style={{
          padding: "0.85rem 1.2rem",
          fontSize: "1rem",
        }}
      >
        Lobby erstellen
      </button>

      {lobbies.length === 0 && (
        <span style={{ color: "#4b5563" }}>Noch keine Lobby vorhanden</span>
      )}

      {lobbies.map((lobby) => (
        <div
          key={lobby.id}
          style={{
            display: "flex",
            alignItems: "stretch",
            gap: "0.35rem",
          }}
        >
          <button
            className="btn btn-secondary"
            onClick={() => handleJoinLobby(lobby.id)}
            disabled={activeLobbyId === lobby.id}
            style={{
              padding: "0.85rem 1.2rem",
              fontSize: "1rem",
              cursor: activeLobbyId === lobby.id ? "not-allowed" : "pointer",
            }}
          >
            {lobby.name || `Lobby ${lobby.position}`} ({lobby.participantCount})
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => deleteLobby(lobby.id)}
            style={{
              minWidth: "48px",
              padding: "0.85rem",
              fontSize: "1rem",
            }}
            title={`Lobby ${lobby.position} loeschen`}
          >
            X
          </button>
        </div>
      ))}
    </div>
  );
}
