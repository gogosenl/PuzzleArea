Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$outDir = Join-Path $root "iap-promo-images"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$hintIcon = Join-Path $root "assets\ui-a-realistic\coin-hint.png"
$layerIcon = Join-Path $root "assets\ui-a-realistic\coin-layer.png"

$packages = @(
  @{ File="iap-hint-small.png";  Title="Ipucu Kucuk";  Amount="+40";  Label="Ipucu Parasi";  Icon=$hintIcon;  Accent=[System.Drawing.Color]::FromArgb(17, 129, 116); Soft=[System.Drawing.Color]::FromArgb(226, 246, 240) },
  @{ File="iap-hint-medium.png"; Title="Ipucu Orta";   Amount="+120"; Label="Ipucu Parasi";  Icon=$hintIcon;  Accent=[System.Drawing.Color]::FromArgb(17, 129, 116); Soft=[System.Drawing.Color]::FromArgb(226, 246, 240) },
  @{ File="iap-hint-large.png";  Title="Ipucu Buyuk";  Amount="+300"; Label="Ipucu Parasi";  Icon=$hintIcon;  Accent=[System.Drawing.Color]::FromArgb(17, 129, 116); Soft=[System.Drawing.Color]::FromArgb(226, 246, 240) },
  @{ File="iap-layer-small.png";  Title="Katman Kucuk";  Amount="+20";  Label="Katman Parasi"; Icon=$layerIcon; Accent=[System.Drawing.Color]::FromArgb(184, 126, 22); Soft=[System.Drawing.Color]::FromArgb(255, 244, 216) },
  @{ File="iap-layer-medium.png"; Title="Katman Orta";   Amount="+70";  Label="Katman Parasi"; Icon=$layerIcon; Accent=[System.Drawing.Color]::FromArgb(184, 126, 22); Soft=[System.Drawing.Color]::FromArgb(255, 244, 216) },
  @{ File="iap-layer-large.png";  Title="Katman Buyuk";  Amount="+180"; Label="Katman Parasi"; Icon=$layerIcon; Accent=[System.Drawing.Color]::FromArgb(184, 126, 22); Soft=[System.Drawing.Color]::FromArgb(255, 244, 216) }
)

function New-RoundedRectPath($x, $y, $w, $h, $r) {
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $d = $r * 2
  $path.AddArc($x, $y, $d, $d, 180, 90)
  $path.AddArc($x + $w - $d, $y, $d, $d, 270, 90)
  $path.AddArc($x + $w - $d, $y + $h - $d, $d, $d, 0, 90)
  $path.AddArc($x, $y + $h - $d, $d, $d, 90, 90)
  $path.CloseFigure()
  return $path
}

function Draw-CenteredText($g, $text, $font, $brush, $rect) {
  $format = New-Object System.Drawing.StringFormat
  $format.Alignment = [System.Drawing.StringAlignment]::Center
  $format.LineAlignment = [System.Drawing.StringAlignment]::Center
  $g.DrawString($text, $font, $brush, $rect, $format)
  $format.Dispose()
}

foreach ($pkg in $packages) {
  $bmp = New-Object System.Drawing.Bitmap 1024, 1024, ([System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

  $bg = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    (New-Object System.Drawing.Point 0, 0),
    (New-Object System.Drawing.Point 1024, 1024),
    [System.Drawing.Color]::FromArgb(238, 249, 245),
    [System.Drawing.Color]::FromArgb(255, 252, 240)
  )
  $g.FillRectangle($bg, 0, 0, 1024, 1024)
  $bg.Dispose()

  $cardShadow = New-RoundedRectPath 111 139 802 746 72
  $shadowBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(24, 0, 0, 0))
  $g.FillPath($shadowBrush, $cardShadow)
  $shadowBrush.Dispose()
  $cardShadow.Dispose()

  $card = New-RoundedRectPath 96 124 832 748 72
  $cardBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 255, 252, 244))
  $g.FillPath($cardBrush, $card)
  $cardBrush.Dispose()

  $borderPen = New-Object System.Drawing.Pen ($pkg.Accent, 5)
  $g.DrawPath($borderPen, $card)
  $borderPen.Dispose()
  $card.Dispose()

  $halo = New-RoundedRectPath 178 206 668 362 96
  $haloBrush = New-Object System.Drawing.SolidBrush $pkg.Soft
  $g.FillPath($haloBrush, $halo)
  $haloBrush.Dispose()
  $halo.Dispose()

  $icon = [System.Drawing.Image]::FromFile($pkg.Icon)
  $g.DrawImage($icon, 332, 210, 360, 360)
  $icon.Dispose()

  $dark = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(20, 55, 50))
  $muted = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(83, 112, 105))
  $accentBrush = New-Object System.Drawing.SolidBrush $pkg.Accent
  $white = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)

  $titleFont = New-Object System.Drawing.Font "Arial", 66, ([System.Drawing.FontStyle]::Bold), ([System.Drawing.GraphicsUnit]::Pixel)
  $amountFont = New-Object System.Drawing.Font "Arial", 104, ([System.Drawing.FontStyle]::Bold), ([System.Drawing.GraphicsUnit]::Pixel)
  $labelFont = New-Object System.Drawing.Font "Arial", 43, ([System.Drawing.FontStyle]::Bold), ([System.Drawing.GraphicsUnit]::Pixel)
  $brandFont = New-Object System.Drawing.Font "Arial", 34, ([System.Drawing.FontStyle]::Bold), ([System.Drawing.GraphicsUnit]::Pixel)

  Draw-CenteredText $g $pkg.Title $titleFont $dark (New-Object System.Drawing.RectangleF 120, 604, 784, 84)
  Draw-CenteredText $g $pkg.Amount $amountFont $accentBrush (New-Object System.Drawing.RectangleF 120, 692, 784, 120)
  Draw-CenteredText $g $pkg.Label $labelFont $muted (New-Object System.Drawing.RectangleF 120, 804, 784, 62)

  $pill = New-RoundedRectPath 256 900 512 76 38
  $pillBrush = New-Object System.Drawing.SolidBrush $pkg.Accent
  $g.FillPath($pillBrush, $pill)
  $pillBrush.Dispose()
  Draw-CenteredText $g "PUZZLE AREA" $brandFont $white (New-Object System.Drawing.RectangleF 256, 900, 512, 76)
  $pill.Dispose()

  $titleFont.Dispose()
  $amountFont.Dispose()
  $labelFont.Dispose()
  $brandFont.Dispose()
  $dark.Dispose()
  $muted.Dispose()
  $accentBrush.Dispose()
  $white.Dispose()
  $g.Dispose()

  $outPath = Join-Path $outDir $pkg.File
  $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
}

Write-Host "Created IAP promo images in $outDir"
