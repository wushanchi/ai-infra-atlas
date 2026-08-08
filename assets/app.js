/* ==========================================================================
   AI Infra 教程仓库 · 共享脚本
   功能：主题切换 / 导航高亮 / 学习进度追踪 / 资源库筛选渲染
   ========================================================================== */
(function () {
  "use strict";
  var D = window.AI_INFRA_DATA || {};

  /* ---------- 主题 ---------- */
  function initTheme() {
    var saved = localStorage.getItem("aiinfra-theme");
    var pref = saved || (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    document.documentElement.setAttribute("data-theme", pref);
    var btn = document.getElementById("themeToggle");
    if (btn) {
      btn.textContent = pref === "dark" ? "☀" : "☾";
      btn.addEventListener("click", function () {
        var cur = document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
        var next = cur === "dark" ? "light" : "dark";
        document.documentElement.setAttribute("data-theme", next);
        localStorage.setItem("aiinfra-theme", next);
        btn.textContent = next === "dark" ? "☀" : "☾";
      });
    }
  }

  /* ---------- 导航高亮 ---------- */
  function initNav() {
    var path = location.pathname.split("/").pop() || "index.html";
    document.querySelectorAll(".nav a").forEach(function (a) {
      var href = a.getAttribute("href");
      if (href === path || (path === "" && href === "index.html")) a.classList.add("active");
    });
  }

  /* ---------- Toast ---------- */
  var toastTimer;
  function toast(msg) {
    var t = document.getElementById("toast");
    if (!t) return;
    t.textContent = msg; t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove("show"); }, 1400);
  }

  /* ---------- 进度（localStorage） ---------- */
  var STORE_KEY = "aiInfraDone";
  function loadDone() { try { return new Set(JSON.parse(localStorage.getItem(STORE_KEY) || "[]")); } catch (e) { return new Set(); } }
  function saveDone(done) { try { localStorage.setItem(STORE_KEY, JSON.stringify(Array.from(done))); } catch (e) {} }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>'"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#039;", '"': "&quot;" }[c];
    });
  }

  /* ---------- 通用：更新页脚进度（所有页面） ---------- */
  function updateGlobalProgress() {
    if (!D.resources) return;
    var done = loadDone();
    var n = done.size, total = D.resources.length;
    var pt = document.getElementById("progressText"); if (pt) pt.textContent = n + " / " + total;
    var pb = document.getElementById("progressBar"); if (pb) pb.style.width = (n / total * 100) + "%";
  }

  /* ---------- 通用：渲染阶段概览（首页用） ---------- */
  function renderStageOverview(container, resources, clickable) {
    if (!container || !D.stages) return;
    container.innerHTML = D.stages.map(function (s) {
      var n = resources ? resources.filter(function (r) { return r.stage === s.id; }).length : 0;
      return '<article class="stage-card" data-stage="' + s.id + '">' +
        '<div class="num">阶段 ' + s.id + '</div>' +
        '<strong>' + esc(s.name) + '</strong>' +
        '<span>' + esc(s.desc) + '</span>' +
        '<em>' + n + ' 项资源 · 目标：' + esc(s.goal || "") + '</em>' +
        '</article>';
    }).join("");
    if (clickable) {
      container.querySelectorAll(".stage-card").forEach(function (c) {
        c.addEventListener("click", function () {
          window.location.href = "resources.html?stage=" + c.dataset.stage;
        });
      });
    }
  }

  /* ---------- 资源库页 ---------- */
  function initResourcesPage() {
    var root = document.getElementById("cards");
    if (!root || !D.resources) return;
    var resources = D.resources;
    var priorityWeight = { "核心必修": 0, "强烈推荐": 1, "选修拓展": 2 };
    var priorityClass = { "核心必修": "must", "强烈推荐": "strong", "选修拓展": "optional" };

    var state = { search: "", stage: "all", type: "all", platform: "all", priority: "all", done: loadDone() };

    function unique(field) {
      return Array.from(new Set(resources.map(function (x) { return x[field]; }).filter(Boolean))).sort(function (a, b) {
        return String(a).localeCompare(String(b), "zh-CN");
      });
    }
    function fillSelect(id, values) {
      var el = document.getElementById(id);
      if (!el) return;
      values.forEach(function (v) { var o = document.createElement("option"); o.value = v; o.textContent = v; el.appendChild(o); });
    }

    // 填充下拉
    D.stages.forEach(function (s) {
      var o = document.createElement("option"); o.value = s.id;
      o.textContent = "阶段 " + s.id + " · " + s.name;
      var sel = document.getElementById("stage"); if (sel) sel.appendChild(o);
    });
    fillSelect("#type", unique("type"));
    fillSelect("#platform", unique("platform"));
    fillSelect("#priority", ["核心必修", "强烈推荐", "选修拓展"]);

    // URL 参数预筛
    var params = new URLSearchParams(location.search);
    var ps = params.get("stage");
    if (ps) { state.stage = ps; var sel = document.getElementById("stage"); if (sel) sel.value = ps; }
    var pf = params.get("focus");
    if (pf) state.search = pf;

    function filtered() {
      return resources.filter(function (r) {
        var hay = [r.title, r.org, r.focus, r.type, r.platform, r.level, r.priority, r.desc, r.why].concat(r.tags || []).join(" ").toLowerCase();
        return (!state.search || hay.indexOf(state.search.toLowerCase()) !== -1) &&
          (state.stage === "all" || String(r.stage) === String(state.stage)) &&
          (state.type === "all" || r.type === state.type) &&
          (state.platform === "all" || r.platform === state.platform) &&
          (state.priority === "all" || r.priority === state.priority);
      }).sort(function (a, b) {
        return a.stage - b.stage || (a.order || 0) - (b.order || 0) ||
          (priorityWeight[a.priority] || 9) - (priorityWeight[b.priority] || 9) || (b.year || 0) - (a.year || 0);
      });
    }

    function card(r) {
      var done = state.done.has(r.id);
      var second = r.secondary ? '<a class="link secondary" href="' + esc(r.secondary) + '" target="_blank" rel="noopener">' + esc(r.secondaryLabel || "补充") + '</a>' : "";
      var tags = (r.tags || []).slice(0, 3).map(function (t) { return '<span class="pill">' + esc(t) + "</span>"; }).join("");
      return '<article class="card">' +
        '<div class="card-top"><div><div class="org">' + esc(r.org) + " · " + (r.year || "") + '<span class="source-badge">' + esc(r.type) + "</span></div>" +
        "<h3>" + esc(r.title) + "</h3></div>" +
        '<span class="rank ' + (priorityClass[r.priority] || "") + '">' + esc(r.priority) + "</span></div>" +
        '<p class="desc">' + esc(r.desc) + "</p>" +
        '<div class="meta"><span class="pill">阶段 ' + r.stage + "</span>" +
        '<span class="pill">' + esc(r.focus) + "</span>" +
        '<span class="pill">' + esc(r.platform) + "</span>" +
        '<span class="pill">' + esc(r.level) + "</span>" +
        '<span class="pill">' + esc(r.effort) + "</span>" + tags + "</div>" +
        '<div class="why"><b>推荐理由：</b>' + esc(r.why) +
        (r.maturity ? '<div class="access-note">成熟度：' + esc(r.maturity) + "</div>" : "") +
        (r.access ? '<div class="access-note">访问说明：' + esc(r.access) + "</div>" : "") + "</div>" +
        '<div class="card-footer"><a class="link" href="' + esc(r.url) + '" target="_blank" rel="noopener">打开主资源 ↗</a>' + second +
        '<button class="done ' + (done ? "active" : "") + '" data-id="' + esc(r.id) + '" title="标记完成">' + (done ? "✓" : "○") + "</button></div></article>";
    }

    function updateProgress() {
      var n = state.done.size, total = resources.length;
      var pt = document.getElementById("progressText"); if (pt) pt.textContent = n + " / " + total;
      var pb = document.getElementById("progressBar"); if (pb) pb.style.width = (n / total * 100) + "%";
    }

    function render() {
      var list = filtered();
      var rc = document.getElementById("resultCount"); if (rc) rc.textContent = "显示 " + list.length + " / " + resources.length + " 个资源";
      if (!list.length) { root.innerHTML = '<div class="empty">没有匹配的资源，请减少筛选条件。</div>'; updateProgress(); return; }
      var groups = D.stages.map(function (s) { return { s: s, items: list.filter(function (r) { return r.stage === s.id; }) }; })
        .filter(function (g) { return g.items.length; });
      root.innerHTML = groups.map(function (g) {
        return '<section class="stage-group"><div class="stage-title"><span class="bubble">' + g.s.id + "</span><div><h3>" +
          esc(g.s.name) + "</h3><p>" + esc(g.s.desc) + "</p></div><span class=\"count\">" + g.items.length + " 项</span></div>" +
          '<div class="cards">' + g.items.map(card).join("") + "</div></section>";
      }).join("");
      root.querySelectorAll(".done").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var id = btn.dataset.id;
          if (state.done.has(id)) state.done.delete(id); else state.done.add(id);
          saveDone(state.done); render(); toast(state.done.has(id) ? "已标记完成" : "已取消完成");
        });
      });
      updateProgress();
    }

    ["search", "stage", "type", "platform", "priority"].forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.addEventListener(id === "search" ? "input" : "change", function (e) {
        state[id] = e.target.value.trim(); render();
      });
    });

    // 导出清单
    var exportBtn = document.getElementById("exportBtn");
    if (exportBtn) exportBtn.addEventListener("click", function () {
      var lines = ["# AI Infra 学习清单", "", "资源总数：" + resources.length, ""];
      D.stages.forEach(function (s) {
        lines.push("## 阶段 " + s.id + " · " + s.name, "");
        resources.filter(function (r) { return r.stage === s.id; }).sort(function (a, b) { return (a.order||0)-(b.order||0); })
          .forEach(function (r) { lines.push("- [" + (state.done.has(r.id) ? "x" : " ") + "] [" + r.title + "](" + r.url + ") — " + r.org + "｜" + r.type + "｜" + r.priority); });
        lines.push("");
      });
      var blob = new Blob([lines.join("\n")], { type: "text/markdown;charset=utf-8" });
      var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "AI-Infra-学习清单.md"; a.click();
      URL.revokeObjectURL(a.href); toast("清单已导出");
    });

    render();
  }

  /* ---------- 首页统计 ---------- */
  function initHomeStats() {
    if (!D.resources) return;
    var total = D.resources.length;
    var el = document.getElementById("statTotal"); if (el) el.textContent = total;
    var e2 = document.getElementById("statTotal2"); if (e2) e2.textContent = total;
    var must = D.resources.filter(function (r) { return r.priority === "核心必修"; }).length;
    var sm = document.getElementById("statMust"); if (sm) sm.textContent = must;
  }

  /* ---------- 入口 ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    initTheme();
    initNav();
    updateGlobalProgress();
    renderStageOverview(document.getElementById("stageOverview"), D.resources, true);
    initHomeStats();
    initResourcesPage();
  });
})();
