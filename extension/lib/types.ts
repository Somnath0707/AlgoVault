export interface Problem {
  id?: number;
  frontendId?: number;
  title: string;
  titleSlug: string;
  difficulty?: string;
  actualRating?: number;
  tags?: string[];
  acceptanceRate?: number;
  contestSlug?: string;
  problemIndex?: string;
  isPremium?: boolean;
}

export interface PredictionResult {
  solveChance: number;
  expectedTimeMinutes: number;
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
  breakdown?: Record<string, any>;
}
