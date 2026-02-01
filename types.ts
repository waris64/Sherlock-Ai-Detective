
export interface Evidence {
  x: number;
  y: number;
  width: number;
  height: number;
  description: string;
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface Deduction {
  title: string;
  detail: string;
  confidence: number;
  evidence: Evidence[];
  logic_steps: string[]; // Chain of thought for the "Science of Deduction"
  grounding?: GroundingSource[];
}

export interface ScanData {
  gender: string;
  age_range: string;
  environment: string;
  attention_score: number;
  posture_score: number;
  stance: string;
  balance: string;
}

export interface SherlockAnalysis {
  session_id: string;
  scan_data: ScanData;
  deductions: Deduction[];
  final_assessment: string;
  session_memory: string[];
}
