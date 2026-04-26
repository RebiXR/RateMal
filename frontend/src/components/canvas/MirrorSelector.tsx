import { useContext } from "react";
import { AppContext } from "../../context/AppContext";
import "../../style/buttons.css";
import { socket } from "../../socket/socket";

const MirrorButton = () => {
  const { activeLobbyId, mirrorMode, setMirrorMode } = useContext(AppContext);

  const handleToggleMirror = () => {
    if (!activeLobbyId) return;
    socket.emit("toggleMirrorMode", activeLobbyId);
  };

  // Optional: Status im Context anzeigen
  socket.on("mirrorModeChanged", (value: boolean) => {
    setMirrorMode(value);
  });

  return (
    <button
      className={`btn ${mirrorMode ? "btn-active" : ""}`}
      onClick={handleToggleMirror}
    >
      {mirrorMode ? "Mirror On" : "Mirror Off"}
    </button>
  );
};

export default MirrorButton;