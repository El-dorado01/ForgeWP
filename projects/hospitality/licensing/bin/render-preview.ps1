param([Parameter(Mandatory=$true)][string]$PdfPath, [Parameter(Mandatory=$true)][string]$PngPath)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$null = [Windows.Storage.StorageFile, Windows.Storage, ContentType=WindowsRuntime]
$null = [Windows.Data.Pdf.PdfDocument, Windows.Data.Pdf, ContentType=WindowsRuntime]
$null = [Windows.Storage.Streams.InMemoryRandomAccessStream, Windows.Storage.Streams, ContentType=WindowsRuntime]
$null = [Windows.Storage.Streams.DataReader, Windows.Storage.Streams, ContentType=WindowsRuntime]
$taskMethods = [System.WindowsRuntimeSystemExtensions].GetMethods()
function Wait-Operation($Operation, $ResultType) {
    $method = $taskMethods | Where-Object { $_.Name -eq 'AsTask' -and $_.IsGenericMethod -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' } | Select-Object -First 1
    $task = $method.MakeGenericMethod($ResultType).Invoke($null, @($Operation))
    $task.GetAwaiter().GetResult()
}
$file = Wait-Operation ([Windows.Storage.StorageFile]::GetFileFromPathAsync((Resolve-Path -LiteralPath $PdfPath).Path)) ([Windows.Storage.StorageFile])
$document = Wait-Operation ([Windows.Data.Pdf.PdfDocument]::LoadFromFileAsync($file)) ([Windows.Data.Pdf.PdfDocument])
$page = $document.GetPage(0)
$stream = New-Object Windows.Storage.Streams.InMemoryRandomAccessStream
try {
    $action = $page.RenderToStreamAsync($stream)
    $actionMethod = $taskMethods | Where-Object { $_.Name -eq 'AsTask' -and -not $_.IsGenericMethod -and $_.GetParameters().Count -eq 1 } | Select-Object -First 1
    $task = $actionMethod.Invoke($null, @($action))
    $task.GetAwaiter().GetResult()
    $reader = [Windows.Storage.Streams.DataReader]::new($stream.GetInputStreamAt(0))
    $null = Wait-Operation ($reader.LoadAsync([uint32]$stream.Size)) ([uint32])
    $bytes = New-Object byte[] ([int]$stream.Size)
    $reader.ReadBytes($bytes)
    [System.IO.File]::WriteAllBytes($PngPath, $bytes)
    $reader.Dispose()
    Write-Output ('Rendered first page. PDF pages: ' + $document.PageCount)
} finally {
    $page.Dispose()
    $stream.Dispose()
}
