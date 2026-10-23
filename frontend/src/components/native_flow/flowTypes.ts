import React from 'react';

export type FlowCategory =
  | 'entry'
  | 'core'
  | 'propose'
  | 'probe'
  | 'compose'
  | 'judge'
  | 'memory'
  | 'alert'
  | 'substrate'
  | 'bench';

export interface FlowNode {
  id: string;
  titleZh: string;
  titleEn: string;
  subtitleZh?: string;
  subtitleEn?: string;
  code?: string;
  badge?: string;
  category: FlowCategory;
  icon: React.ComponentType<{ className?: string }>;
  filePath?: string;
  formula?: string;
  descriptionZh: string;
  descriptionEn: string;
  invariantsZh?: string[];
  invariantsEn?: string[];
  inputsZh?: string[];
  inputsEn?: string[];
  outputsZh?: string[];
  outputsEn?: string[];
  actionTab?: string;
  actionLabelZh?: string;
  actionLabelEn?: string;
}

export interface FlowConnectorProps {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  label?: string;
  color?: string;
  animated?: boolean;
  dashed?: boolean;
}
