import { WasmSharpModule } from "@wasmsharp/core";
import { batch, Component, createResource, createSignal, createEffect, onMount, Show } from "solid-js";

import CodeMirrorEditor from "../CodeMirror/CodeMirrorEditor.jsx";

import { debounce } from "@solid-primitives/scheduled";
import { WasmSharpOptions } from "@wasmsharp/core";
import ProgressBar from "../components/ProgressBar.jsx";
import TwoPaneView from "../components/TwoPaneVIew.jsx";
import { CSharpRun } from "../components/CSharpRun.jsx";
import { spacing } from "../themeUtils.js";
import * as styles from "./Playground.css";
import { inject } from "@vercel/analytics"

const Playground: Component = () => {
  let canvasRef: HTMLCanvasElement | undefined;

  const initialTabs = [
    {
      id: "angry",
      title: "Angry Bird",
      code: `using System;

Console.WriteLine("Angry Bird is ready!");

var xPos = 400.0;
var yPos = 300.0;
var PI = 3.14159;

Input.Update = (dt) => {
  Context2D.Reset();
  DrawAngryBird(xPos, yPos);
};

Input.MouseMove = (double x, double y) => {
  xPos = x;
  yPos = y;
};

void DrawAngryBird(double x, double y)
{
  var centerX = x;
  var centerY = y;
  
  // Tail feathers (back, so draw first)
  Context2D.FillStyle("#B71C1C");
  // Top feather
  Context2D.BeginPath();
  Context2D.MoveTo(centerX - 35, centerY - 15);
  Context2D.LineTo(centerX - 55, centerY - 20);
  Context2D.LineTo(centerX - 40, centerY - 5);
  Context2D.ClosePath();
  Context2D.Fill();
  
  // Middle feather
  Context2D.BeginPath();
  Context2D.MoveTo(centerX - 38, centerY - 5);
  Context2D.LineTo(centerX - 60, centerY - 5);
  Context2D.LineTo(centerX - 42, centerY + 5);
  Context2D.ClosePath();
  Context2D.Fill();
  
  // Bottom feather
  Context2D.BeginPath();
  Context2D.MoveTo(centerX - 35, centerY + 5);
  Context2D.LineTo(centerX - 55, centerY + 15);
  Context2D.LineTo(centerX - 38, centerY + 15);
  Context2D.ClosePath();
  Context2D.Fill();
  
  // Body (red circle)
  Context2D.FillStyle("#D32F2F");
  Context2D.BeginPath();
  DrawCircle(centerX, centerY, 40);
  Context2D.Fill();
  
  // Belly (lighter red oval on the side)
  Context2D.FillStyle("#E57373");
  Context2D.BeginPath();
  DrawEllipse(centerX + 5, centerY + 5, 20, 25);
  Context2D.Fill();
  
  // Eye (white background) - single eye for side view
  Context2D.FillStyle("white");
  Context2D.BeginPath();
  DrawCircle(centerX + 15, centerY - 10, 14);
  Context2D.Fill();
  
  // Pupil (black)
  Context2D.FillStyle("black");
  Context2D.BeginPath();
  DrawCircle(centerX + 18, centerY - 8, 6);
  Context2D.Fill();
  
  // Angry eyebrow (single, angled down)
  Context2D.FillStyle("black");
  Context2D.LineWidth(4);
  Context2D.BeginPath();
  Context2D.MoveTo(centerX + 5, centerY - 22);
  Context2D.LineTo(centerX + 25, centerY - 18);
  Context2D.Stroke();
  
  // Beak (yellow/orange, pointing right)
  Context2D.FillStyle("#FFA726");
  Context2D.BeginPath();
  Context2D.MoveTo(centerX + 25, centerY + 8);
  Context2D.LineTo(centerX + 45, centerY + 10);
  Context2D.LineTo(centerX + 25, centerY + 18);
  Context2D.ClosePath();
  Context2D.Fill();
  
  // Top part of beak (darker)
  Context2D.FillStyle("#FF9800");
  Context2D.BeginPath();
  Context2D.MoveTo(centerX + 25, centerY + 8);
  Context2D.LineTo(centerX + 45, centerY + 10);
  Context2D.LineTo(centerX + 35, centerY + 13);
  Context2D.ClosePath();
  Context2D.Fill();
}

// Helper function to draw a circle using path
void DrawCircle(double x, double y, double radius)
{
  var segments = 32;
  for (int i = 0; i <= segments; i++)
  {
    var angle = (i / (double)segments) * PI * 2;
    var px = x + Math.Cos(angle) * radius;
    var py = y + Math.Sin(angle) * radius;
    
    if (i == 0)
      Context2D.MoveTo(px, py);
    else
      Context2D.LineTo(px, py);
  }
  Context2D.ClosePath();
}

// Helper function to draw an ellipse
void DrawEllipse(double x, double y, double radiusX, double radiusY)
{
  var segments = 32;
  for (int i = 0; i <= segments; i++)
  {
    var angle = (i / (double)segments) * PI * 2;
    var px = x + Math.Cos(angle) * radiusX;
    var py = y + Math.Sin(angle) * radiusY;
    
    if (i == 0)
      Context2D.MoveTo(px, py);
    else
      Context2D.LineTo(px, py);
  }
  Context2D.ClosePath();
}`
    },
    {
      id: "hello",
      title: "Hello",
      code: `using System;\n\nConsole.WriteLine("Hello from tab!");`
    }
  ];

  const [tabs, setTabs] = createSignal(initialTabs);

  const wasmSharpOptions: WasmSharpOptions = {
    enableDiagnosticTracing: import.meta.env.DEV,
    onConfigLoaded(config) {
      if (import.meta.env.DEV) {
        console.log(config);
      }
    },
    onDownloadResourceProgress(loadedResources, totalResources) {
      batch(() => {
        setLoadedResources(totalResources);
        setTotalResources(loadedResources);
      });
    },
    debugLevel: 1,
    disableWebWorker: true,
    canvas: () => canvasRef,
  };

  const context = WasmSharpModule.initializeAsync(wasmSharpOptions);
  const [loadedResources, setLoadedResources] = createSignal(0);
  const [totalResources, setTotalResources] = createSignal(0);
  const [wasmSharpModule] = createResource(() => context);

  const [activeTab, setActiveTab] = createSignal(0);
  const [code, setCode] = createSignal<string | null>(initialTabs[0].code);

  const [editingIndex, setEditingIndex] = createSignal<number>(-1);
  const [editingTitle, setEditingTitle] = createSignal<string>("");

  const STORAGE_KEY = "wasmsharp.playground.tabs.v1";

  // load persisted tabs on mount
  onMount(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.tabs) && parsed.tabs.length > 0) {
          setTabs(parsed.tabs);
          const at = typeof parsed.active === "number" ? parsed.active : 0;
          const safeIndex = Math.min(at, parsed.tabs.length - 1);
          setActiveTab(safeIndex);
          setCode(parsed.tabs[safeIndex].code ?? parsed.tabs[0].code);
        }
      }
    } catch (e) {
      console.warn("Failed to load tabs from localStorage", e);
    }
  });

  // persist tabs whenever they or the active index change
  createEffect(() => {
    try {
      const data = {
        tabs: tabs(),
        active: activeTab(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn("Failed to persist tabs", e);
    }
  });

  const closeTab = (idx: number) => {
    const t = tabs();
    if (idx < 0 || idx >= t.length) return;
    if (!confirm(`Close tab "${t[idx].title}"?`)) return;
    const next = [...t.slice(0, idx), ...t.slice(idx + 1)];
    if (next.length === 0) {
      const newTab = { id: `tab-${Date.now()}`, title: "Untitled 1", code: `using System;\n\nConsole.WriteLine("New Tab 1");` };
      setTabs([newTab]);
      setActiveTab(0);
      setCode(newTab.code);
      return;
    }
    setTabs(next);
    // adjust active tab
    if (activeTab() === idx) {
      const newIndex = Math.max(0, idx - 1);
      setActiveTab(newIndex);
      setCode(next[newIndex].code);
    } else if (activeTab() > idx) {
      setActiveTab(activeTab() - 1);
    }
  };

  const startRename = (idx: number) => {
    setEditingIndex(idx);
    setEditingTitle(tabs()[idx].title);
  };

  const commitRename = (idx: number) => {
    const title = editingTitle().trim();
    if (title.length === 0) return cancelRename();
    const t = tabs();
    t[idx] = { ...t[idx], title };
    setTabs([...t]);
    setEditingIndex(-1);
  };

  const cancelRename = () => {
    setEditingIndex(-1);
    setEditingTitle("");
  };

  // keep tab's code in sync when editor changes
  createEffect(() => {
    const c = code();
    const idx = activeTab();
    const t = tabs();
    if (!t[idx]) return;
    if (t[idx].code !== c) {
      const copy = [...t];
      copy[idx] = { ...copy[idx], code: c ?? "" };
      setTabs(copy);
    }
  });

  // when active tab changes, update editor to that tab's code
  createEffect(() => {
    const idx = activeTab();
    const t = tabs();
    if (t[idx]) setCode(t[idx].code);
  });

  const addTab = () => {
    const idx = tabs().length;
    const n = idx + 1;
    const newTab = {
      id: `tab-${Date.now()}`,
      title: `Untitled ${n}`,
      code: `using System;\n\nContext2D.Reset();\n\nConsole.WriteLine("New Tab ${n}");`,
    };
    setTabs([...tabs(), newTab]);
    setActiveTab(idx);
    setCode(newTab.code);
  };
  const onValueChanged = debounce((code: string) => {
    setCode(code);
  }, 1000);

  // Inject the Analytics functionality
  inject({ mode: import.meta.env.DEV ? 'development' : 'production' });
  
  return (
    <>
      <div style={{ display: "flex", "align-items": "center", padding: spacing(2) }}>
        <div
          style={{
            display: "flex",
            "overflow-x": "auto",
            "white-space": "nowrap",
            "-webkit-overflow-scrolling": "touch",
            flex: "1 1 auto",
          }}
          onWheel={(e) => {
            // scroll horizontally with wheel
            const target = e.currentTarget as HTMLDivElement;
            e.preventDefault();
            target.scrollLeft += e.deltaY;
          }}
        >
          {tabs().map((t, idx) => (
            <div
              onClick={() => {
                setActiveTab(idx);
                setCode(t.code);
              }}
              onDblClick={() => startRename(idx)}
              style={{
                display: "inline-flex",
                "align-items": "center",
                padding: "0.25rem 0.5rem",
                margin: "0 0.25rem",
                cursor: "pointer",
                "border-bottom": activeTab() === idx ? "2px solid var(--accent, #2563eb)" : "2px solid transparent",
                "font-weight": activeTab() === idx ? "600" : "400",
              }}
            >
              {editingIndex() === idx ? (
                <input
                  value={editingTitle()}
                  onInput={(e) => setEditingTitle((e.currentTarget as HTMLInputElement).value)}
                  onBlur={() => commitRename(idx)}
                  onKeyDown={(e) => {
                    if ((e as KeyboardEvent).key === "Enter") commitRename(idx);
                    if ((e as KeyboardEvent).key === "Escape") cancelRename();
                  }}
                  style={{ padding: "0.15rem 0.25rem", "min-width": "5rem" }}
                  autofocus
                />
              ) : (
                <span>{t.title}</span>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(idx);
                }}
                title="Close tab"
                style={{
                  color: "white",
                  margin: "0 0 0 0.5rem",
                  padding: "0 0.1rem",
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", "align-items": "center", gap: spacing(2), margin: "0 0 0 1rem" }}>
          <button onClick={addTab} title="Add tab" style={{ padding: "0.25rem 0.5rem", cursor: "pointer" }}>+</button>
          <a href="https://github.com/PaperPrototype/WasmSharp" target="_blank" rel="noopener noreferrer" style={{ color: "inherit", "text-decoration": "none" }}>
            GitHub
          </a>
        </div>
      </div>
      <Show when={loadedResources() != totalResources()}>
        <div class={styles.pogressBarContainer}>
          <ProgressBar progress={loadedResources()} total={totalResources()} />
        </div>
      </Show>
      <TwoPaneView separatorStyle={styles.separator}>
        <CodeMirrorEditor onValueChanged={onValueChanged} wasmSharpModule={context} value={code() || ""} />
        <div style={{ 
          display: "grid",
          "grid-template-columns": "1fr",
          "grid-template-rows": "1fr 1fr",
          height: "100%",
          width: "100%"
        }}>
          {/* 
            Canvas will utilize the parent element to decide width/height 
            see: handleResize in initializeWasmSharpModule.ts
          */}
          <div style={{position:"relative"}}>
            <canvas ref={canvasRef} style={{position: "absolute", top: "0px", left: "0px", bottom: "0px", right: "0px"}}></canvas>
          </div>
          <Show when={wasmSharpModule.state === "pending"}>
            <h2 style={{ "margin-left": spacing(3) }}>Loading compilation tools, please wait...</h2>
          </Show>
          <Show when={wasmSharpModule.state === "ready"}>
            <CSharpRun code={code() || ""} wasmSharpModule={wasmSharpModule.latest!} />
          </Show>
        </div>
      </TwoPaneView>
      <Show when={wasmSharpModule.state === "errored"}>
        <h2>Failed to load, please refresh the page.</h2>
        <pre>{wasmSharpModule.error?.getManageStack?.() ?? wasmSharpModule.error}</pre>
      </Show>
    </>
  );
};

export default Playground;
