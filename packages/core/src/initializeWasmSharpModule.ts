import {
  dotnet as dotnetHostBuilder,
  type MonoConfig,
  type DotnetModuleConfig,
  DotnetHostBuilder,
} from "./dotnet.js";
import { trackPixelRatioChange } from "./pixelRatioUtil.js";
import type {
  WasmSharpModuleOptions,
  AssemblyExports,
  WasmSharpModuleCallbacks,
} from "./WasmCompiler.js";

// import {device} from "./detectZoom.js"

function getDirectory(path: string) {
  var index = path.lastIndexOf("/");
  if (index !== -1) {
    return path.substring(0, index + 1);
  } else {
    return path;
  }
}

function getMousePos(canvas: HTMLCanvasElement, evt: MouseEvent): { x: number; y: number; pixelRatio: number } {
  const rect = canvas.getBoundingClientRect(); // CSS size & position
  const cssWidth = rect.width || canvas.clientWidth || 0;
  // compute the effective pixel ratio: how many canvas pixels per CSS pixel
  const pixelRatio = cssWidth > 0 ? canvas.width / cssWidth : (window.devicePixelRatio || 1);
  return {
    x: (evt.clientX - rect.left),
    y: (evt.clientY - rect.top),
    pixelRatio,
  };
}

let resize: (w:number,h:number) => void;
let mouseUp:   (x: number, y: number) => void;
let mouseDown: (x: number, y: number) => void;
let mouseMove: (x: number, y: number) => void;
let updateMethod: (deltaTime: number) => void;
let lastFrameTime = performance.now();


let pixelRatioMethod: (pixelRatio:number) => void;
let pixelRatio = window.devicePixelRatio; // device();

trackPixelRatioChange((newRatio) => {
  pixelRatio = newRatio ?? window.devicePixelRatio ?? 1; // device();
  pixelRatioMethod?.(pixelRatio)

  console.log('Device Pixel Ratio changed to:', newRatio);
});

function update() {
  const currentTime = performance.now();
  const deltaTime = (currentTime - lastFrameTime) / 1000; // in seconds
  lastFrameTime = currentTime;
  
  updateMethod?.(deltaTime);
  requestAnimationFrame(update);
}
requestAnimationFrame(update);

export async function initializeWasmSharpModule(
  options: WasmSharpModuleOptions | undefined,
  callbacks: WasmSharpModuleCallbacks | undefined
) {
  type InternalsHostBuilder = DotnetHostBuilder & {
    //internal method: https://github.com/dotnet/runtime/blob/a270140281a13ab82a4401dff3da6d27fe499087/src/mono/wasm/runtime/loader/run.ts#L26
    withModuleConfig(config: DotnetModuleConfig): InternalsHostBuilder;
  };
  const hostBuilder: InternalsHostBuilder = dotnetHostBuilder as InternalsHostBuilder;

  const time = performance.now();
  let resourcesToLoad = 0;
  const { getAssemblyExports, getConfig, setModuleImports } = await hostBuilder
    .withModuleConfig({
      onConfigLoaded(config: MonoConfig) {
        resourcesToLoad = Object.keys(config.resources?.assembly ?? {}).length;
        resourcesToLoad += Object.keys(config.resources?.pdb ?? {}).length;
        resourcesToLoad += Object.keys(config.resources?.icu ?? {}).length;
        //we are off by one when using the above - maybe its the wasm module, maybe its something else. Either way, this resolves the issue for now
        resourcesToLoad += 1;
        callbacks?.onConfigLoaded?.(config);
      },
      onDownloadResourceProgress(loaded: number, total: number) {
        callbacks?.onDownloadResourceProgress?.(loaded, resourcesToLoad);
      },
    })
    .withDiagnosticTracing(options?.enableDiagnosticTracing ?? false)
    //workaround https://github.com/dotnet/runtime/issues/94238
    //.withDebugging(options?.debugLevel ?? 1)
    .withConfig({
      debugLevel: options?.debugLevel ?? 0,
    })
    .withConfig({
      //TODO: Figure out why we need this, broken since dotnet sdk update to 8.0.101
      disableIntegrityCheck: true,
    })
    .create();

  // force code to await for the canvas lazy value to be valid
  // then call setModuleImports
  function delay(ms: number) {
    return new Promise((res) => setTimeout(res, ms));
  }

  async function waitForCanvas(provider: any): Promise<any> {
    while (true) {
      try {
        console.log("inside of waitForCanvas");
        const candidate = typeof provider === "function" ? await provider() : provider;
        if (candidate instanceof HTMLCanvasElement) return candidate;
        // if other truthy canvas-like objects should be accepted, adjust this check
        if (candidate) return candidate;
      } catch {
        // ignore and retry
      }
      await delay(50);
    }
  }

  console.log("before waitForCanvas");

  const canvasProvider = options?.canvas ? () => waitForCanvas(options!.canvas) : undefined;

  if (!canvasProvider) {
    throw new Error("WasmSharp: no canvas provider configured");
  }

  const context2DProvider = canvasProvider
    ? async () => {
        const canvas = (await canvasProvider()) as HTMLCanvasElement;
        return canvas!.getContext("2d");
      }
    : undefined;

  if (!context2DProvider) {
    throw new Error("WasmSharp: no context2D provider configured");
  }

  if (context2DProvider) {
    const context2D = await context2DProvider();
    if (context2D) {
      console.log("setModuleImports, context2D is", context2D);
      setModuleImports("main.js", {
        context2D: {
          // SETTERS
          globalAlpha: (a: number) => {
            context2D.globalAlpha = a;
          },
          fillStyle: (c: string) => {
            context2D.fillStyle = c;
          },
          strokeStyle: (c: string) => {
            context2D.strokeStyle = c;
          },
          lineWidth: (w: number) => {
            context2D.lineWidth = w;
          },
          font: (font: string) => {
            context2D.font = font;
          },
          // FILL SHAPE
          fillText: (text: string, x: number, y: number) => {
            context2D.fillText(text, x, y);
          },
          fillRect: (x: number, y: number, w: number, h: number) => {
            context2D.fillRect(x, y, w, h);
          },
          strokeRect: (x: number, y: number, w: number, h: number) => {
            context2D.strokeRect(x, y, w, h);
          },
          beginPath: () => {
            context2D.beginPath();
          },
          moveTo: (x: number, y: number) => {
            context2D.moveTo(x, y);
          },
          lineTo: (x: number, y: number) => {
            context2D.lineTo(x, y);
          },
          closePath: () => {
            context2D.closePath();
          },
          stroke: () => {
            context2D.stroke();
          },
          fill: () => {
            context2D.fill();
          },
          // TRANSFORM
          clip: () => {
            context2D.clip();
          },
          rotate: (angle: number) => {
            context2D.rotate(angle);
          },
          scale: (x: number, y: number) => {
            context2D.scale(x, y);
          },
          translate: (x: number, y: number) => {
            context2D.translate(x, y);
          },
          transform: (a: number, b: number, c: number, d: number, e: number, f: number) => {
            context2D.transform(a, b, c, d, e, f);
          },
          setTransform: (a: number, b: number, c: number, d: number, e: number, f: number) => {
            context2D.setTransform(a, b, c, d, e, f);
          },
          resetTransform: () => {
            context2D.resetTransform();
          },
          // CONTEXT
          save: () => {
            context2D.save();
          },
          restore: () => {
            context2D.restore();
          },
          reset: () => {
            context2D.reset();
          },
        },
      });
    }
  }

  const config = getConfig();
  console.log("WasmSharp: Config loaded", config);
  const assemblyExports: AssemblyExports = await getAssemblyExports(config.mainAssemblyName!);

  const compilationInterop = assemblyExports.WasmSharp.Core.CompilationInterop;
  //TODO: Rewrite this to use new URL()
  const resolvedAssembliesUrl = new URL(options?.assembliesUrl ?? getDirectory(import.meta.url));
  const diff1 = performance.now() - time;
  console.log(`Finished initialising runtime in ${diff1}ms`);
  console.log(`Using following location for assemblies: ${resolvedAssembliesUrl}`);
  const resources = config.resources;

  if (!resources) {
    throw new Error("WasmSharp: No resources found in config");
  }

  if (!resources.assembly || !resources.coreAssembly || !resources.satelliteResources) {
    throw new Error("WasmSharp: config is malformed, no assemblies found");
  }

  const assembliesAssets = resources.coreAssembly.concat(resources.assembly);
  const satelliteAssemblies = Object.values(resources.satelliteResources).flatMap(
    (assets) => assets
  );

  const assemblies = assembliesAssets
    .map((x) => x)
    .concat(satelliteAssemblies)
    .filter((x) => {
      if (!x.resolvedUrl) {
        console.debug("WasmSharp: resolved URL is empty, skipping assembly", x.virtualPath);
      }
      return !!x.resolvedUrl;
    })
    .map((x) => new URL(x.resolvedUrl!, resolvedAssembliesUrl).href);


  // Update loop for programs
  console.log("assemblyExports", assemblyExports)

  // these only runs once when the page loads (
  // TODO call each time "run" button is pressed
  assemblyExports.Input.CallPixelRatio(pixelRatio);
  assemblyExports.Input.Reset();

  // setup callbacks
  updateMethod = (dt: number) => {assemblyExports.Input.CallUpdate(dt)}
  mouseUp = (x:number,y:number) => {assemblyExports.Input.CallMouseUp(x, y)};
  mouseDown = (x:number,y:number) => {assemblyExports.Input.CallMouseDown(x, y)};
  mouseMove = (x:number,y:number) => {assemblyExports.Input.CallMouseMove(x, y)};
  resize = (w:number,h:number) => {assemblyExports.Input.CallResize(w, h)};
  pixelRatioMethod = (pixelRatio:number) => {assemblyExports.Input.CallPixelRatio(pixelRatio)};

  const canvas = await canvasProvider() as HTMLCanvasElement;

  // bind the input events
  canvas.addEventListener('mouseup', (e) => {
    const {x, y} = getMousePos(options?.canvas()!, e);
    mouseUp(x, y);
  });
  canvas.addEventListener('mousedown', (e) => {
    const {x, y} = getMousePos(options?.canvas()!, e);
    mouseDown(x, y);
  });
  canvas.addEventListener('mousemove', (e) => {
    const {x, y} = getMousePos(options?.canvas()!, e);
    mouseMove(x, y);
  });

  const resizeObserver = new ResizeObserver(() => {
    const parent = canvas.parentElement;
    if (parent) {
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
      resize(canvas.width, canvas.height);
    }
  });
  
  const parent = canvas.parentElement;
  if (parent) {
    // canvas.width = parent.clientWidth;
    // canvas.height = parent.clientHeight;
    resizeObserver.observe(parent);
  }

  await compilationInterop.InitAsync(assemblies);
  const diff2 = performance.now() - time;
  console.log(`Finished loading assemblies in ${diff2}ms`);
  return compilationInterop;
}
