/**
 * 住得明白｜AI Rental Property Analyzer - 全域型別定義
 * 依據 SKILL.md 方法論與 12 大決策分析模組定義
 */

export type EvidenceStatus = 'verified' | 'reported' | 'observed' | 'estimated' | 'unknown';
export type ConfidenceLevel = 'high' | 'medium' | 'low';
export type RiskGrade = 'Critical' | 'High' | 'Medium' | 'Low';
export type RiskGateStatus = '通過 (Clear)' | '條件式通過 (Conditional)' | '未通過 (Blocked)';
export type RecommendationLevel =
  | '強力推薦 (Strongly recommend)'
  | '附條件推薦 (Recommend with conditions)'
  | '列入考慮 (Consider)'
  | '不建議 (Do not recommend)'
  | '強烈排除 (Reject)';

export type CrossCheckStatus =
  | '證實屬實 (Confirmed)'
  | '部分證實 (Partly confirmed)'
  | '尚待查證 (Unverified)'
  | '事實矛盾/偏誤 (Contradicted)';

export type AIProvider = 'openai' | 'gemini' | 'claude' | 'ollama' | 'local';

// ==========================================
// 1. 物件與家庭資料模型 (Property & Household)
// ==========================================

export interface AspectNote {
  rating?: 'positive' | 'neutral' | 'negative' | '';
  now?: string;
  future?: string;
}

export interface SubjectiveNotes {
  overallRating?: number;
  decision?: '優先考慮' | '值得議價' | '列入備選' | '淘汰' | (string & {});
  highlightPros?: string;
  dealBreakerCons?: string;
  aspects?: {
    transportation?: AspectNote;
    school?: AspectNote;
    condition?: AspectNote;
    neighborhood?: AspectNote;
  };
  familyNotes?: string;
}

export interface PropertyCosts {
  managementFee?: string;
  parkingFee?: string;
  subsidy?: string;
}

export interface Property {
  id: string;
  name: string;
  type: string;
  address: string;
  rent: number;
  size: string;
  layout: string;
  floor: string;
  age: string;
  costs?: PropertyCosts;
  leaseTerms?: string;
  amenities?: string;
  trafficAndSchool?: string;
  url?: string;
  subjective?: SubjectiveNotes;
}

export interface HouseholdMember {
  role: string;
  age?: number;
  note?: string;
}

export interface CommuteLocation {
  who: string;
  location: string;
}

export interface IncomeEntry {
  who: string;
  amount: number;
}

export interface Household {
  members: HouseholdMember[];
  commute: CommuteLocation[];
  currentAddress?: string;
  currentArea?: string;
  income?: {
    entries: IncomeEntry[];
    other?: string;
  };
  requirements: string[];
}

// ==========================================
// 2. SKILL.md 12 大決策模組回傳結果
// ==========================================

export interface RankingItem {
  propertyName: string;
  rank: number;
  overallScore: number;
  verdict: string;
}

export interface ConclusionFirst {
  rankings: RankingItem[];
  caveat: string;
}

export interface EvidenceItem {
  item: string;
  finding: string;
  status: EvidenceStatus;
  confidence: ConfidenceLevel;
}

export interface PropertyEvidence {
  propertyName: string;
  items: EvidenceItem[];
}

export interface PropertyCostAndValue {
  propertyName: string;
  monthlyAllInCost: string;
  annualAllInCost: string;
  unitCostCalculation: string;
  marketConclusion: string;
}

export interface SWOTDimension {
  score: number;
  hasWarning?: boolean;
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
  keyInsight: string;
}

export interface PropertySWOT {
  propertyName: string;
  rankLabel: string;
  transport: SWOTDimension;
  school: SWOTDimension;
  spaceAndCondition: SWOTDimension;
  neighbourhood: SWOTDimension;
}

export interface ScorecardDimension {
  dimensionName: string;
  score: number;
  weight: string;
  rationale: string;
}

export interface PropertyScorecard {
  propertyName: string;
  dimensions: ScorecardDimension[];
  weightedTotalScore: number;
  riskGateStatus: RiskGateStatus;
}

export interface RiskItem {
  riskName: string;
  grade: RiskGrade;
  evidence: string;
  consequence: string;
  mitigation: string;
  responsibleParty: string;
  decisionImpact: string;
}

export interface PropertyRiskAssessment {
  propertyName: string;
  maintenanceResponsibility: string;
  hiddenCostEstimate: string;
  riskVerdict: string;
  risks: RiskItem[];
}

export interface PropertyRecommendation {
  propertyName: string;
  recommendationLevel: RecommendationLevel;
  rationale: string;
}

export interface CrossCheckCheckItem {
  residentItem: string;
  resultStatus: CrossCheckStatus;
  objectiveEvidence: string;
  decisionImplication: string;
}

export interface PropertyCrossCheck {
  propertyName: string;
  checks: CrossCheckCheckItem[];
}

export interface CostComparisonProperty {
  propertyName: string;
  originalMonthlyCost: string;
  estimatedSubsidizedCost: string;
  note: string;
}

export interface CostComparison {
  properties: CostComparisonProperty[];
  insight: string;
}

export interface RealQuestionOption {
  label: string;
  description: string;
  relevantProperties: string[];
}

export interface TheRealQuestion {
  reframing: string;
  optionA: RealQuestionOption;
  optionB: RealQuestionOption;
}

export interface ScenarioRanking {
  scenario: string;
  ranking: string;
}

export interface RankReversal {
  condition: string;
  currentRank: string;
  reversedRank: string;
  reasoning: string;
}

export interface CriticalCheckItem {
  propertyName?: string;
  checkItem: string;
  reason: string;
}

export interface DecisionSynthesis {
  bestFitFor: string;
  consciousTradeoffs: string[];
  negotiationPoints: string[];
  criticalChecks: CriticalCheckItem[];
  finalRecommendation: string;
}

export interface VerifiedSource {
  property: string;
  topic: string;
  query: string;
  findings: string;
}

export interface ComparisonResult {
  conclusionFirst: ConclusionFirst;
  factsAndEvidence: PropertyEvidence[];
  costAndValue: PropertyCostAndValue[];
  independentSWOT: PropertySWOT[];
  objectiveScorecard: PropertyScorecard[];
  riskAssessment: PropertyRiskAssessment[];
  objectiveRecommendation: PropertyRecommendation[];
  residentCrossCheck: PropertyCrossCheck[];
  costComparison: CostComparison;
  theRealQuestion: TheRealQuestion;
  scenarioRankings: ScenarioRanking[];
  rankReversals: RankReversal[];
  decisionSynthesis: DecisionSynthesis;
  _verifiedSources?: VerifiedSource[];
}

// ==========================================
// 3. 儲存層與設定 (Store & Settings)
// ==========================================

export interface AppSettings {
  provider: AIProvider;
  model: string;
  baseUrl: string;
  enableWebSearch: boolean;
  apiKey: string;
}

export interface ReportRecord {
  id: string;
  createdAt: string;
  properties: Property[];
  household: Household | null;
  provider: string;
  model: string;
  result: ComparisonResult;
}
