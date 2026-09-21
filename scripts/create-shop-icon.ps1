Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$assetPath = Join-Path $root "assets\ui-a-realistic\icon-shop.png"
$backupPath = Join-Path $root "assets\ui-a-realistic\icon-shop.original.png"
if (!(Test-Path $backupPath) -and (Test-Path $assetPath)) {
  Copy-Item -LiteralPath $assetPath -Destination $backupPath
}

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

$size = 512
$bmp = New-Object System.Drawing.Bitmap $size, $size, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.Clear([System.Drawing.Color]::Transparent)

$shadow = New-RoundedRectPath 61 70 390 390 104
$shadowBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(70, 21, 28, 44))
$g.FillPath($shadowBrush, $shadow)
$shadowBrush.Dispose()
$shadow.Dispose()

$outer = New-RoundedRectPath 48 44 416 416 104
$outerBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
  (New-Object System.Drawing.Rectangle 48, 44, 416, 416),
  [System.Drawing.Color]::FromArgb(255, 255, 218, 109),
  [System.Drawing.Color]::FromArgb(255, 167, 93, 25),
  [System.Drawing.Drawing2D.LinearGradientMode]::ForwardDiagonal
)
$g.FillPath($outerBrush, $outer)
$outerBrush.Dispose()

$outerPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(255, 96, 53, 24)), 8
$g.DrawPath($outerPen, $outer)
$outerPen.Dispose()
$outer.Dispose()

$inner = New-RoundedRectPath 74 70 364 364 86
$innerBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
  (New-Object System.Drawing.Rectangle 74, 70, 364, 364),
  [System.Drawing.Color]::FromArgb(255, 41, 60, 84),
  [System.Drawing.Color]::FromArgb(255, 15, 27, 44),
  [System.Drawing.Drawing2D.LinearGradientMode]::Vertical
)
$g.FillPath($innerBrush, $inner)
$innerBrush.Dispose()

$innerPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(180, 255, 245, 210)), 4
$g.DrawPath($innerPen, $inner)
$innerPen.Dispose()
$inner.Dispose()

$shinePath = New-RoundedRectPath 96 86 320 126 52
$shineBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
  (New-Object System.Drawing.Rectangle 96, 86, 320, 126),
  [System.Drawing.Color]::FromArgb(95, 255, 255, 255),
  [System.Drawing.Color]::FromArgb(0, 255, 255, 255),
  [System.Drawing.Drawing2D.LinearGradientMode]::Vertical
)
$g.FillPath($shineBrush, $shinePath)
$shineBrush.Dispose()
$shinePath.Dispose()

$cartShadowPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(85, 0, 0, 0)), 22
$cartShadowPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
$cartShadowPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
$cartShadowPen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
$cartPathShadow = New-Object System.Drawing.Drawing2D.GraphicsPath
$cartPathShadow.AddLines([System.Drawing.Point[]]@(
  (New-Object System.Drawing.Point 139, 174),
  (New-Object System.Drawing.Point 174, 174),
  (New-Object System.Drawing.Point 207, 287),
  (New-Object System.Drawing.Point 348, 287),
  (New-Object System.Drawing.Point 376, 208),
  (New-Object System.Drawing.Point 194, 208)
))
$g.DrawPath($cartShadowPen, $cartPathShadow)
$cartShadowPen.Dispose()
$cartPathShadow.Dispose()

$cartPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(255, 255, 205, 66)), 20
$cartPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
$cartPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
$cartPen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
$cartPath = New-Object System.Drawing.Drawing2D.GraphicsPath
$cartPath.AddLines([System.Drawing.Point[]]@(
  (New-Object System.Drawing.Point 132, 164),
  (New-Object System.Drawing.Point 169, 164),
  (New-Object System.Drawing.Point 202, 277),
  (New-Object System.Drawing.Point 342, 277),
  (New-Object System.Drawing.Point 370, 198),
  (New-Object System.Drawing.Point 188, 198)
))
$g.DrawPath($cartPen, $cartPath)
$cartPen.Dispose()

$cartHighlightPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(230, 255, 246, 179)), 6
$cartHighlightPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
$cartHighlightPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
$g.DrawLine($cartHighlightPen, 190, 208, 354, 208)
$g.DrawLine($cartHighlightPen, 203, 277, 336, 277)
$cartHighlightPen.Dispose()
$cartPath.Dispose()

$wheelShadow = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(95, 0, 0, 0))
$g.FillEllipse($wheelShadow, 194, 313, 58, 58)
$g.FillEllipse($wheelShadow, 313, 313, 58, 58)
$wheelShadow.Dispose()

$wheelBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
  (New-Object System.Drawing.Rectangle 188, 303, 58, 58),
  [System.Drawing.Color]::FromArgb(255, 255, 224, 106),
  [System.Drawing.Color]::FromArgb(255, 211, 116, 24),
  [System.Drawing.Drawing2D.LinearGradientMode]::ForwardDiagonal
)
$g.FillEllipse($wheelBrush, 188, 303, 58, 58)
$g.FillEllipse($wheelBrush, 307, 303, 58, 58)
$wheelBrush.Dispose()

$wheelPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(255, 101, 56, 24)), 5
$g.DrawEllipse($wheelPen, 188, 303, 58, 58)
$g.DrawEllipse($wheelPen, 307, 303, 58, 58)
$wheelPen.Dispose()

$sparkBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(230, 255, 255, 255))
$g.FillEllipse($sparkBrush, 371, 119, 14, 14)
$g.FillEllipse($sparkBrush, 111, 359, 9, 9)
$sparkBrush.Dispose()

$g.Dispose()
$bmp.Save($assetPath, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()

Write-Host "Updated $assetPath"
