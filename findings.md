## 需求
<!-- captured from user request -->
- 分析 "Amazon Ops Command Center" 项目
- 识别问题（结构、性能等）
- 提出改进方案
- 使用 `planning-with-files` 工作流
- **核心目标**: 离线单应用架构，以产品为中心的工作流。
- **具体功能需求**: 补货建议的持久化（独立的“补货计划”实体）。

## 调研发现
<!-- Key discoveries during exploration -->
### 架构 & 技术栈
- **技术栈**: Vite + React 19 + TypeScript + Vitest
- **模式**: 广泛使用 Repository-Service-Context 模式。
    - `repositories`: 数据访问层 (LocalStorage 包装器)。
    - `services`: 业务逻辑。
    - `contexts`: 状态管理 (ProductContext, LogisticsContext, OperationsContext)。
- **测试**: 高覆盖率 (74/74 测试通过)。

### 代码库状态
- **存储**: 混合实现。`profitModelService.ts` 使用集中式键，但在 `api/index.ts` 和 `ReplenishmentAdvice.tsx` 中存在遗留的硬编码键。
- **数据流**: 产品库 -> 利润计算器 -> 利润模型 -> 下游 (补货, 广告)。
- **缺失功能**: 补货建议允许计算，但**无法保存计划**。这无法追踪历史和对比方案。

### 识别的问题 (来自日志分析)
1.  **补货持久化**: 无法保存生成的补货计划。
2.  **硬编码存储键**: `ReplenishmentAdvice.tsx` 仍使用原始 localStorage 键，绕过了 Repository 模式。
3.  **冗余库**: 项目同时使用了 `chart.js` 和 `recharts`。
4.  **类型复杂性**: `ProductData` vs `ProductSpec` 重叠 (部分已解决)。

## 技术决策
| 决策 | 理由 |
|----------|-----------|
| **独立补货模块** | 补货计划有自己的生命周期（草稿、历史记录），区别于产品或利润模型。 |
| **Repository 模式** | 采用一致的数据访问。需要在遗留组件中强制执行。 |

## 遇到的问题
| 问题 | 解决方案 |
|-------|------------|
| 混合存储键 | (进行中) 在 `StorageKeys.ts` 中集中键并更新 Repositories。 |

## 资源
- `Analyzing Code Structure.md`: 包含之前重构和架构决策的详细日志。
