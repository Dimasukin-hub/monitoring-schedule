Add-Type -AssemblyName System.Drawing

$srcPath = Join-Path $PSScriptRoot "..\public\assets\logo.png"
$outDir = Join-Path $PSScriptRoot "..\public\icons"

if (-not (Test-Path $outDir)) {
    New-Item -ItemType Directory -Path $outDir -Force | Out-Null
}

$srcImage = [System.Drawing.Image]::FromFile($srcPath)

function Resize-Image {
    param (
        [System.Drawing.Image]$Image,
        [int]$TargetWidth,
        [int]$TargetHeight,
        [string]$DestinationPath,
        [bool]$AddSafePadding = $false
    )

    $bitmap = New-Object System.Drawing.Bitmap $TargetWidth, $TargetHeight
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

    if ($AddSafePadding) {
        # Safe zone is central 80%
        $padX = [int]($TargetWidth * 0.1)
        $padY = [int]($TargetHeight * 0.1)
        $drawW = $TargetWidth - (2 * $padX)
        $drawH = $TargetHeight - (2 * $padY)
        $graphics.DrawImage($Image, $padX, $padY, $drawW, $drawH)
    } else {
        $graphics.DrawImage($Image, 0, 0, $TargetWidth, $TargetHeight)
    }

    $bitmap.Save($DestinationPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $graphics.Dispose()
    $bitmap.Dispose()
    Write-Host "Created: $DestinationPath"
}

Resize-Image -Image $srcImage -TargetWidth 192 -TargetHeight 192 -DestinationPath (Join-Path $outDir "icon-192x192.png")
Resize-Image -Image $srcImage -TargetWidth 512 -TargetHeight 512 -DestinationPath (Join-Path $outDir "icon-512x512.png")
Resize-Image -Image $srcImage -TargetWidth 192 -TargetHeight 192 -DestinationPath (Join-Path $outDir "icon-maskable-192x192.png") -AddSafePadding $true
Resize-Image -Image $srcImage -TargetWidth 512 -TargetHeight 512 -DestinationPath (Join-Path $outDir "icon-maskable-512x512.png") -AddSafePadding $true
Resize-Image -Image $srcImage -TargetWidth 180 -TargetHeight 180 -DestinationPath (Join-Path $outDir "apple-touch-icon.png")

$srcImage.Dispose()
Write-Host "All icons generated successfully!"

