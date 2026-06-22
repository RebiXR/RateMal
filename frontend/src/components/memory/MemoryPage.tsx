import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppContext } from "../../context/AppContext";
import { searchImages } from "../../api/imageApi";
import { listDrawings } from "../../api/drawingsApi";
import { socket } from "../../socket/socket";
import {
  flipMemoryCard,
  offMemoryState,
  onMemoryState,
  requestMemoryState,
  resetMemoryGame,
  startMemoryGame,
  type MemoryCard,
  type MemoryDeckCard,
  type MemoryState,
} from "../../socket/memoryEvents";
import "./MemoryPage.css";

type LocalCard = MemoryCard & { imageUrl: string };
type EditableDeckCard = MemoryDeckCard & { key: string };
type LocalGameStatus = "playing" | "finished" | "lost";

const MAX_PAIRS = 15;

const DEFAULT_DECK: MemoryDeckCard[] = [
  { title: "Baum", imageUrl: "/sticker/tree.png" },
  { title: "Blaetter", imageUrl: "/sticker/buntysmum-leaves.png" },
  { title: "Kirsche", imageUrl: "/sticker/cherry.png" },
  { title: "Vogel", imageUrl: "/sticker/bird.png" },
  { title: "Panda", imageUrl: "/sticker/panda.png" },
  { title: "Blume", imageUrl: "/sticker/4383982.png" },
  { title: "Blume 2", imageUrl: "/sticker/4645828.png" },
  { title: "Collage", imageUrl: "/sticker/photo.avif" },
];

function makeId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}-${Date.now().toString(36)}`;
}

function normalizeImageUrl(url: string): string {
  return url.trim().toLowerCase();
}

function toEditableDeck(deck: MemoryDeckCard[]): EditableDeckCard[] {
  return deck.map((card, index) => ({
    ...card,
    key: makeId(`deck-${index}`),
  }));
}

function toPlayableDeck(deck: EditableDeckCard[]): MemoryDeckCard[] {
  return deck
    .filter((card) => card.imageUrl.trim())
    .slice(0, MAX_PAIRS)
    .map(({ title, imageUrl }, index) => ({
      title: title.trim() || `Bild ${index + 1}`,
      imageUrl,
    }));
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function makeLocalCards(deck: MemoryDeckCard[], pairCount = MAX_PAIRS): LocalCard[] {
  return shuffle(
    deck.slice(0, pairCount).flatMap((card, index) => {
      const pairId = `solo-pair-${index}`;
      return [0, 1].map((copyIndex) => ({
        id: makeId(`solo-${index}-${copyIndex}`),
        pairId,
        title: card.title,
        imageUrl: card.imageUrl,
        isFlipped: false,
        isMatched: false,
      }));
    })
  );
}

function gridStep(cardCount: number): number {
  return Math.max(1, Math.round(Math.sqrt(cardCount)));
}

export default function MemoryPage() {
  const { activeLobbyId, activeLobbyName, isAuthenticated } = useContext(AppContext);

  const [mode, setMode] = useState<"solo" | "multi">("solo");
  const [deck, setDeck] = useState<MemoryDeckCard[]>(DEFAULT_DECK);
  const [editableDeck, setEditableDeck] = useState<EditableDeckCard[]>(() => toEditableDeck(DEFAULT_DECK));
  const [suggestions, setSuggestions] = useState<EditableDeckCard[]>([]);
  const [deckPanel, setDeckPanel] = useState<"deck" | "search" | "add">("deck");
  const [selectedDeckKey, setSelectedDeckKey] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [manualTitle, setManualTitle] = useState("");
  const [manualUrl, setManualUrl] = useState("");
  const [loadingDeck, setLoadingDeck] = useState(false);
  const [deckMessage, setDeckMessage] = useState<string | null>(null);
  const [pairCount, setPairCount] = useState(8);
  const [moveLimitMode, setMoveLimitMode] = useState<"unlimited" | "20" | "50" | "custom">("unlimited");
  const [customMoveLimit, setCustomMoveLimit] = useState(30);

  const [localCards, setLocalCards] = useState<LocalCard[]>(() => makeLocalCards(DEFAULT_DECK));
  const [localFirstPick, setLocalFirstPick] = useState<string | null>(null);
  const [localLocked, setLocalLocked] = useState(false);
  const [localMoves, setLocalMoves] = useState(0);
  const [localStatus, setLocalStatus] = useState<LocalGameStatus>("playing");

  const [remoteState, setRemoteState] = useState<MemoryState | null>(null);
  const [remoteError, setRemoteError] = useState<string | null>(null);
  const [liveMessage, setLiveMessage] = useState("Memory bereit.");
  const cardRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    const handleState = (state: MemoryState | null) => setRemoteState(state);
    onMemoryState(handleState);
    return () => offMemoryState(handleState);
  }, []);

  useEffect(() => {
    if (mode === "multi" && activeLobbyId) requestMemoryState(activeLobbyId);
  }, [mode, activeLobbyId]);

  const activeCards = mode === "solo" ? localCards : remoteState?.cards ?? [];
  const matchedPairs = mode === "solo"
    ? new Set(localCards.filter((card) => card.isMatched).map((card) => card.pairId)).size
    : remoteState?.matchedPairs ?? 0;
  const totalPairs = mode === "solo" ? localCards.length / 2 : remoteState?.totalPairs ?? deck.length;
  const maxMoves = moveLimitMode === "unlimited"
    ? null
    : moveLimitMode === "custom"
      ? Math.max(1, Math.floor(customMoveLimit || 1))
      : Number(moveLimitMode);
  const soloFinished = mode === "solo" && localStatus === "finished";
  const soloLost = mode === "solo" && localStatus === "lost";
  const canPlayRemote = mode !== "multi" || !remoteState || remoteState.currentPlayerId === socket.id;
  const playableDeck = useMemo(() => toPlayableDeck(editableDeck), [editableDeck]);
  const selectedPlayableDeck = useMemo(() => playableDeck.slice(0, pairCount), [playableDeck, pairCount]);
  const deckReady = playableDeck.length >= 2 && playableDeck.length >= pairCount;
  const moveLimitLabel = mode === "multi"
    ? remoteState?.maxMoves ?? null
    : maxMoves;
  const selectionHint = mode === "multi" && remoteState
    ? remoteState.locked
      ? "Kurz warten: Die zwei Karten werden gleich wieder verdeckt."
      : remoteState.status === "lost"
        ? "Zuglimit erreicht. Starte ein neues Spiel."
      : canPlayRemote
        ? "Du kannst eine Karte auswaehlen."
        : "Du bist gerade nicht dran."
    : soloLost
      ? "Zuglimit erreicht. Starte ein neues Spiel."
      : "Waehle zwei Karten mit gleichem Bild.";

  const turnLabel = useMemo(() => {
    if (mode === "solo") return "Du bist dran";
    if (!remoteState) return "Noch kein Lobby-Spiel";
    const current = remoteState.players.find((player) => player.id === remoteState.currentPlayerId);
    if (!current) return "Warte auf Spieler";
    return current.id === socket.id ? "Du bist dran" : `${current.username} ist dran`;
  }, [mode, remoteState]);

  useEffect(() => {
    if (soloFinished) setLiveMessage("Solo-Spiel abgeschlossen. Alle Paare wurden gefunden.");
    if (soloLost) setLiveMessage("Zuglimit erreicht. Du hast das Solo-Spiel verloren.");
  }, [soloFinished, soloLost]);

  useEffect(() => {
    if (!remoteState) return;
    if (remoteState.status === "finished") {
      setLiveMessage("Lobby-Spiel abgeschlossen. Alle Paare wurden gefunden.");
    } else if (remoteState.status === "lost") {
      setLiveMessage("Zuglimit erreicht. Das Lobby-Spiel ist verloren.");
    } else {
      setLiveMessage(`${turnLabel}. ${remoteState.matchedPairs} von ${remoteState.totalPairs} Paaren gefunden.`);
    }
  }, [remoteState, turnLabel]);

  const startSolo = (nextDeck = selectedPlayableDeck) => {
    if (nextDeck.length < pairCount) {
      const message = `Fuer ${pairCount} Paare brauchst du ${pairCount} Bilder im Deck.`;
      setDeckMessage(message);
      setLiveMessage(message);
      return;
    }
    setLocalCards(makeLocalCards(nextDeck, pairCount));
    setLocalFirstPick(null);
    setLocalLocked(false);
    setLocalMoves(0);
    setLocalStatus("playing");
    setMode("solo");
    setLiveMessage("Solo-Spiel neu gestartet.");
  };

  const applyDeck = (nextDeck: MemoryDeckCard[], message: string) => {
    const cleanDeck = nextDeck.slice(0, MAX_PAIRS);
    setDeck(cleanDeck);
    setEditableDeck(toEditableDeck(cleanDeck));
    setDeckMessage(message);
    setLiveMessage(message);
    if (mode === "solo" && cleanDeck.length >= pairCount) startSolo(cleanDeck.slice(0, pairCount));
  };

  const useEditorDeck = () => {
    if (!deckReady) {
      const message = "Ein Deck braucht mindestens zwei Bilder.";
      setDeckMessage(message);
      setLiveMessage(message);
      return;
    }
    applyDeck(playableDeck, `${playableDeck.length} Bilder als aktives Deck uebernommen.`);
  };

  const addToDeck = (card: MemoryDeckCard) => {
    if (editableDeck.length >= MAX_PAIRS) {
      setDeckMessage(`Maximal ${MAX_PAIRS} Bilder pro Deck.`);
      return;
    }
    const normalizedUrl = normalizeImageUrl(card.imageUrl);
    const alreadyInDeck = editableDeck.some((deckCard) => normalizeImageUrl(deckCard.imageUrl) === normalizedUrl);
    if (alreadyInDeck) {
      const message = "Dieses Bild ist schon im Deck.";
      setDeckMessage(message);
      setLiveMessage(message);
      return;
    }
    setEditableDeck((current) => [...current, { ...card, key: makeId("deck-add") }]);
    setDeckMessage(`${card.title} zum Deck hinzugefuegt.`);
  };

  const removeFromDeck = (key: string) => {
    setEditableDeck((current) => current.filter((card) => card.key !== key));
    if (selectedDeckKey === key) setSelectedDeckKey(null);
  };

  const updateDeckCard = (key: string, patch: Partial<MemoryDeckCard>) => {
    setEditableDeck((current) => current.map((card) => card.key === key ? { ...card, ...patch } : card));
  };

  const startMulti = () => {
    setRemoteError(null);
    setMode("multi");
    if (!activeLobbyId) {
      const message = "Tritt zuerst einer Lobby bei.";
      setRemoteError(message);
      setLiveMessage(message);
      return;
    }
    if (!deckReady) {
      const message = playableDeck.length < pairCount
        ? `Fuer ${pairCount} Paare brauchst du ${pairCount} Bilder im Deck.`
        : "Ein Deck braucht mindestens zwei Bilder.";
      setRemoteError(message);
      setLiveMessage(message);
      return;
    }
    startMemoryGame(activeLobbyId, playableDeck, { pairCount, maxMoves }, (res) => {
      if (!res.ok) {
        const message = res.error ?? "Memory konnte nicht gestartet werden.";
        setRemoteError(message);
        setLiveMessage(message);
      } else {
        setDeck(selectedPlayableDeck);
        setLiveMessage("Lobby-Spiel gestartet.");
      }
    });
  };

  const flipLocalCard = (cardId: string) => {
    if (localLocked || localStatus !== "playing") return;
    const picked = localCards.find((card) => card.id === cardId);
    if (!picked || picked.isFlipped || picked.isMatched) return;

    const nextCards = localCards.map((card) =>
      card.id === cardId ? { ...card, isFlipped: true } : card
    );
    setLocalCards(nextCards);

    if (!localFirstPick) {
      setLocalFirstPick(cardId);
      setLiveMessage(`${picked.title} aufgedeckt. Waehle eine zweite Karte.`);
      return;
    }

    const nextMoveCount = localMoves + 1;
    setLocalMoves(nextMoveCount);
    const first = nextCards.find((card) => card.id === localFirstPick);
    if (first?.pairId === picked.pairId) {
      const allMatched = nextCards.every((card) => card.isMatched || card.pairId === picked.pairId);
      setLocalCards((cards) =>
        cards.map((card) =>
          card.pairId === picked.pairId ? { ...card, isMatched: true } : card
        )
      );
      setLocalFirstPick(null);
      if (allMatched) {
        setLocalStatus("finished");
        setLiveMessage("Solo-Spiel abgeschlossen. Alle Paare wurden gefunden.");
      } else if (maxMoves !== null && nextMoveCount >= maxMoves) {
        setLocalStatus("lost");
        setLiveMessage("Zuglimit erreicht. Du hast das Solo-Spiel verloren.");
      } else {
        setLiveMessage(`Paar gefunden: ${picked.title}.`);
      }
      return;
    }

    const firstPickId = localFirstPick;
    const secondPickId = cardId;
    setLocalLocked(true);
    setLiveMessage(`${first?.title ?? "Karte"} und ${picked.title} passen nicht zusammen.`);
    window.setTimeout(() => {
      setLocalCards((cards) =>
        cards.map((card) =>
          card.id === secondPickId || card.id === firstPickId
            ? { ...card, isFlipped: false }
            : card
        )
      );
      setLocalFirstPick(null);
      setLocalLocked(false);
      if (maxMoves !== null && nextMoveCount >= maxMoves) {
        setLocalStatus("lost");
        setLiveMessage("Zuglimit erreicht. Du hast das Solo-Spiel verloren.");
      } else {
        setLiveMessage("Die Karten wurden wieder verdeckt.");
      }
    }, 1600);
  };

  const handleCardClick = (card: MemoryCard) => {
    if (card.isFlipped || card.isMatched) return;

    if (mode === "solo") {
      flipLocalCard(card.id);
      return;
    }
    if (!activeLobbyId || remoteState?.locked || remoteState?.currentPlayerId !== socket.id) return;
    setLiveMessage(`${card.title} ausgewaehlt.`);
    flipMemoryCard(activeLobbyId, card.id);
  };

  const handleCardKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    const columns = gridStep(activeCards.length);
    let nextIndex = index;

    if (event.key === "ArrowRight") nextIndex = Math.min(activeCards.length - 1, index + 1);
    else if (event.key === "ArrowLeft") nextIndex = Math.max(0, index - 1);
    else if (event.key === "ArrowDown") nextIndex = Math.min(activeCards.length - 1, index + columns);
    else if (event.key === "ArrowUp") nextIndex = Math.max(0, index - columns);
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = activeCards.length - 1;
    else return;

    event.preventDefault();
    cardRefs.current[nextIndex]?.focus();
  };

  const loadSearchSuggestions = async () => {
    const trimmed = query.trim();
    if (!trimmed) return;
    setLoadingDeck(true);
    setDeckMessage(null);
    try {
      const images = await searchImages(trimmed);
      const nextSuggestions = images.slice(0, MAX_PAIRS).map((img: { alt?: string; url: string }, index: number) => ({
        key: makeId(`suggestion-${index}`),
        title: img.alt || `${trimmed} ${index + 1}`,
        imageUrl: img.url,
      }));
      if (nextSuggestions.length === 0) {
        const message = "Keine passenden Bilder gefunden.";
        setDeckMessage(message);
        setLiveMessage(message);
        return;
      }
      setSuggestions(nextSuggestions);
      setDeckPanel("search");
      setDeckMessage(`${nextSuggestions.length} Vorschlaege gefunden. Waehle nur passende Bilder aus.`);
      setLiveMessage(`${nextSuggestions.length} Vorschlaege gefunden.`);
    } catch {
      const message = "Bildersuche konnte nicht geladen werden.";
      setDeckMessage(message);
      setLiveMessage(message);
    } finally {
      setLoadingDeck(false);
    }
  };

  const loadDrawingDeck = async () => {
    setLoadingDeck(true);
    setDeckMessage(null);
    try {
      const drawings = await listDrawings();
      const nextDeck = drawings.slice(0, MAX_PAIRS).map((drawing) => ({
        title: drawing.title,
        imageUrl: drawing.thumbnail,
      }));
      if (nextDeck.length < 2) {
        const message = "Du brauchst mindestens zwei gespeicherte Zeichnungen.";
        setDeckMessage(message);
        setLiveMessage(message);
        return;
      }
      applyDeck(nextDeck, `${nextDeck.length} gespeicherte Zeichnungen geladen. Solo wurde neu gemischt.`);
    } catch {
      const message = "Melde dich an, um eigene Zeichnungen zu laden.";
      setDeckMessage(message);
      setLiveMessage(message);
    } finally {
      setLoadingDeck(false);
    }
  };

  const handleUpload = (files: FileList | null) => {
    if (!files?.length) return;
    const readers = Array.from(files).slice(0, MAX_PAIRS).map((file) => new Promise<MemoryDeckCard>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve({ title: file.name.replace(/\.[^.]+$/, ""), imageUrl: String(reader.result) });
      reader.readAsDataURL(file);
    }));
    Promise.all(readers).then((cards) => {
      if (cards.length >= 2) {
        applyDeck(cards, `${cards.length} hochgeladene Bilder geladen. Solo wurde neu gemischt.`);
      }
    });
  };

  const addManualImage = () => {
    const imageUrl = manualUrl.trim();
    if (!imageUrl) return;
    addToDeck({ title: manualTitle.trim() || "Eigenes Bild", imageUrl });
    setManualTitle("");
    setManualUrl("");
  };

  const resetRemote = () => {
    if (activeLobbyId) resetMemoryGame(activeLobbyId);
    setLiveMessage("Lobby-Spiel beendet.");
  };

  return (
    <div className="memory-page" aria-labelledby="memory-title">
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {liveMessage}
      </div>

      <section className="memory-toolbar" aria-describedby="memory-summary">
        <div>
          <h1 id="memory-title">Memory</h1>
          <p id="memory-summary">
            {mode === "multi" ? `Lobby: ${activeLobbyName ?? "Keine Lobby"}` : "Solo-Spiel mit deinem Deck"}
          </p>
        </div>

        <div className="memory-mode" role="group" aria-label="Spielmodus">
          <button className={mode === "solo" ? "is-active" : ""} aria-pressed={mode === "solo"} onClick={() => setMode("solo")}>
            Solo
          </button>
          <button className={mode === "multi" ? "is-active" : ""} aria-pressed={mode === "multi"} onClick={() => setMode("multi")}>
            Lobby
          </button>
        </div>
      </section>

      <div className="memory-layout">
        <aside className="memory-panel" aria-labelledby="memory-deck-title">
          <h2 id="memory-deck-title">Decks</h2>
          <p className="memory-help">
            Stelle dein Deck selbst zusammen. Suche liefert nur Vorschlaege; uebernimm nur Bilder, die wirklich passen.
          </p>

          <div className="memory-editor-summary" aria-live="polite">
            <strong>{playableDeck.length}</strong>
            <span>Bilder im Deck</span>
          </div>

          <div className="memory-settings" aria-label="Spielregeln">
            <label>
              Paare
              <select value={pairCount} onChange={(e) => setPairCount(Number(e.target.value))}>
                {Array.from({ length: MAX_PAIRS - 1 }, (_, index) => index + 2).map((count) => (
                  <option key={count} value={count}>
                    {count} Paare
                  </option>
                ))}
              </select>
            </label>
            <label>
              Zuglimit
              <select value={moveLimitMode} onChange={(e) => setMoveLimitMode(e.target.value as typeof moveLimitMode)}>
                <option value="unlimited">Unendlich</option>
                <option value="20">20 Zuege</option>
                <option value="50">50 Zuege</option>
                <option value="custom">Eigenes Limit</option>
              </select>
            </label>
            {moveLimitMode === "custom" && (
              <label>
                Max. Zuege
                <input
                  type="number"
                  min={1}
                  max={999}
                  value={customMoveLimit}
                  onChange={(e) => setCustomMoveLimit(Number(e.target.value))}
                />
              </label>
            )}
          </div>

          {playableDeck.length < pairCount && (
            <p className="memory-note" role="status">
              Fuer {pairCount} Paare brauchst du {pairCount} Bilder im Deck.
            </p>
          )}

          <div className="memory-deck-tabs" role="tablist" aria-label="Deck bearbeiten">
            <button className={deckPanel === "deck" ? "is-active" : ""} role="tab" aria-selected={deckPanel === "deck"} onClick={() => setDeckPanel("deck")}>
              Deck
            </button>
            <button className={deckPanel === "search" ? "is-active" : ""} role="tab" aria-selected={deckPanel === "search"} onClick={() => setDeckPanel("search")}>
              Suchen
            </button>
            <button className={deckPanel === "add" ? "is-active" : ""} role="tab" aria-selected={deckPanel === "add"} onClick={() => setDeckPanel("add")}>
              Hinzufuegen
            </button>
          </div>

          {deckPanel === "deck" && (
            <div className="memory-panel-section" role="tabpanel">
              <div className="memory-current-deck" aria-label="Aktuelles Deck bearbeiten">
                {editableDeck.map((card) => (
                  <button
                    className={`memory-deck-tile ${selectedDeckKey === card.key ? "is-selected" : ""}`}
                    key={card.key}
                    onClick={() => setSelectedDeckKey(card.key)}
                    aria-label={`${card.title} bearbeiten`}
                  >
                    <img src={card.imageUrl} alt="" />
                    <span>{card.title}</span>
                  </button>
                ))}
              </div>

              {selectedDeckKey && editableDeck.find((card) => card.key === selectedDeckKey) && (
                <div className="memory-selected-editor">
                  {editableDeck
                    .filter((card) => card.key === selectedDeckKey)
                    .map((card) => (
                      <div key={card.key}>
                        <label>
                          Titel
                          <input
                            value={card.title}
                            onChange={(e) => updateDeckCard(card.key, { title: e.target.value })}
                          />
                        </label>
                        <button className="memory-small-btn" onClick={() => removeFromDeck(card.key)}>
                          Bild entfernen
                        </button>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {deckPanel === "search" && (
            <div className="memory-panel-section" role="tabpanel">
              <div className="memory-search">
                <label className="sr-only" htmlFor="memory-search-input">Bilder fuer Memory suchen</label>
                <input
                  id="memory-search-input"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") loadSearchSuggestions();
                  }}
                  placeholder="z.B. Katze, Auto ..."
                />
                <button className="btn btn-secondary" onClick={loadSearchSuggestions} disabled={loadingDeck}>
                  Suchen
                </button>
              </div>

              <div className="memory-suggestions" aria-label="Suchvorschlaege">
                {suggestions.length === 0 ? (
                  <p className="memory-note">Suche nach Bildern und tippe passende Vorschlaege an.</p>
                ) : suggestions.map((card) => {
                  const isDuplicate = editableDeck.some((deckCard) => normalizeImageUrl(deckCard.imageUrl) === normalizeImageUrl(card.imageUrl));
                  return (
                    <button
                      key={card.key}
                      className={`memory-suggestion ${isDuplicate ? "is-added" : ""}`}
                      onClick={() => addToDeck(card)}
                      disabled={editableDeck.length >= MAX_PAIRS || isDuplicate}
                      aria-label={isDuplicate ? `${card.title} ist schon im Deck` : `${card.title} zum Deck hinzufuegen`}
                    >
                      <img src={card.imageUrl} alt="" />
                      <span>{card.title}</span>
                      <strong>{isDuplicate ? "Drin" : "+"}</strong>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {deckPanel === "add" && (
            <div className="memory-panel-section" role="tabpanel">
              <div className="memory-actions memory-actions-compact">
                <button className="btn btn-secondary" onClick={() => applyDeck(DEFAULT_DECK, "Standardbilder geladen. Solo wurde neu gemischt.")}>
                  Standarddeck
                </button>
                <button className="btn btn-secondary" onClick={loadDrawingDeck} disabled={loadingDeck}>
                  Gespeicherte Zeichnungen
                </button>
                <label className="memory-upload">
                  Bilder hochladen
                  <input aria-label="Eigene Bilder fuer Memory hochladen" type="file" accept="image/*" multiple hidden onChange={(e) => handleUpload(e.target.files)} />
                </label>
              </div>

              <div className="memory-manual">
                <label>
                  Titel
                  <input value={manualTitle} onChange={(e) => setManualTitle(e.target.value)} placeholder="z.B. Katze" />
                </label>
                <label>
                  Bild-URL
                  <input value={manualUrl} onChange={(e) => setManualUrl(e.target.value)} placeholder="https://..." />
                </label>
                <button className="btn btn-secondary" onClick={addManualImage} disabled={!manualUrl.trim() || editableDeck.length >= MAX_PAIRS}>
                  Bild hinzufuegen
                </button>
              </div>
            </div>
          )}

          {deckMessage && <p className="memory-note" role="status">{deckMessage}</p>}
          {!isAuthenticated && (
            <p className="memory-note">
              Fuer gespeicherte Zeichnungen musst du eingeloggt sein. Bilder hochladen funktioniert auch ohne Login.
            </p>
          )}

          <div className="memory-actions">
            <button className="btn btn-secondary" onClick={useEditorDeck} disabled={!deckReady}>
              Deck uebernehmen
            </button>
            <button className="btn btn-secondary" onClick={() => startSolo(selectedPlayableDeck)} disabled={!deckReady}>
              Solo mit Deck starten
            </button>
            <button className="btn btn-secondary" onClick={startMulti} disabled={!activeLobbyId || !deckReady}>
              Lobby-Spiel starten
            </button>
            {mode === "multi" && remoteState && (
              <button className="btn" onClick={resetRemote}>
                Lobby-Spiel beenden
              </button>
            )}
          </div>

          {remoteError && <p className="memory-error" role="alert">{remoteError}</p>}
        </aside>

        <section className="memory-board-wrap" aria-labelledby="memory-board-title">
          <h2 id="memory-board-title" className="sr-only">Spielfeld</h2>
          <div className="memory-status" aria-live="polite">
            <span>{turnLabel}</span>
            <span>{matchedPairs}/{totalPairs} Paare</span>
            <span>
              {mode === "solo" ? localMoves : remoteState?.moves ?? 0}
              {moveLimitLabel === null ? "" : `/${moveLimitLabel}`} Zuege
            </span>
          </div>
          <p className="memory-hint" role="status">{selectionHint}</p>

          {mode === "multi" && !remoteState ? (
            <div className="memory-empty">
              <h2>Noch kein Lobby-Spiel</h2>
              <p>Starte ein Spiel mit dem aktuellen Deck, sobald du in einer Lobby bist.</p>
            </div>
          ) : (
            <div className="memory-board" role="list" aria-label={`Memory Spielfeld mit ${activeCards.length} Karten`}>
              {activeCards.map((card, index) => (
                <button
                  key={card.id}
                  ref={(el) => {
                    cardRefs.current[index] = el;
                  }}
                  className={`memory-card ${card.isFlipped || card.isMatched ? "is-open" : ""} ${card.isMatched ? "is-matched" : ""}`}
                  onClick={() => handleCardClick(card)}
                  onKeyDown={(event) => handleCardKeyDown(event, index)}
                  disabled={card.isFlipped || card.isMatched || (mode === "solo" && (localLocked || localStatus !== "playing")) || (mode === "multi" && (!!remoteState?.locked || !canPlayRemote || remoteState?.status !== "playing"))}
                  title={
                    card.isMatched
                      ? "Dieses Paar wurde schon gefunden."
                      : card.isFlipped
                        ? "Diese Karte ist bereits offen."
                      : mode === "multi" && !canPlayRemote
                        ? "Warte, bis du dran bist."
                        : mode === "multi" && remoteState?.locked
                          ? "Kurz warten."
                          : "Karte auswaehlen"
                  }
                  aria-pressed={card.isFlipped || card.isMatched}
                  aria-label={
                    card.isMatched
                      ? `Gefundenes Paar: ${card.title}`
                      : card.isFlipped
                        ? `Offene Karte: ${card.title}`
                        : `Verdeckte Karte ${index + 1}`
                  }
                >
                  <span className="memory-card__back" aria-hidden="true">?</span>
                  <span className="memory-card__front" aria-hidden={!card.isFlipped && !card.isMatched}>
                    {card.imageUrl && <img src={card.imageUrl} alt="" />}
                    <small>{card.title}</small>
                  </span>
                </button>
              ))}
            </div>
          )}

          {mode === "multi" && remoteState && (
            <div className="memory-score" aria-label="Punktestand">
              {remoteState.players.map((player) => (
                <span key={player.id} className={player.id === remoteState.currentPlayerId ? "is-turn" : ""}>
                  {player.username}: {player.score}
                </span>
              ))}
            </div>
          )}

          {(soloFinished || remoteState?.status === "finished") && (
            <div className="memory-finished" role="status">
              <strong>Fertig!</strong>
              <span>Alle Paare wurden gefunden.</span>
            </div>
          )}
          {(soloLost || remoteState?.status === "lost") && (
            <div className="memory-finished memory-lost" role="status">
              <strong>Verloren</strong>
              <span>Das Zuglimit wurde erreicht.</span>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
