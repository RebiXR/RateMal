export type MemoryCardInput = {
  title: string;
  imageUrl: string;
};

export type PublicMemoryCard = {
  id: string;
  pairId: string;
  title: string;
  imageUrl?: string;
  isFlipped: boolean;
  isMatched: boolean;
};

export type MemoryPlayer = {
  id: string;
  username: string;
  score: number;
};

type MemoryCard = {
  id: string;
  pairId: string;
  title: string;
  imageUrl: string;
  isFlipped: boolean;
  isMatched: boolean;
};

export type MemoryGame = {
  id: string;
  lobbyId: string;
  cards: MemoryCard[];
  players: MemoryPlayer[];
  currentTurnIndex: number;
  firstPickId: string | null;
  secondPickId: string | null;
  locked: boolean;
  moves: number;
  status: "playing" | "finished" | "lost";
  maxMoves: number | null;
  createdAt: number;
};

export type PublicMemoryGame = Omit<MemoryGame, "cards" | "firstPickId" | "secondPickId" | "createdAt"> & {
  cards: PublicMemoryCard[];
  currentPlayerId: string | null;
  matchedPairs: number;
  totalPairs: number;
};

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function makeId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}-${Date.now().toString(36)}`;
}

export function createMemoryGame(
  lobbyId: string,
  deck: MemoryCardInput[],
  participants: { id: string; username: string }[],
  options: { pairCount?: number; maxMoves?: number | null } = {}
): MemoryGame {
  const pairCount = Math.min(Math.max(Math.floor(options.pairCount ?? 8), 2), 15);
  const uniqueDeck = deck
    .filter((card) => card.imageUrl)
    .slice(0, pairCount)
    .map((card, index) => ({
      ...card,
      title: card.title?.trim() || `Bild ${index + 1}`,
    }));

  const cards = shuffle(
    uniqueDeck.flatMap((card, index) => {
      const pairId = `pair-${index}`;
      return [0, 1].map((copyIndex) => ({
        id: makeId(`card-${index}-${copyIndex}`),
        pairId,
        title: card.title,
        imageUrl: card.imageUrl,
        isFlipped: false,
        isMatched: false,
      }));
    })
  );

  return {
    id: makeId("memory"),
    lobbyId,
    cards,
    players: participants.map((participant) => ({
      ...participant,
      score: 0,
    })),
    currentTurnIndex: 0,
    firstPickId: null,
    secondPickId: null,
    locked: false,
    moves: 0,
    status: "playing",
    maxMoves: options.maxMoves ?? null,
    createdAt: Date.now(),
  };
}

export function publicMemoryGame(game: MemoryGame): PublicMemoryGame {
  const matchedPairs = new Set(game.cards.filter((card) => card.isMatched).map((card) => card.pairId));
  return {
    id: game.id,
    lobbyId: game.lobbyId,
    cards: game.cards.map((card) => ({
      id: card.id,
      pairId: card.pairId,
      title: card.title,
      imageUrl: card.isFlipped || card.isMatched ? card.imageUrl : undefined,
      isFlipped: card.isFlipped,
      isMatched: card.isMatched,
    })),
    players: game.players,
    currentTurnIndex: game.currentTurnIndex,
    currentPlayerId: game.players[game.currentTurnIndex]?.id ?? null,
    locked: game.locked,
    moves: game.moves,
    status: game.status,
    maxMoves: game.maxMoves,
    matchedPairs: matchedPairs.size,
    totalPairs: game.cards.length / 2,
  };
}

function hasReachedMoveLimit(game: MemoryGame): boolean {
  return game.maxMoves !== null && game.moves >= game.maxMoves;
}

export function syncMemoryPlayers(
  game: MemoryGame,
  participants: { id: string; username: string }[]
): void {
  const scores = new Map(game.players.map((player) => [player.id, player.score]));
  game.players = participants.map((participant) => ({
    id: participant.id,
    username: participant.username,
    score: scores.get(participant.id) ?? 0,
  }));

  if (game.currentTurnIndex >= game.players.length) {
    game.currentTurnIndex = 0;
  }
}

export function flipMemoryCard(
  game: MemoryGame,
  cardId: string,
  playerId: string
): { changed: boolean; mismatch?: boolean } {
  if (game.status !== "playing" || game.locked || game.players.length === 0) {
    return { changed: false };
  }

  const currentPlayer = game.players[game.currentTurnIndex];
  if (currentPlayer?.id !== playerId) return { changed: false };

  const card = game.cards.find((item) => item.id === cardId);
  if (!card || card.isMatched || card.isFlipped) return { changed: false };

  card.isFlipped = true;

  if (!game.firstPickId) {
    game.firstPickId = card.id;
    return { changed: true };
  }

  game.secondPickId = card.id;
  game.moves += 1;

  const firstCard = game.cards.find((item) => item.id === game.firstPickId);
  const isMatch = firstCard?.pairId === card.pairId;

  if (isMatch && firstCard) {
    firstCard.isMatched = true;
    card.isMatched = true;
    const scorer = game.players.find((player) => player.id === playerId);
    if (scorer) scorer.score += 1;
    game.firstPickId = null;
    game.secondPickId = null;

    if (game.cards.every((item) => item.isMatched)) {
      game.status = "finished";
    } else if (hasReachedMoveLimit(game)) {
      game.status = "lost";
    }
    return { changed: true };
  }

  game.locked = true;
  if (hasReachedMoveLimit(game)) {
    game.status = "lost";
  }
  return { changed: true, mismatch: true };
}

export function hideMemoryMismatch(game: MemoryGame): void {
  if (!game.locked) return;

  const firstCard = game.cards.find((item) => item.id === game.firstPickId);
  const secondCard = game.cards.find((item) => item.id === game.secondPickId);
  if (firstCard && !firstCard.isMatched) firstCard.isFlipped = false;
  if (secondCard && !secondCard.isMatched) secondCard.isFlipped = false;

  game.firstPickId = null;
  game.secondPickId = null;
  game.locked = false;
  if (game.players.length > 0) {
    game.currentTurnIndex = (game.currentTurnIndex + 1) % game.players.length;
  }
}
