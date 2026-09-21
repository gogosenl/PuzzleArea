Add-Type -AssemblyName System.Drawing

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$outDir = Join-Path $root "assets\ui-options"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

function New-Art([int]$w, [int]$h) {
  $bmp = New-Object System.Drawing.Bitmap $w, $h, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.Clear([System.Drawing.Color]::Transparent)
  return @{ Bitmap = $bmp; Graphics = $g }
}

function C([string]$hex, [int]$alpha = 255) {
  $hex = $hex.TrimStart("#")
  return [System.Drawing.Color]::FromArgb($alpha, [Convert]::ToInt32($hex.Substring(0, 2), 16), [Convert]::ToInt32($hex.Substring(2, 2), 16), [Convert]::ToInt32($hex.Substring(4, 2), 16))
}

function Path-Round([float]$x, [float]$y, [float]$w, [float]$h, [float]$r) {
  $p = New-Object System.Drawing.Drawing2D.GraphicsPath
  $d = $r * 2
  $p.AddArc($x, $y, $d, $d, 180, 90)
  $p.AddArc($x + $w - $d, $y, $d, $d, 270, 90)
  $p.AddArc($x + $w - $d, $y + $h - $d, $d, $d, 0, 90)
  $p.AddArc($x, $y + $h - $d, $d, $d, 90, 90)
  $p.CloseFigure()
  return $p
}

function Fill-Round($g, [float]$x, [float]$y, [float]$w, [float]$h, [float]$r, $brush, $pen = $null) {
  $p = Path-Round $x $y $w $h $r
  $g.FillPath($brush, $p)
  if ($pen -ne $null) { $g.DrawPath($pen, $p) }
  $p.Dispose()
}

function Grad-Round($g, [float]$x, [float]$y, [float]$w, [float]$h, [float]$r, [string]$top, [string]$bottom, [string]$border) {
  $rect = New-Object System.Drawing.RectangleF $x, $y, $w, $h
  $b = New-Object System.Drawing.Drawing2D.LinearGradientBrush $rect, (C $top), (C $bottom), 90
  $p = New-Object System.Drawing.Pen (C $border), 4
  Fill-Round $g $x $y $w $h $r $b $p
  $b.Dispose(); $p.Dispose()
}

function Shadow($g, [float]$x, [float]$y, [float]$w, [float]$h, [float]$r, [int]$strength = 1) {
  for ($i = 8; $i -ge 1; $i--) {
    $alpha = [int]((5 + $i * 5) * $strength)
    $b = New-Object System.Drawing.SolidBrush (C "101827" $alpha)
    Fill-Round $g ($x - $i) ($y + $i) ($w + $i * 2) ($h + $i * 2) ($r + $i) $b
    $b.Dispose()
  }
}

function Star($g, [float]$cx, [float]$cy, [float]$outer, [float]$inner) {
  $pts = New-Object System.Collections.Generic.List[System.Drawing.PointF]
  for ($i = 0; $i -lt 10; $i++) {
    $a = (-90 + $i * 36) * [Math]::PI / 180
    $r = if ($i % 2 -eq 0) { $outer } else { $inner }
    $pts.Add((New-Object System.Drawing.PointF (($cx + [Math]::Cos($a) * $r), ($cy + [Math]::Sin($a) * $r))))
  }
  $rect = New-Object System.Drawing.RectangleF ($cx-$outer), ($cy-$outer), ($outer*2), ($outer*2)
  $b = New-Object System.Drawing.Drawing2D.LinearGradientBrush $rect, (C "fff9b8"), (C "f7a10d"), 90
  $p = New-Object System.Drawing.Pen (C "ffce28"), 5
  $g.FillPolygon($b, $pts.ToArray())
  $g.DrawPolygon($p, $pts.ToArray())
  $b.Dispose(); $p.Dispose()
}

function Coin($g, [float]$cx, [float]$cy, [float]$r, [string]$type, $pal) {
  $shadow = New-Object System.Drawing.SolidBrush (C "101827" 34)
  $g.FillEllipse($shadow, $cx-$r+4, $cy-$r+8, $r*2, $r*2)
  $shadow.Dispose()
  $rect = New-Object System.Drawing.RectangleF ($cx-$r), ($cy-$r), ($r*2), ($r*2)
  $b = New-Object System.Drawing.Drawing2D.LinearGradientBrush $rect, (C "fff0a2"), (C $pal.gold2), 90
  $p = New-Object System.Drawing.Pen (C $pal.goldStroke), 5
  $g.FillEllipse($b, $cx-$r, $cy-$r, $r*2, $r*2)
  $g.DrawEllipse($p, $cx-$r, $cy-$r, $r*2, $r*2)
  $b.Dispose(); $p.Dispose()
  $inner = New-Object System.Drawing.Pen (C "ffffff" 170), 4
  $g.DrawEllipse($inner, $cx-$r+11, $cy-$r+11, ($r-11)*2, ($r-11)*2)
  $inner.Dispose()
  if ($type -eq "layer") {
    $b1 = New-Object System.Drawing.SolidBrush (C $pal.blue)
    $b2 = New-Object System.Drawing.SolidBrush (C $pal.teal)
    Fill-Round $g ($cx-27) ($cy-14) 54 15 7 $b1
    Fill-Round $g ($cx-27) ($cy+5) 54 15 7 $b2
    $b1.Dispose(); $b2.Dispose()
  } elseif ($type -eq "hint") {
    $bulb = New-Object System.Drawing.SolidBrush (C "fff3a8")
    $base = New-Object System.Drawing.SolidBrush (C $pal.teal)
    $g.FillEllipse($bulb, $cx-18, $cy-24, 36, 38)
    Fill-Round $g ($cx-13) ($cy+8) 26 15 5 $base
    $bulb.Dispose(); $base.Dispose()
  } else {
    $font = New-Object System.Drawing.Font "Arial", 36, ([System.Drawing.FontStyle]::Bold), ([System.Drawing.GraphicsUnit]::Pixel)
    $fmt = New-Object System.Drawing.StringFormat
    $fmt.Alignment = [System.Drawing.StringAlignment]::Center
    $fmt.LineAlignment = [System.Drawing.StringAlignment]::Center
    $brush = New-Object System.Drawing.SolidBrush (C "854700")
    $g.DrawString("2x", $font, $brush, (New-Object System.Drawing.RectangleF ($cx-$r), ($cy-$r+2), ($r*2), ($r*2)), $fmt)
    $font.Dispose(); $fmt.Dispose(); $brush.Dispose()
  }
}

function Save($art, [string]$file) {
  $path = Join-Path $outDir $file
  $art.Graphics.Dispose()
  $art.Bitmap.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $art.Bitmap.Dispose()
}

function Icon($prefix, $name, $pal, [scriptblock]$draw) {
  $art = New-Art 256 256
  $g = $art.Graphics
  Shadow $g 34 30 188 188 44 1
  Grad-Round $g 34 24 188 188 42 $pal.iconTop $pal.iconBottom $pal.stroke
  & $draw $g $pal
  Save $art "$prefix-$name.png"
}

function Build-Option($prefix, $pal) {
  Icon $prefix "home" $pal {
    param($g, $pal)
    $roof = @((New-Object System.Drawing.PointF 128,60), (New-Object System.Drawing.PointF 67,118), (New-Object System.Drawing.PointF 88,139), (New-Object System.Drawing.PointF 128,101), (New-Object System.Drawing.PointF 168,139), (New-Object System.Drawing.PointF 189,118))
    $b = New-Object System.Drawing.Drawing2D.LinearGradientBrush (New-Object System.Drawing.RectangleF 66,58,126,84), (C $pal.teal), (C $pal.blue), 35
    $g.FillPolygon($b, $roof); $b.Dispose()
    $body = New-Object System.Drawing.SolidBrush (C $pal.cream)
    $door = New-Object System.Drawing.SolidBrush (C $pal.gold)
    Fill-Round $g 86 120 84 70 14 $body
    Fill-Round $g 118 145 22 45 7 $door
    $body.Dispose(); $door.Dispose()
  }
  Icon $prefix "levels" $pal {
    param($g, $pal)
    $colors = @($pal.teal, $pal.blue, $pal.gold, $pal.mint)
    $xy = @(@(74,70), @(124,70), @(74,120), @(124,120))
    for ($i=0; $i -lt 4; $i++) {
      $b = New-Object System.Drawing.SolidBrush (C $colors[$i])
      Fill-Round $g $xy[$i][0] $xy[$i][1] 42 42 10 $b
      $b.Dispose()
    }
  }
  Icon $prefix "shop" $pal {
    param($g, $pal)
    $bag = New-Object System.Drawing.SolidBrush (C $pal.cream)
    Fill-Round $g 72 86 112 102 24 $bag
    $bag.Dispose()
    $pen = New-Object System.Drawing.Pen (C $pal.teal), 8
    $g.DrawArc($pen, 98, 58, 60, 58, 190, 160)
    $pen.Dispose()
    Coin $g 158 156 25 "2x" $pal
  }
  Icon $prefix "settings" $pal {
    param($g, $pal)
    $gear = New-Object System.Drawing.SolidBrush (C $pal.gear)
    for ($i=0; $i -lt 8; $i++) {
      $g.TranslateTransform(128,128); $g.RotateTransform($i * 45)
      Fill-Round $g -12 -72 24 38 7 $gear
      $g.ResetTransform()
    }
    $g.FillEllipse($gear, 74, 74, 108, 108)
    $hole = New-Object System.Drawing.SolidBrush (C $pal.iconBottom)
    $g.FillEllipse($hole, 105, 105, 46, 46)
    $gear.Dispose(); $hole.Dispose()
  }
  Icon $prefix "hint" $pal {
    param($g, $pal)
    $rect = New-Object System.Drawing.RectangleF 78,54,100,122
    $bulb = New-Object System.Drawing.Drawing2D.LinearGradientBrush $rect, (C "fff7b8"), (C $pal.gold), 90
    $g.FillEllipse($bulb, 82, 58, 92, 98)
    $bulb.Dispose()
    $base = New-Object System.Drawing.SolidBrush (C $pal.teal)
    Fill-Round $g 103 150 50 18 7 $base
    Fill-Round $g 109 172 38 18 7 $base
    $base.Dispose()
  }

  $coinLayer = New-Art 256 256
  Coin $coinLayer.Graphics 128 128 76 "layer" $pal
  Save $coinLayer "$prefix-coin-layer.png"

  $coinHint = New-Art 256 256
  Coin $coinHint.Graphics 128 128 76 "hint" $pal
  Save $coinHint "$prefix-coin-hint.png"

  $header = New-Art 520 180
  $g = $header.Graphics
  $side = New-Object System.Drawing.SolidBrush (C $pal.cap2)
  Fill-Round $g 92 62 70 58 18 $side
  Fill-Round $g 358 62 70 58 18 $side
  $side.Dispose()
  Grad-Round $g 128 42 264 84 28 $pal.cap1 $pal.cap2 $pal.stroke
  $gold = New-Object System.Drawing.SolidBrush (C $pal.gold)
  Fill-Round $g 170 110 180 28 12 $gold
  $shine = New-Object System.Drawing.SolidBrush (C "ffffff" 58)
  Fill-Round $g 170 58 180 15 8 $shine
  $gold.Dispose(); $shine.Dispose()
  Save $header "$prefix-reward-header.png"

  $double = New-Art 1200 220
  $g = $double.Graphics
  Shadow $g 20 22 1160 156 36 1
  Grad-Round $g 20 12 1160 156 34 $pal.double1 $pal.double2 $pal.doubleStroke
  $shine = New-Object System.Drawing.SolidBrush (C "ffffff" 54)
  Fill-Round $g 42 28 1116 56 24 $shine
  $shine.Dispose()
  Save $double "$prefix-reward-double-bg.png"

  $cont = New-Art 1200 190
  $g = $cont.Graphics
  Shadow $g 20 22 1160 128 30 1
  Grad-Round $g 20 10 1160 128 28 $pal.continue1 $pal.continue2 $pal.continueStroke
  $shine = New-Object System.Drawing.SolidBrush (C "ffffff" 72)
  Fill-Round $g 44 26 1112 40 19 $shine
  $shine.Dispose()
  Save $cont "$prefix-reward-continue-bg.png"

  $hintBtn = New-Art 640 240
  $g = $hintBtn.Graphics
  Shadow $g 22 30 596 150 34 1
  Grad-Round $g 22 18 596 150 32 $pal.iconTop $pal.iconBottom $pal.stroke
  $rect = New-Object System.Drawing.RectangleF 228,46,100,104
  $bulb = New-Object System.Drawing.Drawing2D.LinearGradientBrush $rect, (C "fff7b8"), (C $pal.gold), 90
  $g.FillEllipse($bulb, 236, 48, 86, 92)
  $bulb.Dispose()
  $base = New-Object System.Drawing.SolidBrush (C $pal.teal)
  Fill-Round $g 258 134 42 17 7 $base
  $base.Dispose()
  Coin $g 380 93 42 "hint" $pal
  Save $hintBtn "$prefix-button-hint.png"
}

$options = @(
  @{ id="a"; title="A - Aqua Gold"; iconTop="102943"; iconBottom="071a2f"; stroke="37d8c2"; teal="35e0c2"; blue="40bfff"; mint="8df2cf"; gold="ffd24a"; gold2="f4a21c"; goldStroke="db8611"; cap1="34dfbd"; cap2="20b997"; double1="ffd84d"; double2="f2a51f"; doubleStroke="ff8f36"; continue1="fff8ef"; continue2="f5e2d0"; continueStroke="ff9d8a"; cream="fff4db"; gear="edf3fb" },
  @{ id="b"; title="B - Royal Night"; iconTop="26184d"; iconBottom="100b26"; stroke="a777ff"; teal="47e4d1"; blue="7d7cff"; mint="89e8bd"; gold="ffcf45"; gold2="eb8f20"; goldStroke="bb6d10"; cap1="9a6cff"; cap2="6638dc"; double1="ffcf45"; double2="e17826"; doubleStroke="b86aff"; continue1="f6f0ff"; continue2="ded0ff"; continueStroke="a777ff"; cream="fff3df"; gear="f1ecff" },
  @{ id="c"; title="C - Coral Arcade"; iconTop="16364a"; iconBottom="10213a"; stroke="ff7967"; teal="38d5c6"; blue="4db6ff"; mint="90e7ba"; gold="ffd34f"; gold2="f2a21f"; goldStroke="d88412"; cap1="ff8a75"; cap2="ef5548"; double1="ffdf57"; double2="ff785e"; doubleStroke="ff6b5a"; continue1="fff5ea"; continue2="ffe0d6"; continueStroke="ff8d77"; cream="fff4df"; gear="edf2f9" }
)

foreach ($pal in $options) {
  Build-Option $pal.id $pal
}

$sheet = New-Art 1800 1600
$g = $sheet.Graphics
$bg = New-Object System.Drawing.Drawing2D.LinearGradientBrush (New-Object System.Drawing.RectangleF 0,0,1800,1600), (C "fff3d7"), (C "0d1b2d"), 90
$g.FillRectangle($bg, 0, 0, 1800, 1600)
$bg.Dispose()
$titleFont = New-Object System.Drawing.Font "Arial", 54, ([System.Drawing.FontStyle]::Bold), ([System.Drawing.GraphicsUnit]::Pixel)
$labelFont = New-Object System.Drawing.Font "Arial", 28, ([System.Drawing.FontStyle]::Bold), ([System.Drawing.GraphicsUnit]::Pixel)
$smallFont = New-Object System.Drawing.Font "Arial", 22, ([System.Drawing.FontStyle]::Bold), ([System.Drawing.GraphicsUnit]::Pixel)
$dark = New-Object System.Drawing.SolidBrush (C "101827")
$light = New-Object System.Drawing.SolidBrush (C "fffaf0")
$g.DrawString("Puzzle Area Asset Options", $titleFont, $dark, 60, 48)

for ($row = 0; $row -lt $options.Count; $row++) {
  $pal = $options[$row]
  $y = 150 + $row * 460
  $g.DrawString($pal.title, $labelFont, $dark, 70, $y)
  $items = @(
    [pscustomobject]@{ file="$($pal.id)-reward-header.png"; x=70; y=$y+70; w=260; h=90 },
    [pscustomobject]@{ file="$($pal.id)-reward-double-bg.png"; x=380; y=$y+62; w=560; h=103 },
    [pscustomobject]@{ file="$($pal.id)-reward-continue-bg.png"; x=980; y=$y+70; w=500; h=80 },
    [pscustomobject]@{ file="$($pal.id)-home.png"; x=70; y=$y+220; w=110; h=110 },
    [pscustomobject]@{ file="$($pal.id)-levels.png"; x=210; y=$y+220; w=110; h=110 },
    [pscustomobject]@{ file="$($pal.id)-shop.png"; x=350; y=$y+220; w=110; h=110 },
    [pscustomobject]@{ file="$($pal.id)-settings.png"; x=490; y=$y+220; w=110; h=110 },
    [pscustomobject]@{ file="$($pal.id)-hint.png"; x=630; y=$y+220; w=110; h=110 },
    [pscustomobject]@{ file="$($pal.id)-coin-layer.png"; x=800; y=$y+220; w=110; h=110 },
    [pscustomobject]@{ file="$($pal.id)-coin-hint.png"; x=940; y=$y+220; w=110; h=110 },
    [pscustomobject]@{ file="$($pal.id)-button-hint.png"; x=1100; y=$y+205; w=430; h=160 }
  )
  foreach ($item in $items) {
    $img = [System.Drawing.Image]::FromFile((Join-Path $outDir $item.file))
    $g.DrawImage($img, [int]$item.x, [int]$item.y, [int]$item.w, [int]$item.h)
    $img.Dispose()
  }
  $g.DrawString("Header / 2x / Continue / Home / Levels / Store / Settings / Hint / Coins / Hint Button", $smallFont, $light, 70, $y+380)
}

$titleFont.Dispose(); $labelFont.Dispose(); $smallFont.Dispose(); $dark.Dispose(); $light.Dispose()
Save $sheet "asset-options-contact-sheet.png"
