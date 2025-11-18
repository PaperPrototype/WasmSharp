import { Component, createSignal, createEffect, onCleanup, onMount } from "solid-js";
import { basicSetup, EditorView } from "codemirror";
import { linter, Diagnostic as CmDiagnostic } from "@codemirror/lint";
import { syntaxTree } from "@codemirror/language";
import "./CodeMirrorEditor.css";
import { EditorState, Facet, StateEffect, StateField, Transaction } from "@codemirror/state";
import { Compilation, CompletionItem, DiagnosticSeverity, WasmSharpModule, WellKnownTagArray } from "@wasmsharp/core";
import {
  CompletionContext,
  CompletionResult,
  autocompletion,
  Completion,
  ifNotIn,
  startCompletion,
  closeCompletion,
} from "@codemirror/autocomplete";
import { csharp } from "@replit/codemirror-lang-csharp";
import { ViewPlugin } from "@codemirror/view";
import "./CodeMirrorEditor.autocomplete.css";
import "./CodeMirrorEditor.css";
import { darkModern } from "./dark-theme";

export interface CodeMirrorEditorProps {
  onValueChanged?: (value: string) => void;
  wasmSharpModule: Promise<WasmSharpModule>;
  value?: string;
}

const CodeMirrorEditor: Component<CodeMirrorEditorProps> = (props) => {
  const [editor, setEditor] = createSignal<EditorView>();
  let editorRef: HTMLDivElement | undefined;

  onMount(() => {
    const initialDocument = `using System;

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
}`;
    const readUpdates = EditorView.updateListener.of((update) => {
      const document = update.state.doc.toString();
      props.onValueChanged?.(document);
    });

    const e = new EditorView({
      doc: initialDocument,
      parent: editorRef!,
      extensions: [
        basicSetup,
        csharp(),
        darkModern,
        readUpdates,
        wasmSharp(props.wasmSharpModule),
        csharpLinter({ delay: 0 }),
        autocompletion({ override: [ifNotIn([";", "{", "}"], csharpCompletionSource)] }),
      ],
    });
    setEditor(e);
    props.onValueChanged?.(initialDocument);
  });

  onCleanup(() => editor()?.destroy());

  // react to external `value` updates (e.g. when user clicks a tab)
  createEffect(() => {
    const v = props.value;
    const e = editor();
    if (v !== undefined && e) {
      const current = e.state.doc.toString();
      if (v !== current) {
        e.dispatch({ changes: { from: 0, to: current.length, insert: v } });
      }
    }
  });

  return (
    <div style={{ position: "relative", height: "100%", width: "100%", overflow: "hidden" }}>
      <div ref={editorRef!} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}></div>
    </div>
  );
};

async function csharpCompletionSource(context: CompletionContext): Promise<CompletionResult | null> {
  const compilation = getCompilation(context.state);
  if (!compilation) {
    return null;
  }

  const from = context.pos;
  const filteredCompletions = await compilation.getCompletions(from);

  //TODO: Do not rely on this, instead, return this information from the getCompletions call
  const matchContext = context.matchBefore(/[\w\d]+/);
  const mappedCompletions = filteredCompletions.map(mapCompletionItemToCodeMirrorCompletion);
  return {
    from: matchContext?.from ?? from,
    options: mappedCompletions,
    filter: false,
  };
}

function mapCompletionItemToCodeMirrorCompletion(item: CompletionItem): Completion {
  return {
    label: item.displayText,
    detail: item.inlineDescription,
    type: mapTextTagsToType(item.tags),
  };
}

function mapTextTagsToType(tags: WellKnownTagArray) {
  if (process.env.NODE_ENV === "development") {
    //@ts-expect-error
    if (tags.length === 0) {
      console.warn(`No tag found for completion, falling back to "keyword".`);
      return "keyword";
    }
  }

  if (tags.length == 1) {
    return tags[0].toLowerCase();
  }
  return `${tags[0].toLowerCase()}-${tags[1].toLowerCase()}`;
}

type LintConfig = NonNullable<Parameters<typeof linter>[1]>;
interface CSharpLinterConfig extends LintConfig {}

const wasmSharpModulePromiseFacet = Facet.define<Promise<WasmSharpModule>>({
  static: true,
});

export const wasmSharpCompilationFacet = Facet.define<Compilation | null>({
  static: true,
});

const wasmSharp = (module: Promise<WasmSharpModule>) => {
  const facet = wasmSharpModulePromiseFacet.of(module);
  return [wasmSharpStateField.extension, facet, waitForModuleAndCreateCompilation.extension];
};

const compilationReadyEffect = StateEffect.define<Compilation>();

const waitForModuleAndCreateCompilation = ViewPlugin.define((state) => {
  return {
    update(update) {
      const field = update.state.field(wasmSharpStateField);
      if (field.ready) {
        return;
      }

      if (!field.modulePending) {
        //not sure if this is actually allowed, or if we should dispatch a transaction for this - seems to work for the moment though
        //and ensures we call createCompilationAsync only once.
        field.modulePending = true;
        const wasmSharpModulePromise = update.state.facet(wasmSharpModulePromiseFacet)[0];
        if (wasmSharpModulePromise) {
          wasmSharpModulePromise
            .then((module) => {
              console.log("Calling createCompilation");
              return module.createCompilationAsync("");
            })
            .then((compilation) => update.view.dispatch({ effects: compilationReadyEffect.of(compilation) }));
        }
      }
    },
  };
});

//TODO: investiage Facet.from as a possible simplification
const wasmSharpStateField = StateField.define({
  create(state) {
    return {
      modulePending: false,
      ready: false,
      compilation: null as Compilation | null,
    };
  },
  update(value, tr) {
    if (!value.ready) {
      for (const effect of tr.effects) {
        if (effect.is(compilationReadyEffect)) {
          value.compilation = effect.value;
          value.ready = true;
        }
      }
    }

    if (value.ready && tr.docChanged) {
      value.compilation!.recompileAsync(tr.newDoc.toString());
    }
    return value;
  },
});

const csharpLinterSource = "@WasmSharp";

function getCompilation(state: EditorState) {
  return state.field(wasmSharpStateField).compilation;
}

export const csharpLinter = (config?: CSharpLinterConfig) => {
  return linter(async (view) => {
    const diagnostics: CmDiagnostic[] = [];
    const compilation = getCompilation(view.state);
    if (!compilation) {
      console.debug("Skipping linting as compilation has not finished initialising");
      return [];
    }
    var wasmSharpDiagnostics = await compilation.getDiagnosticsAsync();

    for (let i = 0; i < wasmSharpDiagnostics.length; i++) {
      const diagnostic = wasmSharpDiagnostics[i];
      diagnostics.push({
        from: diagnostic.location.start,
        to: diagnostic.location.end,
        message: diagnostic.message,
        severity: mapSeverity(diagnostic.severity),
        source: csharpLinterSource,
      });
    }

    return diagnostics;
  }, config);
};

const mapSeverity: (severity: DiagnosticSeverity) => "info" | "warning" | "error" = (severity) => {
  switch (severity) {
    case "Error":
      return "error";
    case "Warning":
      return "warning";
    case "Info":
    case "Hidden":
      return "info";
    default:
      return "info";
  }
};

export default CodeMirrorEditor;
