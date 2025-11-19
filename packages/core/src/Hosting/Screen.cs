using System.Numerics;
using System.Runtime.InteropServices.JavaScript;

public static partial class Screen
{
    public static Action<double, double>? Resize;
    public static Action<double>? Update;
    public static Action<double>? PixelRatio;

    public static double DevicePixelRatio = 1;
    public static double Width = 1;
    public static double Height = 1;

    [JSExport]
    internal static void CallUpdate(double deltaTime)
    {
        Update?.Invoke(deltaTime);
    }

    [JSExport]
    internal static void CallResize(double width, double height)
    {
        Width = (float)width;
        Height = (float)height;
        Resize?.Invoke(width, height);
    }

    [JSExport]
    internal static void CallPixelRatio(double pixelRatio)
    {
        DevicePixelRatio = pixelRatio;
        PixelRatio?.Invoke(pixelRatio);
    }

    [JSExport]
    internal static void Reset()
    {
        Update = null;
        Resize = null;
    }
}