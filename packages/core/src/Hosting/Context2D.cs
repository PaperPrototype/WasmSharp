//https://github.com/dotnet/aspnetcore/blob/da6c314d76628c1f130f76ed3e55f1d39057e091/src/Components/WebAssembly/WebAssembly/src/Services/WebAssemblyConsoleLogger.cs

// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.

using System.Runtime.InteropServices.JavaScript;
using System.Text;
using Microsoft.Extensions.Logging;

// namespace Microsoft.AspNetCore.Components.WebAssembly.Services;

public static partial class Context2D
{
    [JSImport("context2D.fillRect")]
    public static partial void FillRect(int x, int y, int width, int height);
}
