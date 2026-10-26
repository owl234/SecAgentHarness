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
 * 将原始阶段缩写标识符 (base, inv1, dom1, agg1, c1) 转化为
 * 纯正直观的中文阶段名称与语义描述。
 */
export function formatStageLabel(
  label: string,
  _tx?: (zh: string, en: string) => string
): FormattedStageLabel {
  const raw = (label || '').trim();
  const lower = raw.toLowerCase();

  // 1. Base / Baseline
  if (lower.startsWith('base')) {
    const num = raw.replace(/\D/g, '') || '1';
    return {
      id: raw,
      shortName: `初始基准-${num}`,
      fullName: `初始基准-${num} (${raw})`,
      subTitle: '初始未优化基准',
      badge: '初始基准',
      description: '智能体无额外套件干预状态下的初始原生执行轨迹，作为后续一切递归优化的对照基准。',
    };
  }

  // 2. Invariant (inv)
  if (lower.startsWith('inv')) {
    const num = raw.replace(/\D/g, '') || '1';
    return {
      id: raw,
      shortName: `通用工程-${num}`,
      fullName: `通用工程-${num} (${raw})`,
      subTitle: '通用工程与工具容错',
      badge: '通用工程',
      description: '聚焦工具调用错误捕获、环境降级重试与流程控制等通用工程不变层优化。',
    };
  }

  // 3. Domain (dom)
  if (lower.startsWith('dom')) {
    const num = raw.replace(/\D/g, '') || '1';
    return {
      id: raw,
      shortName: `业务领域-${num}`,
      fullName: `业务领域-${num} (${raw})`,
      subTitle: '专业业务技能与事实核验',
      badge: '业务领域',
      description: '聚焦当前专业领域的特定技能（如漏洞排查规范、财务复核、案卷事实对齐）。',
    };
  }

  // 4. Aggregated Final in Parallel Mode (agg)
  if (lower.startsWith('agg')) {
    const num = raw.replace(/\D/g, '') || '1';
    return {
      id: raw,
      shortName: `并行融合-${num}`,
      fullName: `并行融合-${num} (${raw} 🏆)`,
      subTitle: '并行组合精炼交付物',
      badge: '并行融合 🏆',
      description: '并行递归模式下融合通用工程与业务领域双方优势的最终组合套件产物，在双盲评审中胜出并采纳。',
    };
  }

  // 5. Composed Final in Sequential Mode (c1, c2, seq)
  if (lower.startsWith('c') || lower.startsWith('seq')) {
    const num = raw.replace(/\D/g, '') || '1';
    return {
      id: raw,
      shortName: `序列精炼-${num}`,
      fullName: `序列精炼-${num} (${raw} 🏆)`,
      subTitle: '序列递进组合交付物',
      badge: '序列精炼 🏆',
      description: '序列模式下经历单链逐级迭代递进沉淀出的最终落地套件，在双盲评审中胜出并采纳。',
    };
  }

  // Fallback for custom or unknown stages
  return {
    id: raw,
    shortName: raw,
    fullName: raw,
    subTitle: '自定义演进阶段',
    badge: raw.toUpperCase(),
    description: '演进流水线执行阶段',
  };
}
