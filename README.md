# AI Infra 学习地图（AI Infra Atlas）

系统化的 AI Infra 资源导航与学习路线网站。不按「视频、课程、框架」简单堆叠，而是依据 AI Infra 能力形成的先后依赖，把 **64 项** 精选课程、源码、官方文档与视频重组为 **7 个学习阶段**，配 3 条学习路径与 4 个实战项目。

参考 [AIInfraGuide](https://caomaolufei.github.io/AIInfraGuide/) 的主题划分，定位为**资源导航与学习路线地图**（聚合外部优质资源），与 AIInfraGuide 等「原创教程站」互补。

## 快速开始

纯静态站点，直接用浏览器打开 `index.html` 即可预览（数据通过 `<script>` 加载，兼容 `file://`，无需服务器）。

```bash
# 可选：带热重载的本地预览
python -m http.server 8000   # 然后访问 http://localhost:8000
```

## 页面结构

| 页面 | 说明 |
|------|------|
| `index.html` | 入口页：七阶段路线图 + 路径摘要 + 方法论 |
| `resources.html` | 资源库：筛选/搜索/进度标记/导出清单（核心页面） |
| `paths.html` | 三条学习路径 + 四个实战项目 + 七阶段能力目标 |
| `about.html` | 维护指南：项目结构、字段定义、部署方式 |

## 目录结构

```
ai-infra-tutorial-deephy/
├── index.html            # 入口页
├── resources.html        # 资源库
├── paths.html            # 学习路径与项目
├── about.html            # 维护指南
├── data/
│   ├── resources.js      # ★ 数据源（唯一需要维护的文件）
│   └── resources.json    # 由 validate.py 自动生成
├── assets/
│   ├── style.css         # 共享样式（亮/暗双主题）
│   └── app.js            # 共享脚本
├── validate.py           # 数据校验 + 生成 JSON
└── README.md
```

## 维护资源

所有资源集中在 `data/resources.js`。新增/修改资源只需编辑该文件，无需改动 HTML/CSS。字段定义见 `about.html` 或文件头部注释。

```bash
# 校验数据完整性 + 同步生成 resources.json
NODE=node python validate.py

# 可选：联网校验链接可达性
NODE=node python validate.py --check-urls
```

> `NODE` 环境变量指向本机 node 可执行文件路径（脚本用 node 求值 JS 数据）。

## 部署到 GitHub Pages

1. 推送全部文件到 GitHub 仓库。
2. Settings → Pages → Source: `Deploy from a branch`，分支 `main`，目录 `/ (root)`。
3. 访问 `https://<用户名>.github.io/<仓库名>/`。

## 七个学习阶段

1. **全景认知与系统基础** — 建立全栈地图与模型执行认知（CS336、CMU DLSys、Karpathy）
2. **硬件、并行与编译基础** — GPU 架构、CUDA/Triton、ML 编译（CS149、CUDA MODE）
3. **模型执行、算子与压缩** — Attention/GEMM、量化、KV Cache（FlashAttention、MIT 6.5940）
4. **单机推理引擎与源码** — vLLM/SGLang/TensorRT-LLM 与教学型引擎源码
5. **分布式推理与集合通信** — TP/PP/EP、NCCL/NVSHMEM/DeepEP、DeepSpeed/Megatron
6. **Profiling、Benchmark 与优化闭环** — Nsight、GenAI-Perf、GuideLLM、TTFT/ITL 度量
7. **生产部署与研究扩展** — Dynamo/Triton、K8s、KServe、GPU Operator

## 技术栈

原生 HTML/CSS/JS，零构建依赖、零框架。数据与展示分离，便于长期维护。
