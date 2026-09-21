Add-Type -AssemblyName System.Drawing

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$outDir = Join-Path $root "assets\ui"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

function New-Bitmap([int]$w, [int]$h) {
  $bmp = New-Object System.Drawing.Bitmap $w, $h, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.Clear([System.Drawing.Color]::Transparent)
  return @{ Bitmap = $bmp; Graphics = $g }
}

function Color-Hex([string]$hex, [int]$alpha = 255) {
  $hex = $hex.TrimStart("#")
  return [System.Drawing.Color]::FromArgb($alpha, [Convert]::ToInt32($hex.Substring(0, 2), 16), [Convert]::ToInt32($hex.Substring(2, 2), 16), [Convert]::ToInt32($hex.Substring(4, 2), 16))
}

function New-RoundPath([float]$x, [float]$y, [float]$w, [float]$h, [float]$r) {
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $d = $r * 2
  $path.AddArc($x, $y, $d, $d, 180, 90)
  $path.AddArc($x + $w - $d, $y, $d, $d, 270, 90)
  $path.AddArc($x + $w - $d, $y + $h - $d, $d, $d, 0, 90)
  $path.AddArc($x, $y + $h - $d, $d, $d, 90, 90)
  $path.CloseFigure()
  return $path
}

function Fill-Round([System.Drawing.Graphics]$g, [float]$x, [float]$y, [float]$w, [float]$h, [float]$r, [System.Drawing.Brush]$brush, [System.Drawing.Pen]$pen = $null) {
  $path = New-RoundPath $x $y $w $h $r
  $g.FillPath($brush, $path)
  if ($pen -ne $null) { $g.DrawPath($pen, $path) }
  $path.Dispose()
}

function Fill-GradientRound([System.Drawing.Graphics]$g, [float]$x, [float]$y, [float]$w, [float]$h, [float]$r, [System.Drawing.Color]$top, [System.Drawing.Color]$bottom, [System.Drawing.Pen]$pen = $null) {
  $rect = New-Object System.Drawing.RectangleF $x, $y, $w, $h
  $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush $rect, $top, $bottom, 90
  Fill-Round $g $x $y $w $h $r $brush $pen
  $brush.Dispose()
}

function Draw-SoftShadow([System.Drawing.Graphics]$g, [float]$x, [float]$y, [float]$w, [float]$h, [float]$r) {
  for ($i = 7; $i -ge 1; $i--) {
    $alpha = [int](8 + ($i * 5))
    $brush = New-Object System.Drawing.SolidBrush (Color-Hex "18202a" $alpha)
    Fill-Round $g ($x - $i) ($y + $i) ($w + $i * 2) ($h + $i * 2) ($r + $i) $brush
    $brush.Dispose()
  }
}

function Draw-Star([System.Drawing.Graphics]$g, [float]$cx, [float]$cy, [float]$outer, [float]$inner, [System.Drawing.Color]$fill, [System.Drawing.Color]$stroke) {
  $pts = New-Object System.Collections.Generic.List[System.Drawing.PointF]
  for ($i = 0; $i -lt 10; $i++) {
    $angle = (-90 + $i * 36) * [Math]::PI / 180
    $rad = if ($i % 2 -eq 0) { $outer } else { $inner }
    $pts.Add((New-Object System.Drawing.PointF (($cx + [Math]::Cos($angle) * $rad), ($cy + [Math]::Sin($angle) * $rad))))
  }
  $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush (New-Object System.Drawing.RectangleF ($cx-$outer), ($cy-$outer), ($outer*2), ($outer*2)), (Color-Hex "fff8a8"), $fill, 90
  $pen = New-Object System.Drawing.Pen $stroke, 5
  $g.FillPolygon($brush, $pts.ToArray())
  $g.DrawPolygon($pen, $pts.ToArray())
  $brush.Dispose(); $pen.Dispose()
}

function Draw-Coin([System.Drawing.Graphics]$g, [float]$cx, [float]$cy, [float]$r, [string]$kind) {
  $shadow = New-Object System.Drawing.SolidBrush (Color-Hex "18202a" 36)
  $g.FillEllipse($shadow, $cx-$r+4, $cy-$r+8, $r*2, $r*2)
  $shadow.Dispose()
  $gold = New-Object System.Drawing.Drawing2D.LinearGradientBrush (New-Object System.Drawing.RectangleF ($cx-$r), ($cy-$r), ($r*2), ($r*2)), (Color-Hex "ffe78a"), (Color-Hex "f6a51f"), 90
  $stroke = New-Object System.Drawing.Pen (Color-Hex "d88a12"), 5
  $g.FillEllipse($gold, $cx-$r, $cy-$r, $r*2, $r*2)
  $g.DrawEllipse($stroke, $cx-$r, $cy-$r, $r*2, $r*2)
  $gold.Dispose(); $stroke.Dispose()
  $innerPen = New-Object System.Drawing.Pen (Color-Hex "fff3b9" 220), 4
  $g.DrawEllipse($innerPen, $cx-$r+11, $cy-$r+11, ($r-11)*2, ($r-11)*2)
  $innerPen.Dispose()

  if ($kind -eq "layer") {
    $turq = New-Object System.Drawing.SolidBrush (Color-Hex "45d9c0")
    $blue = New-Object System.Drawing.SolidBrush (Color-Hex "4db5ff")
    Fill-Round $g ($cx-28) ($cy-15) 56 16 8 $blue
    Fill-Round $g ($cx-28) ($cy+4) 56 16 8 $turq
    $turq.Dispose(); $blue.Dispose()
  } elseif ($kind -eq "hint") {
    $bulb = New-Object System.Drawing.SolidBrush (Color-Hex "fff2a6")
    $base = New-Object System.Drawing.SolidBrush (Color-Hex "4ecdc4")
    $g.FillEllipse($bulb, $cx-18, $cy-24, 36, 38)
    Fill-Round $g ($cx-13) ($cy+8) 26 15 5 $base
    $bulb.Dispose(); $base.Dispose()
  } else {
    $font = New-Object System.Drawing.Font "Arial", 34, ([System.Drawing.FontStyle]::Bold), ([System.Drawing.GraphicsUnit]::Pixel)
    $fmt = New-Object System.Drawing.StringFormat
    $fmt.Alignment = [System.Drawing.StringAlignment]::Center
    $fmt.LineAlignment = [System.Drawing.StringAlignment]::Center
    $textBrush = New-Object System.Drawing.SolidBrush (Color-Hex "8c4b00")
    $g.DrawString("2x", $font, $textBrush, (New-Object System.Drawing.RectangleF ($cx-$r), ($cy-$r+2), ($r*2), ($r*2)), $fmt)
    $font.Dispose(); $fmt.Dispose(); $textBrush.Dispose()
  }
}

function Save-Art($art, [string]$name) {
  $path = Join-Path $outDir $name
  $art.Graphics.Dispose()
  $art.Bitmap.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $art.Bitmap.Dispose()
}

function New-IconArt([string]$name, [scriptblock]$draw) {
  $art = New-Bitmap 256 256
  $g = $art.Graphics
  Draw-SoftShadow $g 34 30 188 188 44
  Fill-GradientRound $g 34 24 188 188 42 (Color-Hex "0d2742") (Color-Hex "0b1b30") (New-Object System.Drawing.Pen (Color-Hex "6ef0d4" 130), 3)
  & $draw $g
  Save-Art $art $name
}

New-IconArt "icon-home-premium.png" {
  param($g)
  $roof = @(
    (New-Object System.Drawing.PointF 128,62),
    (New-Object System.Drawing.PointF 67,119),
    (New-Object System.Drawing.PointF 87,138),
    (New-Object System.Drawing.PointF 128,99),
    (New-Object System.Drawing.PointF 169,138),
    (New-Object System.Drawing.PointF 189,119)
  )
  $roofBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush (New-Object System.Drawing.RectangleF 64,58,128,82), (Color-Hex "5cf2d1"), (Color-Hex "2aa9ff"), 35
  $g.FillPolygon($roofBrush, $roof)
  $roofBrush.Dispose()
  $body = New-Object System.Drawing.SolidBrush (Color-Hex "fff4db")
  Fill-Round $g 86 120 84 70 14 $body
  $door = New-Object System.Drawing.SolidBrush (Color-Hex "ffc93d")
  Fill-Round $g 118 145 22 45 7 $door
  $body.Dispose(); $door.Dispose()
}

New-IconArt "icon-levels-premium.png" {
  param($g)
  $colors = @("5cf2d1", "35b8ff", "ffc93d", "7ee6c8")
  $coords = @(@(74,70), @(124,70), @(74,120), @(124,120))
  for ($i=0; $i -lt 4; $i++) {
    $b = New-Object System.Drawing.SolidBrush (Color-Hex $colors[$i])
    Fill-Round $g $coords[$i][0] $coords[$i][1] 42 42 10 $b
    $b.Dispose()
  }
}

New-IconArt "icon-shop-premium.png" {
  param($g)
  $bag = New-Object System.Drawing.SolidBrush (Color-Hex "fff4db")
  Fill-Round $g 72 86 112 102 24 $bag
  $bag.Dispose()
  $pen = New-Object System.Drawing.Pen (Color-Hex "42dbc5"), 8
  $g.DrawArc($pen, 98, 58, 60, 58, 190, 160)
  $pen.Dispose()
  Draw-Coin $g 158 156 25 "2x"
}

New-IconArt "icon-settings-premium.png" {
  param($g)
  $gear = New-Object System.Drawing.SolidBrush (Color-Hex "e9eef5")
  for ($i=0; $i -lt 8; $i++) {
    $g.TranslateTransform(128,128)
    $g.RotateTransform($i * 45)
    Fill-Round $g -12 -72 24 38 7 $gear
    $g.ResetTransform()
  }
  $g.FillEllipse($gear, 74, 74, 108, 108)
  $hole = New-Object System.Drawing.SolidBrush (Color-Hex "0b1b30")
  $g.FillEllipse($hole, 105, 105, 46, 46)
  $gear.Dispose(); $hole.Dispose()
}

New-IconArt "icon-hint-premium.png" {
  param($g)
  $bulb = New-Object System.Drawing.Drawing2D.LinearGradientBrush (New-Object System.Drawing.RectangleF 78,54,100,122), (Color-Hex "fff7b8"), (Color-Hex "ffc327"), 90
  $g.FillEllipse($bulb, 82, 58, 92, 98)
  $bulb.Dispose()
  $base = New-Object System.Drawing.SolidBrush (Color-Hex "47d7c5")
  Fill-Round $g 103 150 50 18 7 $base
  Fill-Round $g 109 172 38 18 7 $base
  $base.Dispose()
}

$coinLayer = New-Bitmap 256 256
Draw-Coin $coinLayer.Graphics 128 128 76 "layer"
Save-Art $coinLayer "coin-layer-premium.png"

$coinHint = New-Bitmap 256 256
Draw-Coin $coinHint.Graphics 128 128 76 "hint"
Save-Art $coinHint "coin-hint-premium.png"

$badge = New-Bitmap 520 180
$g = $badge.Graphics
$pen = New-Object System.Drawing.Pen (Color-Hex "26a891"), 4
$side = New-Object System.Drawing.SolidBrush (Color-Hex "24c7a8")
Fill-Round $g 92 62 70 58 18 $side
Fill-Round $g 358 62 70 58 18 $side
$side.Dispose()
Fill-GradientRound $g 128 42 264 84 28 (Color-Hex "34dfbd") (Color-Hex "20b997") $pen
$gold = New-Object System.Drawing.SolidBrush (Color-Hex "f7c748")
Fill-Round $g 170 110 180 28 12 $gold
$shine = New-Object System.Drawing.SolidBrush (Color-Hex "ffffff" 58)
Fill-Round $g 170 58 180 15 8 $shine
$gold.Dispose(); $shine.Dispose(); $pen.Dispose()
Save-Art $badge "reward-header-badge.png"

$doubleBtn = New-Bitmap 1200 220
$g = $doubleBtn.Graphics
Draw-SoftShadow $g 20 22 1160 156 36
Fill-GradientRound $g 20 12 1160 156 34 (Color-Hex "ffd84d") (Color-Hex "f2a51f") (New-Object System.Drawing.Pen (Color-Hex "ff8f36"), 4)
$shine = New-Object System.Drawing.SolidBrush (Color-Hex "ffffff" 54)
Fill-Round $g 42 28 1116 56 24 $shine
$shine.Dispose()
Save-Art $doubleBtn "reward-double-button-bg.png"

$continueBtn = New-Bitmap 1200 190
$g = $continueBtn.Graphics
Draw-SoftShadow $g 20 22 1160 128 30
Fill-GradientRound $g 20 10 1160 128 28 (Color-Hex "fff8ef") (Color-Hex "f5e2d0") (New-Object System.Drawing.Pen (Color-Hex "ff9d8a"), 4)
$shine = New-Object System.Drawing.SolidBrush (Color-Hex "ffffff" 72)
Fill-Round $g 44 26 1112 40 19 $shine
$shine.Dispose()
Save-Art $continueBtn "reward-continue-button-bg.png"

$hintButton = New-Bitmap 640 240
$g = $hintButton.Graphics
Draw-SoftShadow $g 22 30 596 150 34
Fill-GradientRound $g 22 18 596 150 32 (Color-Hex "263448") (Color-Hex "121c2c") (New-Object System.Drawing.Pen (Color-Hex "6ef0d4" 120), 4)
$bulb = New-Object System.Drawing.Drawing2D.LinearGradientBrush (New-Object System.Drawing.RectangleF 228,46,100,104), (Color-Hex "fff7b8"), (Color-Hex "ffc327"), 90
$g.FillEllipse($bulb, 236, 48, 86, 92)
$bulb.Dispose()
$base = New-Object System.Drawing.SolidBrush (Color-Hex "46d7c6")
Fill-Round $g 258 134 42 17 7 $base
$base.Dispose()
Draw-Coin $g 380 93 42 "hint"
Save-Art $hintButton "button-hint-premium.png"

$preview = New-Bitmap 1440 1200
$g = $preview.Graphics
$bg = New-Object System.Drawing.Drawing2D.LinearGradientBrush (New-Object System.Drawing.RectangleF 0,0,1440,1200), (Color-Hex "fff4db"), (Color-Hex "102034"), 90
$g.FillRectangle($bg, 0, 0, 1440, 1200)
$bg.Dispose()
$titleFont = New-Object System.Drawing.Font "Arial", 52, ([System.Drawing.FontStyle]::Bold), ([System.Drawing.GraphicsUnit]::Pixel)
$labelFont = New-Object System.Drawing.Font "Arial", 24, ([System.Drawing.FontStyle]::Bold), ([System.Drawing.GraphicsUnit]::Pixel)
$titleBrush = New-Object System.Drawing.SolidBrush (Color-Hex "18202a")
$labelBrush = New-Object System.Drawing.SolidBrush (Color-Hex "fffaf0")
$g.DrawString("Puzzle Area UI Asset Set", $titleFont, $titleBrush, 60, 46)
$files = @(
  @("reward-header-badge.png", 80, 150, 420, 145, "Completion badge"),
  @("reward-double-button-bg.png", 560, 150, 760, 140, "2x reward button"),
  @("reward-continue-button-bg.png", 560, 330, 760, 120, "Continue button"),
  @("icon-home-premium.png", 80, 520, 150, 150, "Home"),
  @("icon-levels-premium.png", 280, 520, 150, 150, "Levels"),
  @("icon-shop-premium.png", 480, 520, 150, 150, "Store"),
  @("icon-settings-premium.png", 680, 520, 150, 150, "Settings"),
  @("coin-layer-premium.png", 900, 520, 150, 150, "Layer coin"),
  @("coin-hint-premium.png", 1100, 520, 150, 150, "Hint coin"),
  @("button-hint-premium.png", 250, 780, 560, 190, "Hint use button")
)
foreach ($item in $files) {
  $img = [System.Drawing.Image]::FromFile((Join-Path $outDir $item[0]))
  $g.DrawImage($img, [int]$item[1], [int]$item[2], [int]$item[3], [int]$item[4])
  $g.DrawString($item[5], $labelFont, $labelBrush, [int]$item[1], ([int]$item[2] + [int]$item[4] + 14))
  $img.Dispose()
}
$titleFont.Dispose(); $labelFont.Dispose(); $titleBrush.Dispose(); $labelBrush.Dispose()
Save-Art $preview "puzzle-area-ui-assets-preview.png"
