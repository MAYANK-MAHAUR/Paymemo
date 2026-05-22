# Rasterize the PayMemo logo SVG into PNG icons for the extension + favicon
# Uses .NET System.Drawing — no external deps.

Add-Type -AssemblyName System.Drawing

function New-PayMemoLogoBitmap {
  param([int]$Size)

  $bmp = New-Object System.Drawing.Bitmap $Size, $Size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
  $g.Clear([System.Drawing.Color]::Transparent)

  # Scale factor from 512px design
  $s = $Size / 512.0

  # Helper to make a rounded rect path
  function New-RoundedRect([single]$x, [single]$y, [single]$w, [single]$h, [single]$r) {
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $d = $r * 2
    $path.AddArc($x, $y, $d, $d, 180, 90)
    $path.AddArc($x + $w - $d, $y, $d, $d, 270, 90)
    $path.AddArc($x + $w - $d, $y + $h - $d, $d, $d, 0, 90)
    $path.AddArc($x, $y + $h - $d, $d, $d, 90, 90)
    $path.CloseFigure()
    return $path
  }

  # 1. Gradient rounded square background
  $bgPath = New-RoundedRect (16*$s) (16*$s) (480*$s) (480*$s) (120*$s)
  $rectF = [System.Drawing.RectangleF]::new([single](16*$s), [single](16*$s), [single](480*$s), [single](480*$s))
  $green = [System.Drawing.Color]::FromArgb(255, 168, 241, 57)
  $ink   = [System.Drawing.Color]::FromArgb(255, 14, 14, 14)
  $brush = [System.Drawing.Drawing2D.LinearGradientBrush]::new($rectF, $green, $ink, [System.Drawing.Drawing2D.LinearGradientMode]::ForwardDiagonal)
  $g.FillPath($brush, $bgPath)
  $brush.Dispose()
  $bgPath.Dispose()

  # 2. Subtle white highlight on top half
  $hlPath = New-RoundedRect (16*$s) (16*$s) (480*$s) (240*$s) (120*$s)
  $hlBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(15, 255, 255, 255))
  $g.FillPath($hlBrush, $hlPath)
  $hlBrush.Dispose()
  $hlPath.Dispose()

  # 3. White stem (rounded rect)
  $stem = New-RoundedRect (140*$s) (130*$s) (82*$s) (262*$s) (41*$s)
  $white = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 255, 255, 255))
  $g.FillPath($white, $stem)
  $stem.Dispose()

  # 4. White bowl circle
  $g.FillEllipse($white, (188*$s), (100*$s), (216*$s), (216*$s))

  # 5. Ink signet dot
  $inkBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 14, 14, 14))
  $g.FillEllipse($inkBrush, (260*$s), (172*$s), (72*$s), (72*$s))

  # 6. Neon green accent pulse bottom-right
  $accent = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 168, 241, 57))
  $g.FillEllipse($accent, (372*$s), (370*$s), (44*$s), (44*$s))

  $white.Dispose()
  $inkBrush.Dispose()
  $accent.Dispose()
  $g.Dispose()
  return $bmp
}

$repoRoot = Split-Path -Parent $PSScriptRoot
$out = Join-Path $repoRoot "public\icons"
$ext = Join-Path $repoRoot "extension\icons"
if (-not (Test-Path -LiteralPath $out)) { New-Item -ItemType Directory -Path $out -Force | Out-Null }
if (-not (Test-Path -LiteralPath $ext)) { New-Item -ItemType Directory -Path $ext -Force | Out-Null }

$sizes = @(16, 32, 48, 64, 128, 180, 256, 512)
foreach ($sz in $sizes) {
  $bmp = New-PayMemoLogoBitmap -Size $sz
  $bmp.Save((Join-Path $out "logo-$sz.png"), [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  Write-Output "wrote logo-$sz.png"
}

# Copy the extension-relevant sizes into extension/icons
foreach ($sz in @(16, 32, 48, 128)) {
  Copy-Item -LiteralPath (Join-Path $out "logo-$sz.png") -Destination (Join-Path $ext "icon-$sz.png") -Force
  Write-Output "copied icon-$sz.png to extension"
}

# Also write a 256 og-image base + favicon
$bmp256 = New-PayMemoLogoBitmap -Size 256
$bmp256.Save((Join-Path $repoRoot "public\apple-touch-icon.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$bmp256.Dispose()
Write-Output "wrote apple-touch-icon.png"

# favicon.ico — multi-size icon file (16, 32, 48)
$icoSizes = @(16, 32, 48)
$icoImages = @()
foreach ($sz in $icoSizes) { $icoImages += (New-PayMemoLogoBitmap -Size $sz) }

# Encode .ico manually
$ms = New-Object System.IO.MemoryStream
$bw = New-Object System.IO.BinaryWriter $ms
$bw.Write([UInt16]0)               # reserved
$bw.Write([UInt16]1)               # type = 1 (icon)
$bw.Write([UInt16]$icoImages.Count) # count

$pngBytes = @()
foreach ($img in $icoImages) {
  $imgMs = New-Object System.IO.MemoryStream
  $img.Save($imgMs, [System.Drawing.Imaging.ImageFormat]::Png)
  $pngBytes += ,($imgMs.ToArray())
  $imgMs.Dispose()
}

$headerSize = 6 + (16 * $icoImages.Count)
$offset = $headerSize
for ($i = 0; $i -lt $icoImages.Count; $i++) {
  $img = $icoImages[$i]
  $bytes = $pngBytes[$i]
  $w = if ($img.Width -ge 256) { 0 } else { $img.Width }
  $h = if ($img.Height -ge 256) { 0 } else { $img.Height }
  $bw.Write([byte]$w)             # width
  $bw.Write([byte]$h)             # height
  $bw.Write([byte]0)              # colors in palette
  $bw.Write([byte]0)              # reserved
  $bw.Write([UInt16]1)            # color planes
  $bw.Write([UInt16]32)           # bits per pixel
  $bw.Write([UInt32]$bytes.Length) # size of data
  $bw.Write([UInt32]$offset)      # offset of data
  $offset += $bytes.Length
}
foreach ($bytes in $pngBytes) { $bw.Write($bytes) }
[System.IO.File]::WriteAllBytes((Join-Path $repoRoot "public\favicon.ico"), $ms.ToArray())
$bw.Dispose(); $ms.Dispose()
foreach ($img in $icoImages) { $img.Dispose() }
Write-Output "wrote favicon.ico"

Write-Output "Done."
