export interface DaySchedule {
  open?: boolean;
  timeslot?: Array<{ start: number; end: number }>;
}

export interface FicheAPI {
  lieu_id: number;
  name: string;
  seo_url?: string;
  description?: string;
  entity?: {
    mail?: string;
    phones?: Array<{ label?: string; phoneNumber: string }>;
  };
  newhours?: {
    closedHolidays?: "UNKNOWN" | "OPEN" | "CLOSED";
    description?: string;
    monday?: DaySchedule;
    tuesday?: DaySchedule;
    wednesday?: DaySchedule;
    thursday?: DaySchedule;
    friday?: DaySchedule;
    saturday?: DaySchedule;
    sunday?: DaySchedule;
  };
  modalities?: {
    appointment?: { checked?: boolean; precisions?: string };
    inscription?: { checked?: boolean; precisions?: string };
    orientation?: { checked?: boolean; precisions?: string };
    price?: { checked?: boolean; precisions?: string };
    other?: string;
  };
  publics?: { description?: string };
  services_all?: Array<{ description?: string }>;
  tempInfos?: {
    closure?: { description?: string };
    hours?: { description?: string };
    message?: { description?: string; name?: string };
  };
}

export interface RuleResult {
  id: string;
  label: string;
  section: string;
  type: "bonus" | "malus";
  points: number;
  max: number;
  detail: string;
}

export interface FicheScore {
  lieu_id: number;
  name: string;
  seo_url?: string;
  score_total: number;
  score_bonus: number;
  score_malus: number;
  composantes: RuleResult[];
}
