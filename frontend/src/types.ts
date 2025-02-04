export interface VideoDescriptionItem {
  startTime: number;
  endTime: number;
  description: string;
  audioFile?: string;
  isEdited: boolean; // New flag
}
