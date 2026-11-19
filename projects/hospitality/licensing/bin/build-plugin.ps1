$ErrorActionPreference = 'Stop'
$pluginSource = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$outputDirectory = Join-Path $pluginSource 'output'
New-Item -ItemType Directory -Path $outputDirectory -Force | Out-Null
Add-Type -AssemblyName System.IO.Compression.FileSystem
Add-Type -AssemblyName System.IO.Compression
$archivePath = Join-Path $outputDirectory 'hospitality-2035-licensing.zip'
$archiveStream = [System.IO.File]::Open($archivePath, [System.IO.FileMode]::Create)
$archive = New-Object System.IO.Compression.ZipArchive($archiveStream, [System.IO.Compression.ZipArchiveMode]::Create)
try {
    $files = @('hospitality-licensing.php', 'bootstrap.php', 'composer.json', 'composer.lock', 'README.md', 'DEPLOYMENT.md', 'THIRD_PARTY_NOTICES.md')
    $paths = @($files | ForEach-Object { Get-Item -LiteralPath (Join-Path $pluginSource $_) })
    $paths += @(Get-ChildItem -LiteralPath (Join-Path $pluginSource 'src') -File -Recurse)
    $paths += @(Get-ChildItem -LiteralPath (Join-Path $pluginSource 'assets') -File -Recurse)
    $paths += @(Get-ChildItem -LiteralPath (Join-Path $pluginSource 'vendor') -File -Recurse | Where-Object { $_.FullName -notmatch '[\\/]\.git[\\/]' -and $_.Name -notmatch '\.(mtx\.php|cw\.dat|cw127\.php)$' })
    foreach ($file in $paths) {
        $relative = $file.FullName.Substring($pluginSource.Length + 1).Replace('\', '/')
        [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive, $file.FullName, ('hospitality-2035-licensing/' + $relative), [System.IO.Compression.CompressionLevel]::Optimal) | Out-Null
    }
} finally { $archive.Dispose(); $archiveStream.Dispose() }
Write-Output $archivePath
