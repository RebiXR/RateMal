import { useEffect, useContext, useState } from "react";
import { AppContext } from "../../context/AppContext";
import { requestLobbies, onLobbyList, joinLobby } from "../../socket/selectLobby";

export default function LobbySelector() {
  const { setActiveLobbyId, activeLobbyId } = useContext(AppContext);
  const [lobbies, setLobbies] = useState<string[]>([]);

  useEffect(() => {
    requestLobbies();

    onLobbyList((ids) => {
      setLobbies(ids);
    });

    return () => {
    };
  }, []);

  const handleJoinLobby = (lobbyId: string) => {
    setActiveLobbyId(lobbyId);
    joinLobby(lobbyId, "user-1"); // replace with read id
  };

  return (
    <div style={{ padding: "1rem" }}>
      <h2>Select a Lobby</h2>
      {lobbies.length === 0 && <p>Loading lobbies...</p>}
      {lobbies.map((id) => (
        <button
          key={id}
          onClick={() => handleJoinLobby(id)}
          disabled={activeLobbyId === id}
          style={{
            margin: "0.5rem",
            padding: "1rem 2rem",
            fontSize: "1rem",
            cursor: "pointer",
          }}
        >
          Lobby {id}
        </button>
      ))}
    </div>
  );
}
