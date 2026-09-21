Add-Type -AssemblyName System.Drawing

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$outDir = Join-Path $root "assets\ui-shape-options"
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

function Save-Art($art, [string]$name) {
  $path = Join-Path $outDir $name
  $art.Graphics.Dispose()
  $art.Bitmap.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $art.Bitmap.Dispose()
}

function Round-Path([float]$x, [float]$y, [float]$w, [float]$h, [float]$r) {
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
  $p = Round-Path $x $y $w $h $r
  $g.FillPath($brush, $p)
  if ($pen -ne $null) { $g.DrawPath($pen, $p) }
  $p.Dispose()
}

function Fill-GradRound($g, [float]$x, [float]$y, [float]$w, [float]$h, [float]$r, [string]$top, [string]$bottom, [string]$stroke = $null) {
  $rect = New-Object System.Drawing.RectangleF $x, $y, $w, $h
  $b = New-Object System.Drawing.Drawing2D.LinearGradientBrush $rect, (C $top), (C $bottom), 90
  $p = if ($stroke) { New-Object System.Drawing.Pen (C $stroke), 4 } else { $null }
  Fill-Round $g $x $y $w $h $r $b $p
  $b.Dispose()
  if ($p) { $p.Dispose() }
}

function Fill-Polygon($g, $points, [string]$fill, [string]$stroke = $null, [int]$strokeWidth = 4) {
  $b = New-Object System.Drawing.SolidBrush (C $fill)
  $g.FillPolygon($b, $points)
  $b.Dispose()
  if ($stroke) {
    $p = New-Object System.Drawing.Pen (C $stroke), $strokeWidth
    $g.DrawPolygon($p, $points)
    $p.Dispose()
  }
}

function Shadow-Round($g, [float]$x, [float]$y, [float]$w, [float]$h, [float]$r) {
  for ($i = 9; $i -ge 1; $i--) {
    $b = New-Object System.Drawing.SolidBrush (C "101827" ([int](7 + $i * 5)))
    Fill-Round $g ($x - $i) ($y + $i) ($w + $i * 2) ($h + $i * 2) ($r + $i) $b
    $b.Dispose()
  }
}

function Shadow-Poly($g, $points) {
  for ($i = 8; $i -ge 1; $i--) {
    $shifted = @()
    foreach ($pt in $points) { $shifted += New-Object System.Drawing.PointF ($pt.X), ($pt.Y + $i) }
    Fill-Polygon $g $shifted "101827" $null 1
  }
}

function Coin($g, [float]$cx, [float]$cy, [float]$r, [string]$type) {
  $shadow = New-Object System.Drawing.SolidBrush (C "101827" 38)
  $g.FillEllipse($shadow, $cx-$r+5, $cy-$r+8, $r*2, $r*2)
  $shadow.Dispose()
  $rect = New-Object System.Drawing.RectangleF ($cx-$r), ($cy-$r), ($r*2), ($r*2)
  $b = New-Object System.Drawing.Drawing2D.LinearGradientBrush $rect, (C "fff3a5"), (C "f0a11f"), 90
  $p = New-Object System.Drawing.Pen (C "d98710"), 5
  $g.FillEllipse($b, $cx-$r, $cy-$r, $r*2, $r*2)
  $g.DrawEllipse($p, $cx-$r, $cy-$r, $r*2, $r*2)
  $b.Dispose(); $p.Dispose()
  $ring = New-Object System.Drawing.Pen (C "ffffff" 170), 4
  $g.DrawEllipse($ring, $cx-$r+11, $cy-$r+11, ($r-11)*2, ($r-11)*2)
  $ring.Dispose()
  if ($type -eq "layer") {
    $blue = New-Object System.Drawing.SolidBrush (C "4dbbff")
    $teal = New-Object System.Drawing.SolidBrush (C "39d8c6")
    Fill-Round $g ($cx-28) ($cy-15) 56 16 7 $blue
    Fill-Round $g ($cx-28) ($cy+5) 56 16 7 $teal
    $blue.Dispose(); $teal.Dispose()
  } elseif ($type -eq "hint") {
    $bulb = New-Object System.Drawing.SolidBrush (C "fff1a6")
    $base = New-Object System.Drawing.SolidBrush (C "39d8c6")
    $g.FillEllipse($bulb, $cx-18, $cy-24, 36, 39)
    Fill-Round $g ($cx-13) ($cy+9) 26 15 5 $base
    $bulb.Dispose(); $base.Dispose()
  }
}

function Draw-Glyph($g, [string]$glyph, [float]$x, [float]$y, [float]$s) {
  $cream = New-Object System.Drawing.SolidBrush (C "fff4df")
  $teal = New-Object System.Drawing.SolidBrush (C "39d8c6")
  $blue = New-Object System.Drawing.SolidBrush (C "4dbbff")
  $gold = New-Object System.Drawing.SolidBrush (C "ffd14a")
  if ($glyph -eq "home") {
    Fill-Polygon $g @((New-Object System.Drawing.PointF ($x+$s*0.50), ($y+$s*0.08)), (New-Object System.Drawing.PointF ($x+$s*0.12), ($y+$s*0.44)), (New-Object System.Drawing.PointF ($x+$s*0.26), ($y+$s*0.58)), (New-Object System.Drawing.PointF ($x+$s*0.50), ($y+$s*0.35)), (New-Object System.Drawing.PointF ($x+$s*0.74), ($y+$s*0.58)), (New-Object System.Drawing.PointF ($x+$s*0.88), ($y+$s*0.44))) "4dbbff"
    Fill-Round $g ($x+$s*0.25) ($y+$s*0.50) ($s*0.50) ($s*0.40) ($s*0.08) $cream
    Fill-Round $g ($x+$s*0.44) ($y+$s*0.67) ($s*0.13) ($s*0.23) ($s*0.04) $gold
  } elseif ($glyph -eq "levels") {
    Fill-Round $g ($x+$s*0.20) ($y+$s*0.18) ($s*0.25) ($s*0.25) ($s*0.06) $teal
    Fill-Round $g ($x+$s*0.55) ($y+$s*0.18) ($s*0.25) ($s*0.25) ($s*0.06) $blue
    Fill-Round $g ($x+$s*0.20) ($y+$s*0.55) ($s*0.25) ($s*0.25) ($s*0.06) $gold
    Fill-Round $g ($x+$s*0.55) ($y+$s*0.55) ($s*0.25) ($s*0.25) ($s*0.06) $teal
  } elseif ($glyph -eq "shop") {
    Fill-Round $g ($x+$s*0.20) ($y+$s*0.34) ($s*0.60) ($s*0.50) ($s*0.12) $cream
    $pen = New-Object System.Drawing.Pen (C "39d8c6"), ($s*0.06)
    $g.DrawArc($pen, $x+$s*0.35, $y+$s*0.14, $s*0.30, $s*0.28, 190, 160)
    $pen.Dispose()
    Coin $g ($x+$s*0.70) ($y+$s*0.72) ($s*0.13) "layer"
  } elseif ($glyph -eq "settings") {
    for ($i=0; $i -lt 8; $i++) {
      $g.TranslateTransform($x+$s*0.5, $y+$s*0.5); $g.RotateTransform($i*45)
      Fill-Round $g (-$s*0.06) (-$s*0.35) ($s*0.12) ($s*0.19) ($s*0.03) $cream
      $g.ResetTransform()
    }
    $g.FillEllipse($cream, $x+$s*0.23, $y+$s*0.23, $s*0.54, $s*0.54)
    $hole = New-Object System.Drawing.SolidBrush (C "0b1a2d")
    $g.FillEllipse($hole, $x+$s*0.38, $y+$s*0.38, $s*0.24, $s*0.24)
    $hole.Dispose()
  } elseif ($glyph -eq "hint") {
    $g.FillEllipse($gold, $x+$s*0.25, $y+$s*0.12, $s*0.50, $s*0.56)
    Fill-Round $g ($x+$s*0.37) ($y+$s*0.66) ($s*0.26) ($s*0.10) ($s*0.04) $teal
    Fill-Round $g ($x+$s*0.40) ($y+$s*0.79) ($s*0.20) ($s*0.08) ($s*0.035) $teal
  }
  $cream.Dispose(); $teal.Dispose(); $blue.Dispose(); $gold.Dispose()
}

function Make-Icon([string]$prefix, [string]$glyph, [string]$shape) {
  $art = New-Art 256 256
  $g = $art.Graphics
  if ($shape -eq "ribbon") {
    Shadow-Round $g 34 30 188 188 38
    Fill-GradRound $g 34 24 188 188 36 "102943" "071a2f" "37d8c2"
  } elseif ($shape -eq "gem") {
    $pts = @((New-Object System.Drawing.PointF 128,20), (New-Object System.Drawing.PointF 216,70), (New-Object System.Drawing.PointF 216,186), (New-Object System.Drawing.PointF 128,236), (New-Object System.Drawing.PointF 40,186), (New-Object System.Drawing.PointF 40,70))
    Shadow-Poly $g $pts
    Fill-Polygon $g $pts "180c32" "9b71ff" 5
    Fill-Polygon $g @((New-Object System.Drawing.PointF 128,30), (New-Object System.Drawing.PointF 196,76), (New-Object System.Drawing.PointF 128,106), (New-Object System.Drawing.PointF 60,76)) "3c1b74" $null 1
  } else {
    Shadow-Round $g 30 36 196 174 30
    Fill-GradRound $g 30 30 196 174 28 "122f44" "08182b" "ff735f"
    $tab = New-Object System.Drawing.SolidBrush (C "ffd14a")
    Fill-Round $g 78 18 100 30 10 $tab
    $tab.Dispose()
  }
  Draw-Glyph $g $glyph 70 62 116
  Save-Art $art "$prefix-$glyph.png"
}

function Make-Header([string]$prefix, [string]$shape) {
  $art = New-Art 560 200
  $g = $art.Graphics
  if ($shape -eq "ribbon") {
    Fill-Polygon $g @((New-Object System.Drawing.PointF 55,78), (New-Object System.Drawing.PointF 128,58), (New-Object System.Drawing.PointF 128,122), (New-Object System.Drawing.PointF 55,142), (New-Object System.Drawing.PointF 78,110)) "20b997" "18a48d" 4
    Fill-Polygon $g @((New-Object System.Drawing.PointF 505,78), (New-Object System.Drawing.PointF 432,58), (New-Object System.Drawing.PointF 432,122), (New-Object System.Drawing.PointF 505,142), (New-Object System.Drawing.PointF 482,110)) "20b997" "18a48d" 4
    Shadow-Round $g 120 48 320 82 22
    Fill-GradRound $g 120 42 320 82 20 "38e0c0" "18b997" "20a58f"
    $b = New-Object System.Drawing.SolidBrush (C "ffffff" 58)
    Fill-Round $g 158 58 210 13 7 $b
    $b.Dispose()
  } elseif ($shape -eq "gem") {
    $pts = @((New-Object System.Drawing.PointF 150,42), (New-Object System.Drawing.PointF 410,42), (New-Object System.Drawing.PointF 468,84), (New-Object System.Drawing.PointF 430,132), (New-Object System.Drawing.PointF 130,132), (New-Object System.Drawing.PointF 92,84))
    Shadow-Poly $g $pts
    Fill-Polygon $g $pts "24104a" "9b71ff" 5
    Fill-Polygon $g @((New-Object System.Drawing.PointF 156,50), (New-Object System.Drawing.PointF 404,50), (New-Object System.Drawing.PointF 350,80), (New-Object System.Drawing.PointF 210,80)) "5b31bd" $null 1
    Fill-Polygon $g @((New-Object System.Drawing.PointF 230,132), (New-Object System.Drawing.PointF 330,132), (New-Object System.Drawing.PointF 360,158), (New-Object System.Drawing.PointF 200,158)) "ffd14a" "e19220" 3
  } else {
    Shadow-Round $g 132 48 296 94 22
    Fill-GradRound $g 132 42 296 94 18 "ff806a" "eb5146" "ff725e"
    Fill-Round $g 166 120 228 26 9 (New-Object System.Drawing.SolidBrush (C "ffd14a"))
    $b = New-Object System.Drawing.SolidBrush (C "ffffff" 55)
    Fill-Round $g 180 60 200 13 7 $b
    $b.Dispose()
    $medal = New-Object System.Drawing.SolidBrush (C "ffd14a")
    $g.FillEllipse($medal, 246, 22, 68, 68)
    $medal.Dispose()
  }
  Save-Art $art "$prefix-reward-header.png"
}

function Make-Button([string]$prefix, [string]$name, [string]$shape, [bool]$primary) {
  $art = New-Art 1200 230
  $g = $art.Graphics
  if ($shape -eq "ribbon") {
    Shadow-Round $g 28 40 1144 138 24
    $top = if ($primary) { "ffdf57" } else { "fff8ef" }
    $bottom = if ($primary) { "f0a31d" } else { "f3e0cf" }
    $stroke = if ($primary) { "ff8f36" } else { "ff9d8a" }
    Fill-GradRound $g 28 30 1144 138 22 $top $bottom $stroke
    Fill-Round $g 54 48 1090 42 16 (New-Object System.Drawing.SolidBrush (C "ffffff" 52))
  } elseif ($shape -eq "gem") {
    $pts = @((New-Object System.Drawing.PointF 70,30), (New-Object System.Drawing.PointF 1130,30), (New-Object System.Drawing.PointF 1180,92), (New-Object System.Drawing.PointF 1130,166), (New-Object System.Drawing.PointF 70,166), (New-Object System.Drawing.PointF 20,92))
    Shadow-Poly $g $pts
    $fill = if ($primary) { "f1a826" } else { "eee0ff" }
    $highlight = if ($primary) { "ffd96a" } else { "fbf7ff" }
    Fill-Polygon $g $pts $fill "9b71ff" 5
    Fill-Polygon $g @((New-Object System.Drawing.PointF 92,44), (New-Object System.Drawing.PointF 1108,44), (New-Object System.Drawing.PointF 1068,76), (New-Object System.Drawing.PointF 132,76)) $highlight $null 1
  } else {
    Shadow-Round $g 28 40 1144 138 18
    $top = if ($primary) { "ffde5a" } else { "fff5ea" }
    $bottom = if ($primary) { "ff725e" } else { "ffe0d6" }
    $stroke = "ff735f"
    Fill-GradRound $g 28 30 1144 138 16 $top $bottom $stroke
    Fill-Round $g 54 48 1090 36 12 (New-Object System.Drawing.SolidBrush (C "ffffff" 50))
    $notchFill = if ($primary) { "ff8a6d" } else { "ffd1c4" }
    Fill-Polygon $g @((New-Object System.Drawing.PointF 1110,30), (New-Object System.Drawing.PointF 1172,92), (New-Object System.Drawing.PointF 1110,168)) $notchFill $null 1
  }
  Save-Art $art "$prefix-$name.png"
}

function Make-HintButton([string]$prefix, [string]$shape) {
  $art = New-Art 660 250
  $g = $art.Graphics
  if ($shape -eq "gem") {
    $pts = @((New-Object System.Drawing.PointF 52,38), (New-Object System.Drawing.PointF 608,38), (New-Object System.Drawing.PointF 642,110), (New-Object System.Drawing.PointF 608,182), (New-Object System.Drawing.PointF 52,182), (New-Object System.Drawing.PointF 18,110))
    Shadow-Poly $g $pts
    Fill-Polygon $g $pts "1b1034" "9b71ff" 5
  } elseif ($shape -eq "ticket") {
    Shadow-Round $g 28 42 604 142 20
    Fill-GradRound $g 28 34 604 142 18 "122f44" "08182b" "ff735f"
    Fill-Polygon $g @((New-Object System.Drawing.PointF 572,34), (New-Object System.Drawing.PointF 632,105), (New-Object System.Drawing.PointF 572,176)) "ff735f" $null 1
  } else {
    Shadow-Round $g 28 42 604 142 28
    Fill-GradRound $g 28 34 604 142 26 "102943" "071a2f" "37d8c2"
  }
  Draw-Glyph $g "hint" 228 54 98
  Coin $g 386 104 42 "hint"
  Save-Art $art "$prefix-button-hint.png"
}

function Build-Set([string]$prefix, [string]$shape) {
  foreach ($glyph in @("home", "levels", "shop", "settings", "hint")) { Make-Icon $prefix $glyph $shape }
  $layer = New-Art 256 256; Coin $layer.Graphics 128 128 76 "layer"; Save-Art $layer "$prefix-coin-layer.png"
  $hint = New-Art 256 256; Coin $hint.Graphics 128 128 76 "hint"; Save-Art $hint "$prefix-coin-hint.png"
  Make-Header $prefix $shape
  Make-Button $prefix "reward-double-bg" $shape $true
  Make-Button $prefix "reward-continue-bg" $shape $false
  Make-HintButton $prefix $shape
}

Build-Set "a-ribbon" "ribbon"
Build-Set "b-crystal" "gem"
Build-Set "c-ticket" "ticket"

$sheet = New-Art 1800 1620
$g = $sheet.Graphics
$bg = New-Object System.Drawing.Drawing2D.LinearGradientBrush (New-Object System.Drawing.RectangleF 0,0,1800,1620), (C "fff3d7"), (C "0d1b2d"), 90
$g.FillRectangle($bg, 0, 0, 1800, 1620)
$bg.Dispose()
$titleFont = New-Object System.Drawing.Font "Arial", 54, ([System.Drawing.FontStyle]::Bold), ([System.Drawing.GraphicsUnit]::Pixel)
$labelFont = New-Object System.Drawing.Font "Arial", 30, ([System.Drawing.FontStyle]::Bold), ([System.Drawing.GraphicsUnit]::Pixel)
$smallFont = New-Object System.Drawing.Font "Arial", 21, ([System.Drawing.FontStyle]::Bold), ([System.Drawing.GraphicsUnit]::Pixel)
$dark = New-Object System.Drawing.SolidBrush (C "101827")
$light = New-Object System.Drawing.SolidBrush (C "fffaf0")
$g.DrawString("Puzzle Area Visual Asset Concepts", $titleFont, $dark, 60, 48)

$rows = @(
  @{ prefix="a-ribbon"; label="A - Ribbon Reward"; note="soft ribbon badge, classic reward buttons" },
  @{ prefix="b-crystal"; label="B - Crystal Panel"; note="hexagon icons, sharp premium sci-fi panels" },
  @{ prefix="c-ticket"; label="C - Arcade Ticket"; note="ticket/button shapes, energetic game-store look" }
)

for ($r = 0; $r -lt $rows.Count; $r++) {
  $row = $rows[$r]
  $y = 150 + $r * 470
  $g.DrawString($row.label, $labelFont, $dark, 66, $y)
  $g.DrawString($row.note, $smallFont, $dark, 420, $y + 6)
  $items = @(
    [pscustomobject]@{ file="$($row.prefix)-reward-header.png"; x=70; y=$y+72; w=270; h=96 },
    [pscustomobject]@{ file="$($row.prefix)-reward-double-bg.png"; x=380; y=$y+62; w=560; h=108 },
    [pscustomobject]@{ file="$($row.prefix)-reward-continue-bg.png"; x=980; y=$y+72; w=500; h=84 },
    [pscustomobject]@{ file="$($row.prefix)-home.png"; x=70; y=$y+220; w=110; h=110 },
    [pscustomobject]@{ file="$($row.prefix)-levels.png"; x=205; y=$y+220; w=110; h=110 },
    [pscustomobject]@{ file="$($row.prefix)-shop.png"; x=340; y=$y+220; w=110; h=110 },
    [pscustomobject]@{ file="$($row.prefix)-settings.png"; x=475; y=$y+220; w=110; h=110 },
    [pscustomobject]@{ file="$($row.prefix)-hint.png"; x=610; y=$y+220; w=110; h=110 },
    [pscustomobject]@{ file="$($row.prefix)-coin-layer.png"; x=770; y=$y+220; w=110; h=110 },
    [pscustomobject]@{ file="$($row.prefix)-coin-hint.png"; x=905; y=$y+220; w=110; h=110 },
    [pscustomobject]@{ file="$($row.prefix)-button-hint.png"; x=1070; y=$y+202; w=440; h=166 }
  )
  foreach ($item in $items) {
    $img = [System.Drawing.Image]::FromFile((Join-Path $outDir $item.file))
    $g.DrawImage($img, [int]$item.x, [int]$item.y, [int]$item.w, [int]$item.h)
    $img.Dispose()
  }
  $g.DrawString("Header  |  2x  |  Continue  |  Home  |  Levels  |  Store  |  Settings  |  Hint  |  Coins  |  Hint Button", $smallFont, $light, 70, $y+386)
}

$titleFont.Dispose(); $labelFont.Dispose(); $smallFont.Dispose(); $dark.Dispose(); $light.Dispose()
Save-Art $sheet "visual-asset-concepts.png"
