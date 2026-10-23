// Copyright 2026 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

export interface FormattedStageLabel {
  id: string;
  fullName: string;
  shortName: string;
  subTitle: string;
  badge: string;
  description: string;
}

/**
 * Transforms raw stage abbreviations (base, inv1, dom1, agg1, c1) into
 * descriptive, user-friendly full-spelling names with bilingual semantics.
 */
export function formatStageLabel(
  label: string,
  tx?: (zh: string, en: string) => string
): FormattedStageLabel {
  const t = tx || ((zh: string, _en: string) => zh);
  const raw = (label || '').trim();
  const lower = raw.toLowerCase();

  // 1. Base / Baseline
  if (lower.startsWith('base')) {
    const num = raw.replace(/\D/g, '') || '1';
    return {
      id: raw,
      shortName: `Baseline-${num}`,
      fullName: `Baseline-${num} ${t('(初始基准)', '(Baseline)')}`,
      subTitle: t('初始未优化基准', 'Unmodified Baseline'),
      badge: t('初始基准', 'Baseline'),
      description: t(
        '智能体无脚手架状态下的初始原生执行轨迹，作为后续一切递归优化的对照基准。',
        'Initial bare execution trajectory used as the reference baseline for recursive adaptation.'
      ),
    };
  }

  // 2. Invariant (inv)
  if (lower.startsWith('inv')) {
    const num = raw.replace(/\D/g, '') || '1';
    return {
      id: raw,
      shortName: `Invariant-${num}`,
      fullName: `Invariant-${num} ${t('(通用工程层)', '(General Invariant)')}`,
      subTitle: t('通用工程与工具容错', 'Engineering Invariant'),
      badge: t('通用工程 (INV)', 'Invariant'),
      description: t(
        '聚焦工具调用错误捕获、环境降级重试与流程控制等通用工程不变层优化。',
        'Invariant dimension candidate targeting tool error recovery, formatting, and general procedures.'
      ),
    };
  }

  // 3. Domain (dom)
  if (lower.startsWith('dom')) {
    const num = raw.replace(/\D/g, '') || '1';
    return {
      id: raw,
      shortName: `Domain-${num}`,
      fullName: `Domain-${num} ${t('(业务领域层)', '(Domain Specific)')}`,
      subTitle: t('专业业务技能与事实核验', 'Domain Skills & Facts'),
      badge: t('业务领域 (DOM)', 'Domain'),
      description: t(
        '聚焦当前专业执业领域的特定技能（如反垄断法审查指南、财务复核、案卷事实对齐）。',
        'Domain dimension candidate focusing on industry standards, specialized skills, and verified facts.'
      ),
    };
  }

  // 4. Aggregated Final in Parallel Mode (agg)
  if (lower.startsWith('agg')) {
    const num = raw.replace(/\D/g, '') || '1';
    return {
      id: raw,
      shortName: `Aggregated-${num}`,
      fullName: `Aggregated-${num} ${t('(并行融合终选 🏆)', '(Aggregated Final 🏆)')}`,
      subTitle: t('并行组合精炼交付物', 'Parallel Composed Deliverable'),
      badge: t('并行融合 (COMPOSE 🏆)', 'Aggregated 🏆'),
      description: t(
        '并行递归模式下融合 Invariant 与 Domain 双方优势的最终组合套件产物，在双盲评审中胜出并采纳。',
        'Composed final deliverable synthesizing both invariant & domain candidates, chosen by blind selection.'
      ),
    };
  }

  // 5. Composed Final in Sequential Mode (c1, c2, seq)
  if (lower.startsWith('c') || lower.startsWith('seq')) {
    const num = raw.replace(/\D/g, '') || '1';
    return {
      id: raw,
      shortName: `Composed-${num}`,
      fullName: `Composed-${num} ${t('(序列精炼终选 🏆)', '(Sequential Final 🏆)')}`,
      subTitle: t('序列递进组合交付物', 'Sequential Refined Deliverable'),
      badge: t('序列精炼 (COMPOSE 🏆)', 'Composed 🏆'),
      description: t(
        '序列模式下经历单链逐级迭代递进沉淀出的最终落地套件，在双盲评审中胜出并采纳。',
        'Sequential multi-turn refined deliverable produced through chained improvement steps.'
      ),
    };
  }

  // Fallback for custom or unknown stages
  return {
    id: raw,
    shortName: raw,
    fullName: raw,
    subTitle: t('自定义演进阶段', 'Custom Stage'),
    badge: raw.toUpperCase(),
    description: t('演进流水线执行阶段', 'Pipeline execution stage'),
  };
}
