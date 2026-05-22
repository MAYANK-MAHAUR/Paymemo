# Generate og-image (1200x630) for social cards
Add-Type -AssemblyName System.Drawing

$repoRoot = Split-Path -Parent $PSScriptRoot

$w = 1200; $h = 630
$bmp = New-Object System.Drawing.Bitmap $w, $h
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

# Background: ink → green diagonal
$rect = [System.Drawing.RectangleF]::new(0, 0, [single]$w, [single]$h)
$ink = [System.Drawing.Color]::FromArgb(255, 14, 14, 14)
$green = [System.Drawing.Color]::FromArgb(255, 168, 241, 57)
$brush = [System.Drawing.Drawing2D.LinearGradientBrush]::new($rect, $ink, $green, 25.0)
$g.FillRectangle($brush, 0, 0, $w, $h)
$brush.Dispose()

# Soft green orb (decorative)
$pgb = New-Object System.Drawing.Drawing2D.PathGradientBrush(
  @([System.Drawing.PointF]::new(900,150),
    [System.Drawing.PointF]::new(1200,150),
    [System.Drawing.PointF]::new(1200,450),
    [System.Drawing.PointF]::new(900,450))
)
$pgb.CenterPoint = [System.Drawing.PointF]::new(1050, 300)
$pgb.CenterColor = [System.Drawing.Color]::FromArgb(140, 168, 241, 57)
$pgb.SurroundColors = @([System.Drawing.Color]::FromArgb(0, 168, 241, 57))
$g.FillEllipse($pgb, 800, 50, 500, 500)
$pgb.Dispose()

# Paste logo
$logo = [System.Drawing.Image]::FromFile((Join-Path $repoRoot "public\icons\logo-256.png"))
$g.DrawImage($logo, 120, 187, 256, 256)
$logo.Dispose()

# Wordmark "PayMemo"
$font = New-Object System.Drawing.Font("Segoe UI", 96, [System.Drawing.FontStyle]::Bold)
$wb = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 255, 255, 255))
$g.DrawString("PayMemo", $font, $wb, 410, 195)
$font.Dispose()

# Tagline
$tagFont = New-Object System.Drawing.Font("Segoe UI", 32, [System.Drawing.FontStyle]::Regular)
$tagBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(235, 235, 235, 235))
$g.DrawString("Remember every transaction.", $tagFont, $tagBrush, 415, 355)
$tagFont.Dispose()
$tagBrush.Dispose()

# Bottom strip
$stripFont = New-Object System.Drawing.Font("Segoe UI", 22, [System.Drawing.FontStyle]::Regular)
$stripBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(220, 168, 241, 57))
$g.DrawString("Financial memory for Web3 - on Morph.", $stripFont, $stripBrush, 418, 420)
$stripFont.Dispose()
$stripBrush.Dispose()
$wb.Dispose()

$bmp.Save((Join-Path $repoRoot "public\og-image.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $bmp.Dispose()
Write-Output "wrote og-image.png"
