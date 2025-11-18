using System.Runtime.InteropServices.JavaScript;

public static partial class Input
{
    public static Action<double, double>? MouseDown;
    public static Action<double, double>? MouseMove;
    public static Action<double, double>? MouseUp;
    public static Action<double, double>? Resize;
    public static Action<double>? Update;
    public static Action<double>? PixelRatio;

    [JSExport]
    internal static void CallMouseUp(double x, double y)
    {
        MouseUp?.Invoke(x, y);
    }

    [JSExport]
    internal static void CallMouseDown(double x, double y)
    {
        MouseDown?.Invoke(x, y);
    }

    [JSExport]
    internal static void CallMouseMove(double x, double y)
    {
        MouseMove?.Invoke(x, y);
    }

    [JSExport]
    internal static void CallUpdate(double deltaTime)
    {
        Update?.Invoke(deltaTime);
    }

    [JSExport]
    internal static void CallResize(double width, double height)
    {
        Resize?.Invoke(width, height);
    }

    [JSExport]
    internal static void CallPixelRatio(double pixelRatio)
    {
        PixelRatio?.Invoke(pixelRatio);
    }

    [JSExport]
    internal static void Reset()
    {
        MouseDown = null;
        MouseMove = null;
        MouseUp = null;
        Update = null;
        Resize = null;
    }
}