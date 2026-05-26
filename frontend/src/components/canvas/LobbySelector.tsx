import { useEffect, useContext, useState } from "react";
import { AppContext } from "../../context/AppContext";
import { requestLobbies, onLobbyList, joinLobby } from "../../socket/selectLobby";
//import "../../style/buttons.css";
import "../../App.css";

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
    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
      {lobbies.length === 0 ? (
        <span style={{ fontSize: "12px", color: "#999" }}>Suche Lobbies...</span>
      ) : (
        lobbies.map((id) => (
          <button
            key={id}
            onClick={() => handleJoinLobby(id)}
            className={activeLobbyId === id ? "lobby-btn active" : "lobby-btn"}
          >
            <span style={{ opacity: 0.6, marginRight: "4px" }}>#</span>
            {id}
            {activeLobbyId === id && <span className="lobby-indicator" />}
          </button>
        ))
      )}
    </div>
  );
}