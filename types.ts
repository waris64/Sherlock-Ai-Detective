
export interface Evidence {
  x: number;
  y: number;
  width: number;
  height: number;
  description: string;
}

export interface Deduction {
  title: string;
  detail: string;
  confidence: number;
  evidence: Evidence[];
  illustration_overlay?: string;
}

export interface ScanData {
  gender: string;
  age_range: string;
  environment: string;
  attention_score?: number;
  posture_score?: number;
  stance?: string;
  balance?: string;
}

export interface SherlockAnalysis {
  session_id: string;
  scan_data: ScanData;
  deductions: Deduction[];
  final_assessment: string;
  session_memory: string[];
}
