#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AI Infra 教程仓库 · 数据校验脚本

作用：
  1. 读取 data/resources.js，用 node 求值后转为 JSON
  2. 校验字段完整性、ID 唯一性、优先级取值、阶段取值
  3. 同步生成 data/resources.json（便于其他工具/脚本读取）
  4. 可选：--check-urls 联网校验链接可达性（较慢）

用法：
  python validate.py              # 仅校验 + 生成 JSON
  python validate.py --check-urls # 额外联网校验链接
"""
import json
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
JS_PATH = os.path.join(HERE, "data", "resources.js")
JSON_PATH = os.path.join(HERE, "data", "resources.json")

REQUIRED = ["id", "title", "org", "year", "stage", "focus", "type",
            "platform", "level", "priority", "effort", "format",
            "tags", "desc", "why", "url"]
VALID_PRIORITY = {"核心必修", "强烈推荐", "选修拓展"}
VALID_STAGES = {1, 2, 3, 4, 5, 6, 7}


def load_data():
    """用 node 求值 resources.js，返回解析后的 dict。"""
    node = os.environ.get("NODE", "node")
    code = (
        "global.window={};"
        "require('./data/resources.js');"
        "process.stdout.write(JSON.stringify(window.AI_INFRA_DATA));"
    )
    try:
        out = subprocess.check_output(
            [node, "-e", code], cwd=HERE, stderr=subprocess.STDOUT
        ).decode("utf-8")
    except FileNotFoundError:
        print("✗ 未找到 node。请安装 Node.js 后重试，或手动检查 data/resources.js。")
        sys.exit(1)
    except subprocess.CalledProcessError as e:
        print("✗ node 求值失败：")
        print(e.output.decode("utf-8", errors="replace"))
        sys.exit(1)
    return json.loads(out)


def check_urls(resources):
    """联网校验每个资源的主链接与补充链接（HEAD 请求）。"""
    import urllib.request
    import urllib.error
    bad = []
    for r in resources:
        for label, url in [("url", r.get("url")), ("secondary", r.get("secondary"))]:
            if not url:
                continue
            try:
                req = urllib.request.Request(url, method="HEAD",
                                             headers={"User-Agent": "aiinfra-validate/1.0"})
                urllib.request.urlopen(req, timeout=12)
            except urllib.error.HTTPError as e:
                # 405/403 常见于禁用 HEAD 的站点，视为可达
                if e.code in (403, 405, 406):
                    continue
                bad.append((r["id"], label, url, f"HTTP {e.code}"))
            except Exception as e:
                bad.append((r["id"], label, url, str(e)[:60]))
    if bad:
        print("\n⚠ 以下链接可能不可达（部分站点禁用 HEAD，可手动复核）：")
        for bid, label, url, err in bad:
            print(f"  · {bid} [{label}] {err}\n    {url}")
    else:
        print("✓ 所有链接可达。")


def main():
    data = load_data()
    stages = data.get("stages", [])
    resources = data.get("resources", [])
    errors = []
    warnings = []

    print(f"阶段数：{len(stages)}  资源数：{len(resources)}")

    # ID 唯一性
    ids = [r.get("id") for r in resources]
    seen = set()
    dups = [i for i in ids if i in seen or seen.add(i)]
    if dups:
        errors.append(f"重复 ID：{dups}")

    # 逐项校验
    for r in resources:
        rid = r.get("id", "(无id)")
        for f in REQUIRED:
            if f not in r or r[f] in (None, "", []):
                errors.append(f"{rid}: 缺失或空字段 [{f}]")
        if r.get("priority") and r["priority"] not in VALID_PRIORITY:
            errors.append(f"{rid}: priority 非法值「{r['priority']}」")
        if r.get("stage") and r["stage"] not in VALID_STAGES:
            errors.append(f"{rid}: stage 非法值 {r['stage']}")
        if "order" not in r:
            warnings.append(f"{rid}: 缺少 order 字段（将按默认顺序）")
        if not r.get("tags"):
            warnings.append(f"{rid}: tags 为空")

    # 阶段覆盖
    for s in stages:
        n = sum(1 for r in resources if r.get("stage") == s["id"])
        print(f"  阶段 {s['id']} · {s['name']}: {n} 项")

    # 输出
    if warnings:
        print("\n⚠ 提醒：")
        for w in warnings:
            print(f"  · {w}")
    if errors:
        print("\n✗ 校验未通过：")
        for e in errors:
            print(f"  · {e}")
        sys.exit(1)

    # 生成 resources.json
    with open(JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"\n✓ 校验通过，已生成 data/resources.json")

    if "--check-urls" in sys.argv:
        check_urls(resources)


if __name__ == "__main__":
    main()
