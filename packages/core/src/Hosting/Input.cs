using System.Numerics;
using System.Runtime.InteropServices.JavaScript;

public static partial class Input
{
    public static Action<int>? MouseUp;
    public static Action<int>? MouseDown;
    public static Action<double, double>? MouseMove;

    private static Vector2 _prevMouse = new Vector2();
    public static Vector2 Mouse = new Vector2();
    public static Vector2 MouseDelta = new Vector2();

    [JSExport]
    internal static void CallMouseUp(int button)
    {
        MouseUp?.Invoke(button);
    }

    [JSExport]
    internal static void CallMouseDown(int button)
    {
        MouseDown?.Invoke(button);
    }

    [JSExport]
    internal static void CallMouseMove(double x, double y)
    {
        _prevMouse.X = Mouse.X;
        _prevMouse.Y = Mouse.Y;

        Mouse.X = (float)x;
        Mouse.Y = (float)y;

        MouseDelta = Mouse - _prevMouse;

        MouseMove?.Invoke(x, y);
    }

    [JSExport]
    internal static void Reset()
    {
        MouseDown = null;
        MouseMove = null;
        MouseUp = null;
    }
}