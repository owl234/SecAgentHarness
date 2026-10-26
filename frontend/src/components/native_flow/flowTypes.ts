import React from 'react';
import { ComponentCategory } from '../../types';

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
  stage?: 1 | 2 | 3 | 4 | 5;
  stepIndex?: number;
  branch?: 'main' | 'inv' | 'dom';
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
  formulaExplanationZh?: string;
  formulaExplanationEn?: string;
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
  componentCodes?: ComponentCategory[];
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
