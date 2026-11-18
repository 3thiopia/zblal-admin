export type ArcadePlayerStatus = 'Active' | 'Suspended';

export type ArcadeScoreValidationStatus = 'Valid' | 'Pending' | 'Flagged' | 'Invalid';

export type ArcadeCompetitionType = 'daily' | 'weekly';

export type ArcadeCompetitionStatus =
  | 'Draft'
  | 'Upcoming'
  | 'Active'
  | 'Paused'
  | 'Completed'
  | 'Cancelled';

export type ArcadeWinnerApprovalStatus = 'Pending' | 'Approved' | 'Rejected';

export type ArcadePrizeStatus = 'Pending' | 'Awarded' | 'Forfeited';

export interface ArcadePlayer {
  id: string;
  nickname: string;
  phone_e164: string;
  registeredAt: string;
  status: ArcadePlayerStatus;
  isActive: boolean;
  lastActivityAt?: string;
  internalNotes?: string;
}

export interface ArcadeGame {
  id: string;
  slug: string;
  name: string;
  nameAm?: string;
  description: string;
  isActive: boolean;
  isComingSoon: boolean;
  displayOrder: number;
  scoreUnit: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ArcadeGameSession {
  id: string;
  playerId: string;
  gameId: string;
  competitionId?: string;
  status: string;
  startedAt: string;
  endedAt?: string;
  durationSeconds?: number;
}

export interface ArcadeScore {
  id: string;
  playerId: string;
  gameId: string;
  sessionId?: string;
  competitionId?: string;
  score: number;
  validationStatus: ArcadeScoreValidationStatus;
  isValid: boolean;
  submittedAt: string;
  rawValidation?: string;
}

export interface ArcadeCompetition {
  id: string;
  name: string;
  competitionType: ArcadeCompetitionType;
  startsAt: string;
  endsAt: string;
  status: ArcadeCompetitionStatus;
  prizeDescription: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ArcadeCompetitionGame {
  id: string;
  competitionId: string;
  gameId: string;
  displayOrder?: number;
}

export interface ArcadeWinner {
  id: string;
  competitionId: string;
  playerId: string;
  gameId?: string;
  rank: number;
  finalScore: number;
  overallPoints: number;
  approvalStatus: ArcadeWinnerApprovalStatus;
  prizeStatus: ArcadePrizeStatus;
  internalNotes?: string;
  approvedBy?: string;
  approvedAt?: string;
  awardedBy?: string;
  awardedAt?: string;
  createdAt: string;
}

export interface ArcadeGameLeaderboardEntry {
  rank: number;
  isTied: boolean;
  placementPoints: number;
  playerId: string;
  playerNickname: string;
  playerPhone: string;
  playerStatus: ArcadePlayerStatus;
  gameId: string;
  gameName: string;
  bestScore: number;
  scoreUnit: string;
  submittedAt: string;
  validationStatus: ArcadeScoreValidationStatus;
  attemptsCount: number;
}

export interface ArcadeOverallStandingEntry {
  rank: number;
  isTied: boolean;
  playerId: string;
  playerNickname: string;
  playerPhone: string;
  playerStatus: ArcadePlayerStatus;
  totalPoints: number;
  gamesScoredCount: number;
  firstPlaceCount: number;
  bestPlacement: number;
  latestAchievedAt: string;
  gameBreakdown: Array<{
    gameId: string;
    gameName: string;
    rank: number;
    bestScore: number;
    placementPoints: number;
    isTied: boolean;
  }>;
}

export interface ArcadeDataset {
  players: ArcadePlayer[];
  games: ArcadeGame[];
  sessions: ArcadeGameSession[];
  scores: ArcadeScore[];
  competitions: ArcadeCompetition[];
  competitionGames: ArcadeCompetitionGame[];
  winners: ArcadeWinner[];
}
